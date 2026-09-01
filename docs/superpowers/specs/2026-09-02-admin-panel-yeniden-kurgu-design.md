# Admin Panel Yeniden Kurgusu — Veri Modeli, Ekranlar ve Bug Düzeltmeleri

**Tarih:** 2026-09-02
**Durum:** Onay bekliyor
**Kapsam:** Spec 1 / 2 (Spec 2 = public site SEO, ayrı doküman)

## Bağlam

Admin panel bugün 8 ekrandan oluşuyor ve temel işlevleri karşılıyor: danışan CRUD, takvim, gelir/gider kaydı, istatistik, blog, SSS. Ancak panel büyürken iki yapısal sorun birikti.

**Birincisi, para iki ayrı yerde yaşıyor.** `Booking` (takvimdeki randevu) ve `Appointment` (gelir kaydı) ayrı koleksiyonlar. Aralarındaki tek bağ `bookings.js` PUT içindeki bir upsert. Bu bağ tek yönlü olduğu için tutarsızlık üretiyor: randevu silinince gelir kaydı kalıyor, "geldi" durumu geri alınınca gelir silinmiyor, `/admin/randevular` üzerinden elle girilen gelir takvimde hiç görünmüyor. Yani aynı olay iki farklı sayıyla raporlanabiliyor.

**İkincisi, panel mobilde kullanılamıyor.** Sidebar `w-72` sabit genişlikte, drawer yok, aktif sayfa vurgusu yok. Diyetisyen paneli hem masaüstünde (gün planlama/kapatma) hem telefonda (seans arası hızlı giriş) kullanıyor; ikinci senaryo şu anda mümkün değil.

