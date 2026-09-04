export interface ServiceFaq {
  question: string;
  answer: string;
}

export interface ServiceSection {
  heading: string;
  /** Paragraflar. HTML değil düz metin — sayfada <p> olarak basılır. */
  paragraphs?: string[];
  /** Madde listesi. */
  bullets?: string[];
  /** Numaralı alt adımlar (Süreç bölümü için). */
  steps?: { heading: string; body: string }[];
}

export interface ServiceContent {
  slug: string;
  /** Ana sayfadaki hizmet kartıyla birebir aynı başlık. */
  title: string;
  emoji: string;
  /** Kart açıklaması — Services.tsx'ten taşındı. */
  cardDescription: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string[];
  /** "Kimler için uygun?" maddeleri. */
  audience: string[];
  /** audience listesinin başlığı — bazı hizmetlerde farklı. */
  audienceHeading?: string;
  sections: ServiceSection[];
  faqs: ServiceFaq[];
  /** İlgili diğer hizmetlerin slug'ları. En az 2. */
  related: string[];
}
