import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, buildMetadata } from "@/lib/seo";
import AntropometrikClient from "./AntropometrikClient";

export const metadata = buildMetadata({
  title: "Antropometrik Ölçüm Hesaplama",
  description:
    "Bel/kalça oranı, bel/boy oranı ve vücut kitle indeksi gibi antropometrik ölçümlerinizi hesaplayın; sonuçların ne anlama geldiğini öğrenin.",
  path: "/araclar/antropometrik-olcumler",
});

export default function AntropometrikPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Ana Sayfa", path: "/" },
          { name: "Hesaplamalar", path: "/hesaplamalar" },
          { name: "Antropometrik Ölçümler", path: "/araclar/antropometrik-olcumler" },
        ])}
      />
      <AntropometrikClient />
    </>
  );
}
