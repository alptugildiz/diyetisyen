# Danışan/Randevu Veri Zenginleştirme + İstatistik Dashboard Genişletmesi

**Tarih:** 2026-07-24
**Durum:** Onaylandı, plana geçilecek

## Bağlam

Klinik admin panelinde diyetisyenin danışanlarını ve randevularını daha sistematik takip
edebilmesi hedefleniyor: randevu kaynağı, iptal/gelmeme nedenleri, ilk görüşme/kontrol ayrımı
ve bunların üzerine kurulu bir aylık performans/devamlılık dashboard'u.

Bu, kullanıcının paylaştığı daha büyük bir vizyonun (finans/gider modülü, hedef belirleme
sistemi, talep/lead hunisi dahil) ilk iki parçasıdır — **B: veri zenginleştirme** ve
**C: dashboard/analitik**. Diğer parçalar (gelir/gider kalemleri, hedef sistemi, talep takibi)
kapsam dışıdır, ayrı spec'lerle ele alınacak (bkz. Kapsam Dışı).

Mevcut kod taraması (bu spec'e temel oluşturdu):
- `backend/src/models/Booking.js` — takvim/randevu kaydı, `status` enum'u zaten var
  (`planlandi`/`geldi`/`gelmedi`/`iptal`), kaynak/neden/ziyaret tipi alanı yok.
- `backend/src/models/Patient.js` — sadece ad/soyad/telefon/not, kaynak veya süreç durumu yok.
- `backend/src/models/Appointment.js` — "randevu" adında ama aslında gelir kaydı (ad, soyad,
  telefon, tutar, tarih, not); istatistik sayfasının veri kaynağı budur.
- `backend/src/routes/admin/stats.js` — `GET /api/admin/stats?from=&to=`, sadece
  `Appointment` üzerinde aggregate çalıştırıyor (gelir, aylık trend, haftalık dağılım, yeni/
  tekrar eden hasta, top 6 hasta).
- `frontend/src/app/admin/(panel)/istatistik/page.tsx` — KPI kartları + recharts grafikleri.
- `frontend/src/components/admin/BookingForm.tsx` — randevu oluşturma/düzenleme formu.
- `backend/src/routes/admin/{patients,bookings}.js` — zod ile validasyon, standart
  create/update/delete deseni.

## Hedefler

- Danışan kaydına **kaynak** (nereden geldi) ve **süreç durumu** (aktif/tamamladı/bıraktı) bilgisi eklemek.
- Randevu kaydına **iptal/gelmeme nedeni** ve otomatik **ziyaret tipi** (ilk görüşme/kontrol) eklemek.
- İstatistik sayfasına bu yeni verilere dayanan dört yeni bölüm eklemek: aylık özet, devamlılık
  oranı, kaynak dağılımı, iptal/gelmeme analizi.
- Tüm yeni metrikleri **nötr, bilgilendirici bir dille** sunmak — performans yargısı değil,
  farkındalık aracı olarak.

## Kapsam Dışı (sonraki fazlar)

- **Finans modülü (A):** Gider takibi (bağkur/vergi/muhasebe/stopaj gibi sabit kategoriler) ve
  kullanıcı tanımlı gelir kalemleri. Ayrı bir spec.
- **Talep/lead hunisi:** Randevuya dönüşmemiş talep kayıtları (18 talep → 14 randevu → ... gibi
  huni analizi). Kullanıcı onayıyla bu fazdan çıkarıldı; sadece "randevu → görüşme → devam eden"
  huni parçası bu spec'te değil, mevcut aylık özet/devamlılık metrikleriyle zaten karşılanıyor.
- **Hedef belirleme sistemi (D):** Aylık hedef koyup gerçekleşenle karşılaştırma. Ayrı bir spec;
  bu spec'teki "yargılamayan dil" prensipleri o modülde de geçerli olacak.

## Veri Modeli Değişiklikleri

### `Patient` (backend/src/models/Patient.js)

```js
source: {
  type: String,
  enum: ["instagram", "google", "dis_hekimi", "danisan_tavsiyesi", "web_sitesi", "klinik_ici", "diger"],
  default: null,
},
processStatus: {
  type: String,
  enum: ["aktif", "tamamladi", "birakti"],
  default: "aktif",
},
```

Frontend etiketleri (dropdown/rozet): Instagram, Google, Diş hekimi yönlendirmesi, Mevcut
danışan tavsiyesi, Web sitesi, Klinik içi yönlendirme, Diğer / Aktif, Süreci Tamamladı, Ara
Verdi-Bıraktı. İkisi de opsiyonel — mevcut kayıtlarda `source` boş kalabilir, `processStatus`
varsayılan `aktif` olur.

### `Booking` (backend/src/models/Booking.js)

```js
visitType: {
  type: String,
  enum: ["ilk_gorusme", "kontrol"],
  default: null,
},
cancelReason: {
  type: String,
  enum: ["tarih_uygun_degil", "ucret", "unuttu", "saglik_problemi", "iletisim_kurulamadi", "baska_hizmet", "belirtilmedi"],
  default: null,
},
```

- `visitType`: **sunucu tarafında otomatik hesaplanır**, client'tan kabul edilmez. Booking
  oluşturulurken `Booking.countDocuments({ patient: data.patient })` ile o hastanın önceki
  booking sayısına bakılır: 0 ise `ilk_gorusme`, aksi halde `kontrol`. Düzenlenemez (booking
  update'inde bu alan değiştirilmez).
- `cancelReason`: sadece `status` `iptal` veya `gelmedi` olduğunda anlamlıdır. Zod
  `.superRefine` ile şartlı zorunluluk: status bu iki değerden biriyse `cancelReason` zorunlu,
  aksi halde `null`'a zorlanır (status `planlandi`/`geldi`'ye geri dönerse `cancelReason`
  temizlenir).

### Geriye dönük veri (backfill)

Mevcut `Booking` kayıtlarında `visitType` boş kalacak. Migration betiği (plan aşamasında ele
alınacak): her hasta için mevcut booking'leri `date` sırasına göre sıralayıp ilkine
`ilk_gorusme`, kalanlara `kontrol` atar. Mevcut `Patient` kayıtlarında `source` boş, `processStatus`
varsayılan `aktif` kalır — geriye dönük tahmin yapılmaz.

## Backend API Değişiklikleri

### Validasyon (`backend/src/routes/admin/patients.js`, `bookings.js`)

- `patientSchema`'ya `source` ve `processStatus` opsiyonel alan olarak eklenir (mevcut zod
  deseniyle aynı stil).
