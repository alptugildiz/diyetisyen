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
      <main className="pt-24 pb-16 min-h-screen bg-white px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Sıkça Sorulan Sorular
          </h1>
          <p className="text-gray-500 mb-12">
            Merak ettiğiniz soruların yanıtları burada.
          </p>

          {faqs.length === 0 ? (
            <p className="text-gray-400 text-center py-24">
              Henüz soru eklenmemiş.
            </p>
          ) : (
            <FaqAccordion faqs={faqs} />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
