import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, buildMetadata } from "@/lib/seo";
import VucutAnaliziClient from "./VucutAnaliziClient";

export const metadata = buildMetadata({
  title: "Vücut Analizi ve Yağ Oranı Hesaplama",
  description:
    "Vücut kitle indeksi, vücut yağ oranı ve ideal kilo aralığınızı hesaplayın. Sonuçlarınızı diyetisyen yorumuyla birlikte değerlendirin.",
  path: "/araclar/vucut-analizi",
});

export default function VucutAnaliziPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Ana Sayfa", path: "/" },
          { name: "Hesaplamalar", path: "/hesaplamalar" },
          { name: "Vücut Analizi", path: "/araclar/vucut-analizi" },
        ])}
      />
      <VucutAnaliziClient />
    </>
  );
}