Bunların yanında paket satışı gibi gerçek bir ihtiyaç modelde hiç karşılanmıyor, siteden gelen randevu talepleri panele düşmüyor (yalnızca Telegram'a gidiyor), ve tarih hesaplamalarında saat dilimi kaynaklı bir hesap hatası var.

**Kritik kolaylık:** Canlıda gerçek veri yok. Model migration'sız, doğrudan doğru şekilde kurulabilir.

## Hedefler

1. **Tek gelir defteri, tek gider defteri.** Gelir yalnızca `Payment`, gider yalnızca `Expense` üzerinden hesaplansın. İki kaynağı birleştiren hiçbir sorgu kalmasın.
2. **Paket satışı ve taksitli tahsilat** desteklensin; kasa (nakit esaslı) muhasebe mantığıyla.
3. **Alacak takibi:** "geldi ama tahsil edilmedi" ve "paketin kalan borcu" panelde görünsün.
4. **Mobilde çalışan panel:** günlük işlem akışı telefondan tek elle yapılabilsin.
5. **Günlük ritmi olan bir ana ekran:** sabah aç, akşam kapat.
6. **Siteden gelen randevu talepleri** panelde toplansın, tek tıkla danışana dönüşsün.
7. Aşağıda listelenen bug'lar kapansın; çoğu model değişikliğiyle yapısal olarak ortadan kalkacak.

## Kapsam Dışı

Bunlar bilinçli olarak dışarıda bırakıldı:

- **Public site SEO** — sayfa bazlı metadata, blog `generateMetadata`, Lüleburgaz'a özel landing sayfası, Article/FAQPage schema. Spec 2'nin konusu.
- **Blog SEO alanları** (meta başlık, meta açıklama, düzenlenebilir slug, görsel alt metni) — Spec 2 ile birlikte, çünkü public tarafla beraber tasarlanmaları gerekiyor.
- **Site Ayarları ekranı** — Footer iletişim bilgileri, Hakkında metni, Hizmetler listesi hâlâ kodda sabit kalacak.
- **Çoklu kullanıcı / rol yönetimi** — tek admin varsayımı sürüyor.
- **Süre bazlı paketler** ("3 aylık takip") — yalnızca seans adedine dayalı paketler.
- **Soft delete / geri alma** — silme kalıcı olmaya devam ediyor, yalnızca onay diyaloğu iyileşiyor.

## Veri Modeli

### Genel prensip

Booking ile Payment ayrı şeylerdir ve ayrı kalmalıdır:

- **`Booking.fee`** = *tahakkuk*. "Bu seansın ücreti 1.500 ₺."
- **`Payment`** = *tahsilat*. "Bu 1.500 ₺'yi 2 Eylül'de nakit aldım."

Bu ayrım alacak takibini bedavaya getiriyor: **borç = tahakkuk − tahsilat.** Ayrıca kasa mantığı doğal olarak çıkıyor — aylık gelir, o ay tarihli `Payment` kayıtlarının toplamı.

### `Patient` — değişiklik yok

Mevcut alanlar korunuyor: `firstName`, `lastName`, `phone`, `source`, `processStatus`, `note`.

### `Package` — YENİ (paket katalogu)

Diyetisyenin bir kez tanımlayıp satışta seçtiği paket şablonları.

| Alan | Tip | Not |
|---|---|---|
| `name` | String, zorunlu | "8 Seans Kilo Yönetimi" |
| `sessionCount` | Number, min 1 | Paketin içerdiği seans adedi |
| `price` | Number, min 0 | Toplam bedel (₺) |
| `isActive` | Boolean, default `true` | Pasif paketler satışta listelenmez |
| `order` | Number, default 0 | Listeleme sırası |

### `PatientPackage` — YENİ (satılan paket)

| Alan | Tip | Not |
|---|---|---|
| `patient` | ref Patient, zorunlu, index | |
| `package` | ref Package, nullable | Hangi katalogdan satıldı (izlenebilirlik) |
| `name` | String, zorunlu | **Snapshot** |
| `sessionCount` | Number, zorunlu | **Snapshot** |
| `price` | Number, zorunlu | **Snapshot** — toplam bedel |
| `soldAt` | Date, zorunlu, index | Satış tarihi |
| `status` | enum `aktif`/`tamamlandi`/`iptal` | default `aktif` |
| `note` | String | |

**Snapshot neden:** Katalogdaki fiyat sonradan değişirse geçmiş satışlar bozulmamalı. `package` ref'i yalnızca izlenebilirlik için tutulur, hesaplamada kullanılmaz.

**Türetilen değerler — saklanmıyor, hesaplanıyor:**

```
kullanılanSeans = count(Booking { patientPackage: X, status: "geldi" })
kalanSeans      = sessionCount − kullanılanSeans
tahsilEdilen    = sum(Payment { patientPackage: X }.amount)
kalanBorç       = price − tahsilEdilen
```

Sayaç saklamıyoruz çünkü saklanan sayaç er ya da geç gerçekle uyumsuzlaşır (bugünkü `Appointment` sorununun aynısı).

### `Booking` — sadeleşiyor

Mevcut alanlar (`patient`, `date`, `time`, `status`, `visitType`, `cancelReason`, `note`) korunuyor. Eklenenler:

| Alan | Tip | Not |
|---|---|---|
| `fee` | Number, default 0 | Bu seansın ücreti. Yalnızca `status: "geldi"` ise anlamlı. Paketten düşen seanslarda `0`. |
| `patientPackage` | ref PatientPackage, nullable | Doluysa bu seans o paketten düşer, `fee` 0 olur. |

`visitType` alanı kalıyor ama **hesaplanma şekli değişiyor** (aşağıda, Bug #3).

### `Payment` — YENİ (tek gelir defteri)

| Alan | Tip | Not |
|---|---|---|
| `patient` | ref Patient, zorunlu, index | Sorgu kolaylığı için her zaman doldurulur |
| `source` | enum `booking`/`package` | Tahsilatın kaynağı |
| `booking` | ref Booking, nullable | `source: "booking"` ise dolu |
| `patientPackage` | ref PatientPackage, nullable | `source: "package"` ise dolu |
| `amount` | Number, min 0, zorunlu | |
| `method` | enum `nakit`/`kart`/`havale`, zorunlu | `havale` yeni eklendi |
| `date` | Date, zorunlu, index | **Tahsilat tarihi** — kasa mantığının dayanağı |
| `documentNumber` | String, default "" | Belge / fatura no |
| `note` | String, default "" | |

**Değişmez kural:** `source: "booking"` ise `booking` dolu ve `patientPackage` boş; `source: "package"` ise tersi. Zod şemasında `superRefine` ile zorlanır.

**Taksit doğal olarak çıkıyor:** aynı `patientPackage`'a bağlı birden çok `Payment`. Ayrı bir taksit modeli gerekmiyor.

### `AppointmentRequest` — YENİ (siteden gelen talep)

| Alan | Tip | Not |
|---|---|---|
| `name`, `email`, `phone` | String, zorunlu | Public formdan gelen alanlar |
| `status` | enum `yeni`/`donusturuldu`/`yoksayildi` | default `yeni` |
| `patient` | ref Patient, nullable | Dönüştürüldüyse hangi danışan oldu |
| `createdAt` | timestamp | |

### `Expense` — değişiklik yok

`havale` gibi bir ödeme yöntemi alanı **eklenmiyor**; gider tarafı bugünkü haliyle yeterli.

### `Appointment` — SİLİNİYOR

Model dosyası, route'u ve `api.ts` fonksiyonları kaldırılıyor. Canlı veri olmadığı için migration yazılmıyor; `docker compose down -v` ile temiz başlangıç yapılacak. Bunun yerine `backend/src/scripts/seed-demo.js` yazılıp geliştirme için örnek veri üretilecek.

## Backend API

### Yeni route'lar

| Endpoint | Açıklama |
|---|---|
| `GET/POST/PUT/DELETE /api/admin/packages` | Paket katalogu CRUD |
| `GET/POST/PUT/DELETE /api/admin/patient-packages` | Paket satışı. `GET ?patient=` ile filtreli. Yanıt türetilen `kalanSeans`/`kalanBorc` alanlarını içerir. |
| `GET/POST/PUT/DELETE /api/admin/payments` | Tahsilat defteri. `GET ?from=&to=&patient=`. Liste yanıtı `patient` ve kaynak kaydı (`booking` veya `patientPackage`) populate edilmiş gelir — Gelirler tablosu ek çağrı yapmaz. |
| `GET /api/admin/requests` | Randevu talepleri listesi. `?status=` ile filtreli. |
| `POST /api/admin/requests/:id/convert` | Talebi danışana + (opsiyonel) randevuya dönüştürür |
| `PUT /api/admin/requests/:id` | Yalnızca `status` günceller (yoksayma) |
| `GET /api/admin/today` | "Bugün" ekranının tüm verisi tek çağrıda |
| `GET /api/admin/badges` | Sidebar rozetleri: bekleyen talep sayısı. Layout her sayfada çağırır, 60 sn `revalidate`. |

### Değişen route'lar

**`POST /api/admin/bookings/:id/complete`** — yeni, randevuyu tek işlemde sonuçlandırır. Bugünkü `PUT` içindeki `completionPayment` mantığının yerini alır:

```js
// status: "geldi"
{ status: "geldi", fee: 1500, patientPackage: null,
  payment: { amount: 1500, method: "nakit", documentNumber: "" } }  // payment opsiyonel

// paketten düşen seans
{ status: "geldi", patientPackage: "<id>" }   // fee otomatik 0, payment yok

// gelmedi / iptal
{ status: "gelmedi", cancelReason: "unuttu" }
```

`payment` alanı yoksa `Booking.fee` yazılır ama `Payment` oluşmaz → **alacak** olarak görünür. Sonradan tahsil edildiğinde Finans > Gelirler'den veya danışan detayından `Payment` eklenir.

**`DELETE /api/admin/bookings/:id`** — bağlı `Payment` kayıtlarını da siler (Bug #1).

**`DELETE /api/admin/patients/:id`** — `Booking`, `PatientPackage` ve `Payment` kayıtlarını da siler (Bug #1).

**`PUT /api/admin/bookings/:id`** — durum `geldi`den çıkarsa bağlı `Payment` kayıtları silinir ve `fee` sıfırlanır (Bug #2). Kullanıcı bu işlemi onaylamadan yapamaz; API 409 döner, istemci onayla `?force=true` gönderir.

**`POST /api/appointment`** (public) — Telegram bildirimi aynen korunur, **ek olarak** `AppointmentRequest` kaydı oluşturulur. Telegram gönderimi başarısız olsa bile kayıt atılır; kayıt sırası önce DB, sonra Telegram.

**`GET /api/admin/stats`** — gelir tarafı tamamen `Payment` üzerinden yeniden yazılır. Eklenen metrikler: `outstandingReceivables` (toplam alacak), `packageRevenue` / `sessionRevenue` ayrımı. `paymentBreakdown` artık `havale`yi de içerir.

### Silinen route

`/api/admin/appointments` — tüm dosya kaldırılır.

## Ekranlar

### Navigasyon

Kullanım sıklığına göre gruplanmış sidebar:

```
  Bugün                ← yeni ana ekran, /admin
  Takvim               /admin/takvim
  Danışanlar           /admin/hastalar
  Talepler       (3)   /admin/talepler      ← bekleyen sayısı rozet olarak
  ─────────────────
  Finans               /admin/finans        ← sekmeler: Gelirler · Giderler · Paketler
  İstatistik           /admin/istatistik
  ─────────────────
  Blog                 /admin/blog
  SSS                  /admin/sss
```

`/admin/randevular` ve `/admin/giderler` route'ları kaldırılır; `/admin/finans` altına sekme olarak taşınır. Eski URL'lerden yeniye yönlendirme yapılmaz (panel içi, dış bağlantı yok).

Aktif sayfa vurgusu için sidebar client component'e dönüşür (`usePathname`). Oturum bilgisi ve çıkış formu server tarafında kalır.

### "Bugün" — `/admin`

Mevcut dashboard'un yarısı navigasyon kartı; sidebar aynı işi zaten yapıyor. Yerine günü yönetilebilir kılan bir ekran:

```
┌──────────────────────────────────────────────────────┐
│  Bugün · 2 Eylül Salı                                │
│                                                      │
│  [ 5 randevu ]   [ 2 işlenmedi ]   [ 3.000 ₺ ]       │
│                                                      │
│  ── Günün Programı ─────────────────────────────     │
│  09:30  Ayşe Yılmaz     Kontrol    ✓ Geldi · 1.500 ₺ │
│  11:00  Mehmet Kaya     İlk        [ İşle ]          │
│  14:30  Zeynep Ak       Kontrol    [ İşle ]          │
│                                                      │
│  ── Dikkat ─────────────────────────────────────     │
│  • Tahsil edilmemiş: 4.500 ₺ · 3 danışan             │
│  • Paketi bitmek üzere: 2 danışan                    │
│  • Bekleyen talep: 3                                 │
└──────────────────────────────────────────────────────┘
```

"Dikkat" bölümündeki her satır ilgili filtrelenmiş listeye götürür. Ekranın tüm verisi `GET /api/admin/today` ile tek çağrıda gelir.

### "İşle" modalı

Takvim ve Bugün ekranlarındaki üç ayrı butonun (Tamamla / Gelmedi / İptal) yerini alan tek modal:

```
┌─ 14:30  Ayşe Yılmaz ─────────────────┐
│  Ne oldu?                            │
│  ( Geldi ) ( Gelmedi ) ( İptal )     │
│                                      │
│  ── "Geldi" seçilince ────────────── │
│  ○ Paketten düş  → [8 Seans ▾ 3/8]   │
│  ● Tek seans                         │
│      Ücret     [ 1.500 ] ₺           │
│      Ödeme     (Nakit)(Kart)(Havale) │
│      Durum     (•Tahsil edildi)      │
│                (Sonra tahsil edilecek)│
│      Belge No  [ opsiyonel ]         │
│                                      │
│  ── "Gelmedi"/"İptal" seçilince ──   │
│  Neden         [ ▾ ]                 │
└──────────────────────────────────────┘
```

Danışanın aktif paketi varsa "Paketten düş" varsayılan seçili gelir. Mobilde bu modal tam ekran bottom sheet olarak açılır.

### Takvim — `/admin/takvim`

Masaüstünde mevcut ay grid'i korunur. Mobilde ay grid'i okunamayacak kadar dar olduğu için **gün listesi** görünümüne düşer (yatay gün seçici + o günün randevuları). Hızlı durum butonları "İşle" modalıyla değişir.

### Danışanlar — `/admin/hastalar`

Liste ekranı: arama artık backend'e gider (`?q=`, debounce'lu) ve sayfalama eklenir. Bugün üç ayrı ekran tüm danışan listesini indiriyor; bu kalkar.

Detay ekranı sekmeli hale gelir:

```
Ayşe Yılmaz  ·  0(532) 111 22 33                [ Aktif ▾ ]
────────────────────────────────────────────────────────────
 Özet │ Randevular │ Paketler & Ödemeler │ Notlar
```

- **Özet** — toplam ödediği, kalan borcu, aktif paketi ve kalan seansı, ilk/son görüşme tarihi, toplam seans sayısı. Bu bilgilerin hiçbiri bugün tek yerde görünmüyor.
- **Randevular** — mevcut geçmiş listesi.
- **Paketler & Ödemeler** — satılan paketler (kalan seans / kalan borç ile), paket satışı butonu, tahsilat geçmişi, tahsilat ekleme.
- **Notlar** — mevcut genel not alanı.

### Finans — `/admin/finans`

Tek sayfa, üç sekme. Dönem filtresi (`PeriodFilter`) sekmelerin üstünde ortak.

- **Gelirler** — `Payment` defteri. Her satırda kaynak görünür: "Randevu · Ayşe Y." veya "Paket taksiti · Mehmet K." Tahsilat ekleme/düzenleme buradan da yapılabilir. Özet şeridi: toplam tahsilat, bekleyen alacak.
- **Giderler** — mevcut ekran, aynen taşınır.
- **Paketler** — katalog CRUD (ad, seans sayısı, fiyat, aktif/pasif).

### Talepler — `/admin/talepler`

```
● Yeni    Ali Vural   0(555) 123 45 67   ali@x.com   2 saat önce
          [ Danışan Oluştur ]  [ Yoksay ]
```

"Danışan Oluştur" talep bilgileriyle önden doldurulmuş danışan formunu açar; kaydedince istenirse aynı akışta randevu da verilir. Telefon numarası mevcut bir danışanla eşleşiyorsa uyarı gösterilir ve mevcut kayda bağlama seçeneği sunulur.

### İstatistik — `/admin/istatistik`

İçerik büyük ölçüde korunur; gelir kaynağı `Payment`'a taşınır. 792 satırlık tek dosya `components/admin/stats/` altında grafik başına bileşenlere bölünür. Eklenen kart: **Alacaklar** (toplam bekleyen tahsilat, en yüksek borçlu 5 danışan).

### Blog ve SSS

Fonksiyon değişmiyor. Yeni ortak UI bileşenlerine (tablo, buton, modal, form alanları) uyarlanır. TipTap editörüne dokunulmaz.

## Mobil

Panel `md` kırılma noktasında iki düzen arasında geçiş yapar:

- **≥ md** — sol sidebar (mevcut yapı, aktif vurgusu eklenmiş).
- **< md** — sidebar kaybolur, alt sekme çubuğu gelir:

```
┌──────────────────────────────────────┐
│         (aktif ekran)                │
├──────────────────────────────────────┤
│  Bugün  Takvim  Danışan  Finans   ⋯  │
└──────────────────────────────────────┘
```

`⋯` bir alt sayfa açar: Talepler, İstatistik, Blog, SSS, Çıkış.

Mobil kuralları: tüm modal'lar bottom sheet, dokunma hedefleri en az 44px, tablolar mobilde kart listesine dönüşür (yatay kaydırma yok), `İşle` akışı tek elle tamamlanabilir.

## Bug'lar ve Düzeltmeleri

| # | Sorun | Bugünkü yer | Düzeltme |
|---|---|---|---|
| 1 | Randevu veya danışan silinince gelir kaydı öksüz kalıyor, istatistikte sayılmaya devam ediyor | `bookings.js:161`, `patients.js:100` | Cascade silme. `Payment` zaten `booking`/`patient` ref'i taşıdığı için tek sorguyla temizlenir. |
| 2 | "Geldi" → "İptal" yapılınca gelir kaydı duruyor (hayalet gelir) | `bookings.js:104` | Durum `geldi`den çıkarsa bağlı `Payment` silinir, `fee` sıfırlanır. Kullanıcıdan onay istenir. |
| 3 | `visitType` kayıt sayısına göre hesaplanıyor; geçmiş randevu sonradan girilirse veya ilk randevu silinirse yanlışlanıyor | `bookings.js:82` | Doğru mantık zaten `scripts/backfill-visit-type.js` içinde var (tarihe göre sıralayıp ilkini `ilk_gorusme` yapıyor) ama yalnızca tek seferlik migration olarak çalışıyor. Bu mantık `lib/visitType.js` içine `recalcVisitTypes(patientId)` olarak çıkarılır ve her create/update/delete sonrası çağrılır. Tek seferlik script silinir (canlı veri yok), mevcut `backfillVisitType.test.js` yardımcının testine dönüşür. |
| 4 | Saat dilimi kayması: `toISOString()` yerel gece yarısını UTC'ye çevirince bir gün geri gidiyor. "Bu Ay" filtresi önceki ayın son gününü de kapsıyor, dashboard geliri şişik | `periods.ts:29`, `randevular/page.tsx:19`, `giderler/page.tsx:16` | Tüm tarih yardımcıları tek dosyada (`lib/date.ts`) toplanır ve yalnızca yerel bileşenlerle (`getFullYear`/`getMonth`/`getDate`) çalışır. `toISOString()` tarih üretiminde hiç kullanılmaz. |
| 5 | Tarih aralığı filtresi `to` gününü kapsamıyor olabilir | `bookings.js:44` ve diğer route'lardaki `buildDateFilter` | Ortak `lib/dateRange.js`: `$gte from 00:00:00.000Z`, `$lte to 23:59:59.999Z`. Yazarken tüm tarihler UTC gece yarısına normalize edilir. |
| 6 | Gelir kaydı hastaya telefonla eşleştiriliyor; telefon değişince bağ kopuyor | `randevular/page.tsx:87` | `Payment.patient` zorunlu ref. Telefonla eşleştirme tamamen kalkar. |
| 7 | Sidebar mobilde kullanılamıyor, aktif sayfa vurgusu yok | `layout.tsx:19` | Responsive layout + alt sekme çubuğu + `usePathname` ile aktif vurgu. |
| 8 | Danışan listesi üç ekranda birden tamamen indiriliyor, arama client-side, sayfalama yok | `takvim`, `randevular`, `hastalar` | Backend araması (`?q=`) kullanılır, sayfalama eklenir. Randevu formundaki danışan seçici aramalı ve sunucu taraflı olur. |
| 9 | Native `confirm()` kullanımı — tasarımla uyumsuz, mobilde kötü | 6 yerde | Ortak `ConfirmDialog` bileşeni. |
| 10 | `inputCls` string'i 6 dosyada kopyalanmış, `randevular`/`giderler` neredeyse aynı iskelet | frontend geneli | Ortak UI bileşen seti (aşağıda). |
| 11 | Public randevu talebi hiçbir yere kaydedilmiyor | `appointment.js:37` | `AppointmentRequest` modeli + Talepler ekranı. |

## Ortak Bileşenler

Tekrarı kaldırmak ve yeni ekranların tutarlı çıkması için `frontend/src/components/admin/ui/` altında küçük bir set:

`Button`, `Field` (label + input + hata), `Modal` (masaüstü ortada / mobilde bottom sheet), `ConfirmDialog`, `DataTable` (mobilde kart listesine düşer), `Tabs`, `StatTile`, `EmptyState`, `Badge`.

Mevcut `DateTimeInput` (DateInput / TimeInput / SelectInput), `PhoneInput` ve `PeriodFilter` korunur, yeni sete uyarlanır. `lib/` altındaki etiket-renk sözlükleri (`bookingStatus`, `patientSource`, `cancelReason`, `patientProcessStatus`) bugünkü haliyle iyi çalışıyor; aynı desenle `paymentMethod` ve `requestStatus` eklenir.

## Test Stratejisi

Backend'de jest + mongodb-memory-server + supertest zaten kurulu, `backend/tests/` altında 6 test dosyası var. Aynı desen sürdürülür ve **TDD uygulanır** — her davranış için önce test.

Yeni test dosyaları:

- `packages.test.js` — katalog CRUD, pasif paket satışta listelenmiyor
- `patientPackages.test.js` — satış, snapshot alanları katalog değişince sabit kalıyor, kalan seans/borç hesabı
- `payments.test.js` — `source` değişmezi (booking XOR package), tarih aralığı filtresi
- `requests.test.js` — public POST hem Telegram'ı çağırıyor hem kayıt atıyor; Telegram hatasında kayıt yine atılıyor; dönüştürme akışı
- `today.test.js` — "Bugün" özeti: işlenmemiş sayısı, günün tahsilatı, alacak toplamı

Genişletilen testler:

- `bookings.test.js` — cascade silme (#1), durum geri alınca payment temizliği (#2), `visitType` tarihe göre yeniden hesaplama (#3), paketten düşen seansın `fee`'sinin 0 olması
- `patients.test.js` — cascade silme paketleri ve ödemeleri de kapsıyor; `?q=` araması ve sayfalama
- `stats.test.js` — gelir `Payment`'tan geliyor, alacak metriği doğru, `havale` kırılımda görünüyor
- `finance.test.js` — bugünkü dört testinden üçü `Appointment` üzerine kurulu; bunlar `Payment` karşılıklarıyla yeniden yazılır. Gider testleri olduğu gibi kalır.
- `backfillVisitType.test.js` — tek seferlik script yerine `recalcVisitTypes` yardımcısını test eder
- **Yeni:** `dateRange.test.js` — saat dilimi regresyonu (#4, #5). Ay başı/sonu sınırları, `to` gününün kapsanması.

Frontend'de test altyapısı yok; bu spec kapsamında da kurulmuyor. Frontend doğrulaması `npm run build` + `npm run lint` + elle kontrol ile yapılır.

## Uygulama Sırası

Bağımlılıklara göre önerilen sıra (detaylı plan `writing-plans` ile ayrıca çıkarılacak):

1. **Temel:** `lib/date.ts` + `dateRange.js` + testleri (#4, #5) — her şey tarihe dokunuyor, önce burası sağlamlaşmalı
2. **Model katmanı:** `Package`, `PatientPackage`, `Payment`, `AppointmentRequest` + `Booking` alanları; `Appointment` silinir
3. **Backend route'lar** + cascade davranışları + `recalcVisitTypes` (#1, #2, #3, #6)
4. **`seed-demo.js`** — sonraki adımların elle doğrulanabilmesi için
5. **Ortak UI bileşenleri** + responsive layout + alt sekme çubuğu (#7, #9, #10)
6. **Ekranlar:** Bugün → İşle modalı → Takvim → Danışan detayı → Finans → Talepler
7. **İstatistik** yeniden bağlanır ve bileşenlere bölünür
8. **Blog / SSS** yeni bileşen setine uyarlanır
9. Danışan araması ve sayfalama (#8)

## Riskler ve Açık Noktalar

- **Kapsam büyük.** Tek oturumda bitmez; adım adım ilerleyip her aşamada çalışır durum korunacak. Aşama 1-4 backend, 5-9 frontend; ikisi arasında panel geçici olarak bozuk kalır. Bunu kısaltmak için 4. adımdan sonra frontend'i tek seferde yeni API'ye bağlamak yerine ekran ekran geçmek tercih edildi.
- **`Appointment` silinmesi geri dönüşsüz.** Canlıda veri olmadığı teyit edildi; yine de silmeden önce `mongodump` alınacak.
- **Paketten düşen seansların gelire etkisi.** Paket geliri satış anında (kasa mantığı) yazıldığı için, paketten düşen bir seans o gün "0 ₺ gelir" gösterir. Bu doğru davranış ama İstatistik ekranında yanlış anlaşılmaya açık; "Paket geliri" ve "Seans geliri" ayrı gösterilerek netleştirilecek.
- **Alacak takibinin kapsamı.** Kısmi ödeme (tek seansın yarısını bugün, yarısını sonra) modelde destekleniyor — `Booking.fee` 1.500, iki ayrı `Payment` 750+750. Ancak "İşle" modalı bu senaryoyu ilk sürümde sunmayacak; kısmi ödeme danışan detayından girilir.
- **`visitType` hesabında iptal edilen randevular.** Mevcut mantık tüm randevuları sayıyor; yani ilk randevu iptal olsa bile "ilk görüşme" o iptal kaydında kalıyor, danışanın gerçekten geldiği ilk seans "kontrol" görünüyor. Bu spec bunu değiştiriyor: `iptal` durumundaki randevular sıralamadan çıkarılıyor, çünkü İstatistik'teki "ilk görüşmeden ikinciye dönüşüm" metriği ancak böyle anlamlı oluyor. Bilinçli bir davranış değişikliği — testle sabitlenecek.
- **Blog SEO alanları Spec 2'ye bırakıldı.** Blog ekranı bu turda UI için bir kez, Spec 2'de alanlar için ikinci kez açılacak. Bilinçli bir tercih; alternatifi SEO kararlarını public site tasarlanmadan vermekti.