- `bookingSchema`'ya `cancelReason` eklenir, `superRefine` ile status'e bağlı zorunluluk
  kontrolü yapılır. `visitType` şemaya eklenmez (client input değil); POST handler'ında
  `Booking.create` çağrısından önce hesaplanıp `data`'ya eklenir.

### `GET /api/admin/stats?from=&to=` genişletmesi (`backend/src/routes/admin/stats.js`)

Aynı endpoint'e yeni alanlar eklenir (mevcut `revenue`/`count` bazlı `summarize()` deseni
`Booking` koleksiyonu için de tekrarlanır):

- **`monthlySummary`**: `totalBookings`, `completed` (status=geldi), `cancelled` (status=iptal),
  `noShow` (status=gelmedi), `newPatients` (visitType=ilk_gorusme sayısı), `followUps`
  (visitType=kontrol sayısı), `revenue` (mevcut `Appointment` toplamı) — her biri için mevcut
  `pct()` yardımcı fonksiyonuyla bir önceki eşit uzunluktaki döneme göre % değişim.
- **`retention`**: `firstToSecondRate` (dönemde ilk görüşmesi olan hastaların kaçının en az bir
  `kontrol` booking'i de var — iki aşamalı aggregate/`$lookup`), `avgFollowUpCount` (hasta
  başına ortalama `geldi` sayısı), `avgFollowUpSpanDays` (hasta başına ilk-son booking arası
  gün farkı ortalaması), `processStatusBreakdown` (Patient.processStatus'a göre sayım).
- **`sourceBreakdown`**: dönemde ilk booking'i olan hastaların `source` alanına göre grup
  sayımı (`{source, count}[]`).
- **`cancelReasonBreakdown`**: dönemdeki `iptal`/`gelmedi` booking'lerin `cancelReason`'a göre
  grup sayımı.

Tüm yeni aggregate'ler mevcut `buildMatch(req.query)` ile aynı `from`/`to` tarih aralığını
kullanır; `Promise.all` içindeki mevcut sorgu listesine eklenir.

## Frontend Değişiklikleri

- **Danışan formu** (`frontend/src/app/admin/(panel)/hastalar/page.tsx`, `[id]/page.tsx`):
  `source` ve `processStatus` için iki dropdown eklenir; liste/detay sayfasında rozet olarak
  gösterilir.
- **Randevu formu** (`frontend/src/components/admin/BookingForm.tsx`): `status` `iptal` veya
  `gelmedi` seçildiğinde `cancelReason` dropdown'u koşullu olarak açılır ve zorunlu hale gelir.
  `visitType` düzenlenemez; booking detayında salt-okunur rozet olarak gösterilir.
- **İstatistik sayfası** (`frontend/src/app/admin/(panel)/istatistik/page.tsx`): mevcut KPI
  kart/grafik bileşenleri yeniden kullanılarak dört yeni bölüm eklenir:
  - **Aylık Özet** — genişletilmiş KPI kart grid'i (Toplam Randevu, Gerçekleşen, İptal, Gelmedi,
    Yeni Danışan, Kontrol Randevusu, Toplam Gelir), her biri öncekine göre % değişim ok
    göstergesiyle.
  - **Devamlılık** — 3 KPI kart (İlk→İkinci Geçiş Oranı, Ort. Görüşme Sayısı, Ort. Takip Süresi)
    + Aktif/Tamamladı/Bıraktı dağılımı için pasta grafik.
  - **Kaynak Dağılımı** — bar/pasta grafik.
  - **İptal & Gelmeme Analizi** — nedene göre bar grafik.
  - Otomatik oluşturulan cümle özeti **yok** — sadece sayısal kart/grafik.

