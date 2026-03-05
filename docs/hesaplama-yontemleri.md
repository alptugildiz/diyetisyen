# Hesaplama Yöntemleri

Araçlar sayfasındaki üç hesaplayıcıda kullanılan matematiksel formüller ve kaynakları.

---

## 1. Kalori Hesaplayıcı

### Bazal Metabolizma Hızı (BMR) — Mifflin-St Jeor (1990)

Günümüzde kliniklerde en yaygın kullanılan formüldür. Eski Harris-Benedict (1919) formülüne kıyasla %5 daha doğru sonuç verdiği gösterilmiştir.

```
Erkek : BMR = 10 × w + 6.25 × h − 5 × a + 5
Kadın : BMR = 10 × w + 6.25 × h − 5 × a − 161
```

| Değişken | Açıklama            |
| -------- | ------------------- |
| `w`      | Vücut ağırlığı (kg) |
| `h`      | Boy (cm)            |
| `a`      | Yaş                 |

### Günlük Toplam Kalori İhtiyacı (TDEE)

```
TDEE = BMR × aktivite faktörü
```

| Aktivite Düzeyi                               | Faktör |
| --------------------------------------------- | ------ |
| Hareketsiz (ofis işi, spor yok)               | 1.20   |
| Az aktif (haftada 1-3 gün hafif spor)         | 1.375  |
| Orta aktif (haftada 3-5 gün orta spor)        | 1.55   |
| Çok aktif (haftada 6-7 gün yoğun spor)        | 1.725  |
| Aşırı aktif (fiziksel iş + günlük yoğun spor) | 1.90   |

Aktivite sınıflandırması: Harris-Benedict aktivite katsayıları.

### Hedef Kalori Hesabı

1 kg vücut yağı ≈ 7700 kcal enerji içerir. Haftada ~0.5 kg değişim hedefi için günlük ±500 kcal fark yeterlidir.

```
Kilo Verme : TDEE − 500 kcal/gün
Kilo Koruma: TDEE
Kilo Alma  : TDEE + 500 kcal/gün
```

**Kaynak:** Mifflin MD, et al. _A new predictive equation for resting energy expenditure in healthy individuals._ Am J Clin Nutr. 1990;51(2):241-7.

---

## 2. Antropometrik Ölçümler

### Vücut Kitle İndeksi (BKİ / BMI)

```
BKİ = w / h²
```

| Değişken | Açıklama            |
| -------- | ------------------- |
| `w`      | Vücut ağırlığı (kg) |
| `h`      | Boy (metre)         |

**WHO Sınıflandırması:**

| BKİ Aralığı | Kategori     |
| ----------- | ------------ |
| < 18.5      | Zayıf        |
| 18.5 – 24.9 | Normal       |
| 25.0 – 29.9 | Fazla Kilolu |
| ≥ 30.0      | Obez         |

### İdeal Kilo Aralığı

BKİ formülünün tersine çevrilmesiyle, "normal" BKİ bandına karşılık gelen kilo aralığı hesaplanır:

```
İdeal min = 18.5 × h²
İdeal max = 24.9 × h²
```

### Bel-Kalça Oranı (BKO / WHR)

```
BKO = bel (cm) / kalça (cm)
```

**WHO/NIH Risk Eşikleri:**

| BKO         | Erkek       | Kadın       |
| ----------- | ----------- | ----------- |
| Düşük Risk  | < 0.90      | < 0.80      |
| Orta Risk   | 0.90 – 1.00 | 0.80 – 0.85 |
| Yüksek Risk | > 1.00      | > 0.85      |

**Kaynak:** World Health Organization. _Waist circumference and waist-hip ratio: report of a WHO expert consultation._ Geneva, 2008.

---

## 3. Vücut Analizi

### Vücut Yağ Yüzdesi — US Navy Formülü (Hodgdon & Beckett, 1984)

Deri kıvrımı ölçümü gerektirmeyen, çevre ölçümleriyle uygulanan pratik bir formüldür. DEXA taramasına kıyasla ortalama ±3-4% sapma gösterir.

**Erkek:**

```
%yağ = 495 / [1.0324 − 0.19077 × log10(bel − boyun) + 0.15456 × log10(boy)] − 450
```

**Kadın:**

```
%yağ = 495 / [1.29579 − 0.35004 × log10(bel + kalça − boyun) + 0.22100 × log10(boy)] − 450
```

Tüm ölçümler **cm** cinsindendir.

### Yağ Kütlesi ve Yağsız Kütle (LBM)

```
Yağ kütlesi (kg)  = toplam kilo × (%yağ / 100)
Yağsız kütle (kg) = toplam kilo − yağ kütlesi
```

**Vücut Yağ Kategorileri (ACSM):**

| Kategori         | Erkek    | Kadın    |
| ---------------- | -------- | -------- |
| Temel Yağ        | < 6%     | < 14%    |
| Atletik          | 6 – 13%  | 14 – 20% |
| Fit              | 14 – 17% | 21 – 24% |
| Kabul Edilebilir | 18 – 24% | 25 – 31% |
| Obez             | ≥ 25%    | ≥ 32%    |

**Kaynak:** Hodgdon JA, Beckett MB. _Prediction of percent body fat for U.S. Navy men and women from body circumferences and height._ Naval Health Research Center. 1984.

---

## Önemli Not

Tüm hesaplamalar **genel popülasyon ortalamalarına** dayalı istatistiksel modellerdir. Hamilelik, kronik hastalık, aşırı kas kütlesi veya yaşlılık gibi özel durumlarda sonuçlar yanıltıcı olabilir. Kesin değerlendirme için klinisyen kontrolü önerilir.
