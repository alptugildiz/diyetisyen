# Telegram Bot Kurulum Rehberi

## Adım 1: Bot Oluşturma

1. Telegram'da **@BotFather**'a mesaj at
2. `/newbot` komutunu gönder
3. Bot için bir isim gir (örn: "Diyetisyen Randevu Bot")
4. Bot için bir kullanıcı adı gir (örn: `diyetisyen_randevu_bot`) — `_bot` ile bitmeli
5. BotFather sana bir **API Token** verecek (örn: `7123456789:AAF...`). Bunu kaydet → `TELEGRAM_BOT_TOKEN`

## Adım 2: Chat ID Alma

Randevu bildirimlerinin gönderileceği chat/grup ID'sini almak için:

### Kişisel mesaj için:

1. Oluşturduğun bota Telegram'dan `/start` mesajı gönder
2. Tarayıcıda şu URL'yi aç: `https://api.telegram.org/bot<TOKEN>/getUpdates`
3. JSON yanıtında `"chat":{"id": 123456789}` değerini bul → `TELEGRAM_CHAT_ID`

### Grup/kanal için:

1. Botu gruba ekle
2. Grupta bir mesaj yaz
3. Aynı `getUpdates` URL'sini aç, grup chat ID'sini bul (negatif sayı olur, örn: `-1001234567890`)

## Adım 3: Ortam Değişkenleri

`backend/.env` dosyasına ekle:

```env
TELEGRAM_BOT_TOKEN=7123456789:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TELEGRAM_CHAT_ID=123456789
```

## Adım 4: Docker ile Çalışma

`backend/.env` zaten `docker-compose.yml`'de `env_file` olarak tanımlı, ekstra bir şey yapmana gerek yok. Sadece `.env` dosyasını güncelledikten sonra container'ı yeniden başlat:

```bash
docker compose up -d --build backend
```

## Test Etme

Bot kurulumunu test etmek için tarayıcıda şu URL'yi aç:

```
https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<CHAT_ID>&text=Test%20mesajı
```

Telegram'da mesaj geliyorsa her şey hazır demektir.
