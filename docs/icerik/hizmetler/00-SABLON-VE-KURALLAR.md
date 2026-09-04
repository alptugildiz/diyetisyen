# Hizmet Sayfası İçerikleri — Şablon ve Kurallar

Bu klasördeki dosyalar **diyetisyen onayı bekleyen taslak metinlerdir**. Onaydan sonra
`frontend/src/content/hizmetler/` altına TypeScript veri dosyası olarak taşınacak ve
`/hizmetler/<slug>` sayfalarında render edilecek.

## Süreç

1. Claude taslağı yazar (bu klasör)
2. Diyetisyen Beyza Şule Kahraman okur, düzeltir, `[ONAY]` işaretlerini kaldırır
3. Onaylı metin koda taşınır

## İşaretler

- `[ONAY: ...]` — diyetisyenin doğrulaması/doldurması gereken yer. **Kodda kalmamalı.**
- `[NAP]` — Google İşletme Profili ile birebir aynı olması gereken bilgi.

## Her sayfanın sabit iskeleti

| Bölüm | Amaç | Yaklaşık kelime |
|---|---|---|
| Meta başlık | 55-60 karakter, "Lüleburgaz" + hizmet adı | — |
| Meta açıklama | 150-160 karakter, eylem çağrısı içerir | — |
| H1 | Sayfa başına tek. Hizmet adı + Lüleburgaz | — |
| Giriş | 2 paragraf. Kime hitap ediyor, ne vaat ediyor | ~120 |
| Kimler için uygun | Madde listesi, 5-7 madde | ~120 |
| Süreç nasıl işliyor | Numaralı adımlar (H2 + H3) | ~250 |
| Yaklaşımım | Diyetisyenin bakış açısı — E-E-A-T sinyali | ~180 |
| Sık sorulan sorular | 4-6 soru. FAQPage JSON-LD'ye de girer | ~250 |
| Kapanış / randevu | CTA, NAP tekrarı | ~80 |
| **Toplam** | | **~1.000** |

7 hizmet × ~1.000 kelime ≈ 7.000 kelime.

> **Varsayım — doğrulanmalı:** Brainstorm notunda "~4.000 kelime" geçiyordu ama sayfa
> başına mı toplam mı belirsizdi. Sayfa başına 4.000 kelime yerel hizmet sayfası için
> fazla (okunmaz, ince içerik değil ama şişkin olur); toplam 4.000 ise sayfa başına
> ~570 kelime düşer ve rekabet için zayıf kalır. **Sayfa başına ~1.000** kelimeyi
> hedefliyorum. Farklı isteniyorsa söyleyin, ölçeklerim.

## Yazım kuralları

- **Dil:** Türkçe, siz diliyle. Diyetisyen birinci tekil ("planlıyorum", "değerlendiriyorum").
- **Ton:** Sıcak ama klinik. Motivasyon dili var, abartı yok.
- **Yasak:** "Garanti", "kesin sonuç", "X kiloyu Y günde", "mucize", "detoks ile toksin atma",
  hastalık iyileştirme iddiası. Sağlık içeriği — teşhis/tedavi vaadi yok.
- **Mevzuat:** Diyetisyen, hekim tanısı olmadan hastalık tedavi ettiğini iddia edemez.
  Hastalıklara özel beslenme sayfasında "hekiminizin tanı ve tedavisine eşlik eden
  beslenme planı" çerçevesi korunacak.
- **Anahtar kelime:** Doğal yoğunluk. "Lüleburgaz diyetisyen", "Kırklareli diyetisyen"
  H1'de, girişte ve kapanışta geçer; gövdeye zorlanmaz.
- **İç bağlantı:** Her sayfa en az 2 diğer hizmete + varsa ilgili blog yazısına + `/araclar`
  hesaplayıcılarına bağlanır.

## Sabit bilgiler (NAP — Google İşletme Profili ile birebir aynı olacak)

- **İsim:** Diyetisyen Beyza Şule Kahraman
- **Adres:** 8 Kasım, Naci Arı Cd No: 45/A, 39750 Lüleburgaz / Kırklareli
- **Telefon:** +90 542 689 80 44
- **Site:** https://trakyadyt.com
- **Instagram:** @trakyadiyetisyen · **TikTok:** @trakyadiyetisyen

## Hizmet listesi ve slug'lar

| # | Hizmet | Slug | Dosya |
|---|---|---|---|
| 1 | Kilo Verme Danışmanlığı | `kilo-verme-danismanligi` | `01-...md` |
| 2 | Kilo Alma Danışmanlığı | `kilo-alma-danismanligi` | `02-...md` |
| 3 | Sporcu Beslenmesi | `sporcu-beslenmesi` | `03-...md` |
| 4 | Hastalıklara Özel Beslenme | `hastaliklara-ozel-beslenme` | `04-...md` |
| 5 | Arınma ve Beslenme Düzenleme | `arinma-ve-beslenme-duzenleme` | `05-...md` |
| 6 | Gebelikte Beslenme | `gebelikte-beslenme` | `06-...md` |
| 7 | Emzirme Döneminde Beslenme | `emzirme-doneminde-beslenme` | `07-...md` |

> **Not:** Brainstorm notunda "8 hizmet" yazıyordu, `Services.tsx`'te 7 tane var.
> 8'inci eklenecekse listeye girmeli.
