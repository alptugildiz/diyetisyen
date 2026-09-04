import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, buildMetadata } from "@/lib/seo";
import KaloriHesaplayiciClient from "./KaloriHesaplayiciClient";

export const metadata = buildMetadata({
  title: "Günlük Kalori İhtiyacı Hesaplama",
  description:
    "Yaş, boy, kilo ve hareket düzeyinize göre bazal metabolizma hızınızı ve günlük kalori ihtiyacınızı ücretsiz hesaplayın.",
  path: "/araclar/kalori-hesaplayici",
});

export default function KaloriHesaplayiciPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Ana Sayfa", path: "/" },
          { name: "Hesaplamalar", path: "/hesaplamalar" },
          { name: "Kalori Hesaplayıcı", path: "/araclar/kalori-hesaplayici" },
        ])}
      />
      <KaloriHesaplayiciClient />
    </>
  );
}
