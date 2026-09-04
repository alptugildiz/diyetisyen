import { notFound } from "next/navigation";
import Link from "next/link";
import { SERVICES, getService } from "@/content/hizmetler";
import {
  SITE,
  buildMetadata,
  breadcrumbSchema,
  faqPageSchema,
  serviceSchema,
} from "@/lib/seo";
import JsonLd from "@/components/JsonLd";

export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) return {};
  return buildMetadata({
    title: service.metaTitle,
    description: service.metaDescription,
    path: `/hizmetler/${service.slug}`,
  });
}

export default async function HizmetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  const related = service.related
    .map((s) => getService(s))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  const { streetAddress, postalCode, addressLocality, addressRegion } =
    SITE.address;

  return (
    <>
      <JsonLd
        data={serviceSchema({
          name: service.title,
          description: service.metaDescription,
          path: `/hizmetler/${service.slug}`,
        })}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Ana Sayfa", path: "/" },
          { name: "Hizmetler", path: "/hizmetler" },
          { name: service.title, path: `/hizmetler/${service.slug}` },
        ])}
      />
      <JsonLd data={faqPageSchema(service.faqs)} />

      <main className="max-w-3xl mx-auto px-4 py-16">
        <nav aria-label="Sayfa yolu" className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-emerald-600">
            Ana Sayfa
          </Link>
          <span className="mx-1.5">›</span>
          <Link href="/hizmetler" className="hover:text-emerald-600">
            Hizmetler
          </Link>
          <span className="mx-1.5">›</span>
          <span className="text-gray-700">{service.title}</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
          {service.h1}
        </h1>

        <div className="mt-6 space-y-4 text-gray-700 leading-relaxed">
          {service.intro.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <h2 className="mt-12 text-2xl font-semibold text-gray-900">
          {service.audienceHeading ?? "Kimler için uygun?"}
        </h2>
        <ul className="mt-4 space-y-2">
          {service.audience.map((item, i) => (
            <li key={i} className="flex gap-3 text-gray-700">
              <span className="text-emerald-600 shrink-0" aria-hidden="true">
                •
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>

        {service.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="mt-12 text-2xl font-semibold text-gray-900">
              {section.heading}
            </h2>

            {section.paragraphs?.map((p, i) => (
              <p key={i} className="mt-4 text-gray-700 leading-relaxed">
                {p}
              </p>
            ))}

            {section.bullets && (
              <ul className="mt-4 space-y-2">
                {section.bullets.map((b, i) => (
                  <li key={i} className="flex gap-3 text-gray-700">
                    <span
                      className="text-emerald-600 shrink-0"
                      aria-hidden="true"
                    >
                      •
                    </span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}

            {section.steps && (
              <ol className="mt-6 space-y-6">
                {section.steps.map((step, i) => (
                  <li key={i} className="flex gap-4">
                    <span
                      className="shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-semibold flex items-center justify-center"
                      aria-hidden="true"
                    >
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {step.heading}
                      </h3>
                      <p className="mt-1 text-gray-700 leading-relaxed">
                        {step.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        ))}

        <h2 className="mt-12 text-2xl font-semibold text-gray-900">
          Sık sorulan sorular
        </h2>
        <div className="mt-4 divide-y divide-gray-200 border-y border-gray-200">
          {service.faqs.map((faq) => (
            <details key={faq.question} className="group py-4">
              <summary className="font-medium text-gray-900 cursor-pointer list-none flex justify-between gap-4">
                {faq.question}
                <span
                  className="text-emerald-600 shrink-0 transition-transform group-open:rotate-45"
                  aria-hidden="true"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-gray-700 leading-relaxed">{faq.answer}</p>
            </details>
          ))}
        </div>

        {related.length > 0 && (
          <>
            <h2 className="mt-12 text-2xl font-semibold text-gray-900">
              İlgili hizmetler
            </h2>
            <div className="mt-4 grid sm:grid-cols-2 gap-4">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/hizmetler/${r.slug}`}
                  className="rounded-2xl border border-gray-200 p-4 transition-colors hover:border-emerald-300 hover:bg-emerald-50/30"
                >
                  <span className="text-2xl" aria-hidden="true">
                    {r.emoji}
                  </span>
                  <p className="mt-2 font-medium text-gray-900">{r.title}</p>
                </Link>
              ))}
            </div>
          </>
        )}

        <div className="mt-12 rounded-2xl bg-emerald-50 border border-emerald-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900">Randevu</h2>
          <p className="mt-2 text-gray-700">
            Lüleburgaz&apos;da yüz yüze görüşmek için randevu oluşturabilir ya da
            doğrudan arayabilirsiniz.
          </p>
          <p className="mt-4 font-semibold text-gray-900">{SITE.person}</p>
          <p className="text-gray-700">
            {streetAddress}, {postalCode} {addressLocality} / {addressRegion}
          </p>
          <a
            href={`tel:${SITE.telephone.replace(/-/g, "")}`}
            className="mt-1 inline-block text-emerald-700 font-medium hover:underline"
          >
            {SITE.telephone.replace(/-/g, " ")}
          </a>
        </div>

        <p className="mt-8 text-sm text-gray-500 border-l-2 border-gray-200 pl-4">
          Bu sayfadaki bilgiler genel bilgilendirme amaçlıdır ve kişiye özel bir
          beslenme danışmanlığının yerine geçmez.
        </p>
      </main>
    </>
  );
}
