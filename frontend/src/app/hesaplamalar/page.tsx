import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, buildMetadata } from "@/lib/seo";
import HesaplamalarClient from "./HesaplamalarClient";

// Hesaplayıcının kendisi tarayıcıda çalışıyor; metadata ve yapısal veri
// sunucuda üretilebilsin diye sayfa ince bir sunucu bileşeni olarak duruyor.
export const metadata = buildMetadata({
  // Sona " | Beyza Şule Kahraman" ekleniyor; toplam 60 karakteri aşmasın.
  title: "BKİ, Kalori ve İdeal Kilo Hesaplama",
  description:
    "Vücut kitle indeksi, bazal metabolizma hızı, günlük kalori ihtiyacı, ideal kilo ve bel/kalça oranını tek ekranda hesaplayın. Ücretsiz diyetisyen aracı.",
  path: "/hesaplamalar",
});

export default function HesaplamalarPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Ana Sayfa", path: "/" },
          { name: "Hesaplamalar", path: "/hesaplamalar" },
        ])}
      />
      <HesaplamalarClient />
    </>
  );
}