## Ton ve Dil Prensipleri

Amaç farkındalık ve sistematik takip; performans yargılama değil. Somut kurallar:

- **Nötr renk paleti**: iptal/gelmeme oranları veya düşen trendler için kırmızı/alarm rengi
  kullanılmaz; tüm yeni KPI kartları mevcut sayfadaki nötr renk paletiyle tutarlı olur. Değişim
  sadece yön oku (↑/↓) ile gösterilir, "iyi/kötü" çağrışımı yapılmaz.
- **Tanımlayıcı etiketler**: "Devamlılık Oranı", "İptal Nedenleri" gibi nötr başlıklar;
  "Başarı Oranı", "Performans Puanı" gibi değerlendirici ifadeler kullanılmaz.
- **Bilgilendirici karşılaştırmalar**: "geçen aya göre %12 arttı" gibi olgusal ifade; bir
  eşik/hedefe göre "yetersiz kaldı" türü yargı cümleleri yok.
- **Toplu görünüm**: iptal/gelmeme nedenleri tekil danışan bazında değil, toplu/istatistiksel
  görünümde sunulur; belirli bir danışanı "sorunlu" gibi işaretleyen bir görünüm olmaz.

## Riskler / Açık Noktalar

- Geriye dönük `visitType` backfill'i, hastanın gerçek ilk görüşme tarihini değil sistemdeki
  ilk *kayıtlı* booking'i baz alır — sisteme geç girilmiş eski hastalar için yanlış
  sınıflandırma riski var. Kabul edilebilir, plan aşamasında not düşülecek.
- `firstToSecondRate` hesaplaması dönem sınırına yakın (ay sonunda ilk görüşmesi olan hastanın
  ikinci randevusu henüz gelecek ayda olabilir) → oran hafif düşük çıkabilir. Bu bilinen bir
  sınırlama olarak kabul edilir, ekstra "bekleyen" kategorisi eklenmez (basitlik için).
