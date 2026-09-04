import Link from "next/link";
import { SERVICES } from "@/content/hizmetler";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";

export const metadata = buildMetadata({
  title: "Hizmetler | Lüleburgaz Diyetisyen Beyza Şule Kahraman",
  description:
    "Kilo verme, kilo alma, sporcu beslenmesi, hastalıklara özel beslenme, gebelik ve emzirme dönemi danışmanlığı. Lüleburgaz'da yüz yüze görüşme.",
  path: "/hizmetler",
});

export default function HizmetlerPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Ana Sayfa", path: "/" },
          { name: "Hizmetler", path: "/hizmetler" },
        ])}
      />
      <main className="max-w-5xl mx-auto px-4 py-16">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
          Hizmetler
        </h1>
        <p className="mt-3 text-gray-600 max-w-2xl leading-relaxed">
          Her danışmanlık süreci kişiye özel planlanıyor. Aşağıdaki
          başlıklardan size uygun olanı seçip sürecin nasıl işlediğini
          okuyabilirsiniz.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
          {SERVICES.map((s) => (
            <Link
              key={s.slug}
              href={`/hizmetler/${s.slug}`}
              className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-6 transition-colors hover:border-emerald-300 hover:bg-emerald-50/30"
            >
              <span className="text-3xl" aria-hidden="true">
                {s.emoji}
              </span>
              <h2 className="mt-3 font-semibold text-gray-900 group-hover:text-emerald-700">
                {s.title}
              </h2>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed flex-1">
                {s.cardDescription}
              </p>
              <span className="mt-4 text-sm font-medium text-emerald-600">
                Ayrıntılar →
              </span>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
