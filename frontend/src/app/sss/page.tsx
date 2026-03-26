import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FaqAccordion from "@/components/FaqAccordion";
import { getFaqs } from "@/lib/api";
import type { Faq } from "@/types";

export const dynamic = "force-dynamic";

export default async function SSSPage() {
  let faqs: Faq[];
  try {
    faqs = await getFaqs();
  } catch {
    faqs = [];
  }

  return (
    <>
      <Navbar />

      <div className="relative">
        <Image
          src="/sss/indoor_16x9.jpg"
          alt=""
          fill
          className="object-cover opacity-[0.09] pointer-events-none select-none"
          aria-hidden
        />

        {/* Hero */}
        <section className="grain relative overflow-hidden pt-32 pb-16 px-6 bg-linear-to-b from-brand-bg to-brand-bg">
          <div className="max-w-3xl mx-auto text-center">
            <p className="font-cabin text-brand-600 font-semibold tracking-widest uppercase text-sm mb-4">
              Yardım Merkezi
            </p>
            <h1 className="font-oswald text-5xl md:text-6xl font-bold text-gray-900 mb-4">
              Sıkça Sorulan Sorular
            </h1>
            <p className="font-hind-vadodara text-brand-600 text-lg max-w-xl mx-auto">
              Merak ettiğiniz soruların yanıtları burada.
            </p>
          </div>
        </section>

        {/* İçerik */}
        <main className="min-h-screen pb-24 px-6 bg-linear-to-b from-brand-bg to-brand-bg">
          <div className="max-w-3xl mx-auto pt-12">
            {faqs.length === 0 ? (
              <p className="font-hind-vadodara text-brand-600 text-center py-24 text-lg">
                Henüz soru eklenmemiş.
              </p>
            ) : (
              <FaqAccordion faqs={faqs} />
            )}
          </div>
        </main>
      </div>

      <Footer />
    </>
  );
}
