import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const tools = [
  {
    icon: "📏",
    title: "Antropometrik Ölçümler",
    desc: "Boy, kilo, bel-kalça oranı ve vücut kitle indeksi hesaplamalarını kolayca yapın.",
    slug: "antropometrik-olcumler",
  },
  {
    icon: "⚖️",
    title: "Vücut Analizi",
    desc: "Yağ kütlesi, kas kütlesi ve su oranınızı analiz edin, hedeflerinizi belirleyin.",
    slug: "vucut-analizi",
  },
  {
    icon: "🔥",
    title: "Kalori Hesaplayıcı",
    desc: "Günlük kalori ihtiyacınızı aktivite düzeyinize göre hesaplayın.",
    slug: "kalori-hesaplayici",
  },
];

export const metadata = {
  title: "Araçlar | Diyetisyen",
  description:
    "Beslenme yolculuğunuzu destekleyen ücretsiz hesaplama ve analiz araçları.",
};

export default function AraclarPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-linear-to-b from-brand-bg to-brand-50 pt-24 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Başlık */}
          <div className="mb-16">
            <p className="font-cabin text-brand-500 font-semibold uppercase tracking-widest text-sm mb-3">
              Ücretsiz Araçlar
            </p>
            <h1 className="font-oswald text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-4">
              Sağlıklı yaşamın <span className="text-brand-500">araçları</span>
            </h1>
            <p className="font-hind-vadodara text-gray-600 text-lg max-w-xl leading-relaxed">
              Beslenme ve vücut analizinizi destekleyen, uzman diyetisyen
              tarafından hazırlanmış ücretsiz hesaplama araçları.
            </p>
          </div>

          {/* Araç Kartları */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map((t) => (
              <Link
                key={t.slug}
                href={`/araclar/${t.slug}`}
                className="group bg-white/60 border border-brand-100 rounded-2xl p-8 flex flex-col gap-4 hover:-translate-y-2 hover:shadow-lg transition-all duration-300"
              >
                <div className="text-5xl">{t.icon}</div>
                <div className="flex-1">
                  <h2 className="font-oswald text-xl font-semibold text-gray-900 mb-2 group-hover:text-brand-500 transition-colors duration-300">
                    {t.title}
                  </h2>
                  <p className="font-hind-vadodara text-sm text-gray-500 leading-relaxed">
                    {t.desc}
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 text-sm font-semibold font-cabin text-brand-500 group-hover:gap-3 transition-all duration-300">
                  Hesapla →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
