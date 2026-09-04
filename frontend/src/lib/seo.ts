import type { Metadata } from "next";

/**
 * Tek doğruluk kaynağı — NAP (isim/adres/telefon) bilgileri Google İşletme
 * Profili'ndeki kayıtla BİREBİR aynı olmalıdır. Profil güncellenirse burası da
 * güncellenir; iki yerde farklı yazması yerel SEO'da doğrudan zarar verir.
 */
export const SITE = {
  url: "https://trakyadyt.com",
  name: "Trakya Diyetisyen Beyza Şule Kahraman",
  person: "Diyetisyen Beyza Şule Kahraman",
  personShort: "Beyza Şule Kahraman",
  telephone: "+90-542-689-80-44",
  address: {
    streetAddress: "8 Kasım, Naci Arı Cd No: 45/A",
    addressLocality: "Lüleburgaz",
    addressRegion: "Kırklareli",
    postalCode: "39750",
    addressCountry: "TR",
  },
  geo: { latitude: 41.3903135, longitude: 27.3595568 },
  social: [
    "https://www.instagram.com/trakyadiyetisyen/",
    "https://www.tiktok.com/@trakyadiyetisyen",
  ],
  defaultImage: "/diyetisyen.png",
} as const;

/** JSON-LD düğümlerinin birbirine referans verebilmesi için sabit @id'ler. */
export const ID = {
  business: `${SITE.url}/#business`,
  person: `${SITE.url}/#beyza-sule-kahraman`,
  website: `${SITE.url}/#website`,
} as const;

const TITLE_SUFFIX = " | Beyza Şule Kahraman";

interface PageMetaInput {
  /** Kısa başlık — sonuna site adı otomatik eklenir. ~45 karakteri geçmesin. */
  title: string;
  description: string;
  /** Kök göreli yol, başında "/" ile. Canonical bundan üretilir. */
  path: string;
  image?: string;
  noIndex?: boolean;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  tags?: readonly string[];
}

/**
 * Sayfa metadata'sı üretir. Root layout'taki `title.template` zaten soneki
 * ekliyor; burada OpenGraph/Twitter için tam başlığı elle kuruyoruz çünkü
 * template yalnızca `<title>` etiketine uygulanıyor.
 */
export function buildMetadata({
  title,
  description,
  path,
  image = SITE.defaultImage,
  noIndex = false,
  type = "website",
  publishedTime,
  modifiedTime,
  tags,
}: PageMetaInput): Metadata {
  const fullTitle = title + TITLE_SUFFIX;
  const url = `${SITE.url}${path}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    robots: noIndex
      ? { index: false, follow: true }
      : { index: true, follow: true, googleBot: { index: true, follow: true } },
    openGraph: {
      type,
      locale: "tr_TR",
      url,
      siteName: SITE.name,
      title: fullTitle,
      description,
      images: [{ url: image, alt: title }],
      ...(type === "article"
        ? { publishedTime, modifiedTime, authors: [SITE.person], tags: tags ? [...tags] : undefined }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [image],
    },
  };
}

/* ------------------------------------------------------------------ */
/* JSON-LD üreticileri                                                 */
/* ------------------------------------------------------------------ */

/** Ana sayfada bir kez basılan kök graf: işletme + kişi + site. */
export function siteGraph() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["LocalBusiness", "HealthAndBeautyBusiness"],
        "@id": ID.business,
        name: SITE.person,
        description:
          "Lüleburgaz ve Kırklareli'de kişiye özel beslenme danışmanlığı ve diyet programları.",
        url: SITE.url,
        telephone: SITE.telephone,
        image: `${SITE.url}${SITE.defaultImage}`,
        address: { "@type": "PostalAddress", ...SITE.address },
        geo: { "@type": "GeoCoordinates", ...SITE.geo },
        areaServed: [
          { "@type": "City", name: "Lüleburgaz" },
          { "@type": "City", name: "Kırklareli" },
          { "@type": "AdministrativeArea", name: "Trakya" },
        ],
        founder: { "@id": ID.person },
        employee: { "@id": ID.person },
        sameAs: [...SITE.social],
        priceRange: "$$",
        knowsAbout: [
          "Beslenme",
          "Diyet",
          "Kilo Yönetimi",
          "Sporcu Beslenmesi",
          "Gebelikte Beslenme",
          "Hastalıklarda Beslenme Tedavisi",
        ],
      },
      {
        "@type": "Person",
        "@id": ID.person,
        name: SITE.personShort,
        honorificPrefix: "Dyt.",
        jobTitle: "Diyetisyen",
        url: `${SITE.url}/#hakkimda`,
        image: `${SITE.url}${SITE.defaultImage}`,
        worksFor: { "@id": ID.business },
        alumniOf: {
          "@type": "CollegeOrUniversity",
          name: "Kırklareli Üniversitesi",
          department: "Beslenme ve Diyetetik Bölümü",
        },
        knowsLanguage: "tr",
        sameAs: [...SITE.social],
      },
      {
        "@type": "WebSite",
        "@id": ID.website,
        url: SITE.url,
        name: SITE.name,
        inLanguage: "tr-TR",
        publisher: { "@id": ID.business },
      },
    ],
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE.url}${item.path}`,
    })),
  };
}

export function faqPageSchema(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: stripHtml(f.answer) },
    })),
  };
}

interface ArticleInput {
  title: string;
  description: string;
  slug: string;
  image?: string;
  publishedAt?: string;
  updatedAt?: string;
  tags?: string[];
  wordCount?: number;
}

export function articleSchema(post: ArticleInput) {
  const url = `${SITE.url}/blog/${post.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title.slice(0, 110),
    description: post.description,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    image: post.image
      ? [post.image.startsWith("http") ? post.image : `${SITE.url}${post.image}`]
      : [`${SITE.url}${SITE.defaultImage}`],
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    author: { "@id": ID.person },
    publisher: { "@id": ID.business },
    inLanguage: "tr-TR",
    ...(post.tags?.length ? { keywords: post.tags.join(", ") } : {}),
    ...(post.wordCount ? { wordCount: post.wordCount } : {}),
  };
}

/** HTML gövdesinden düz metin — JSON-LD alanlarında etiket bulunmamalı. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Meta açıklaması için metni kelime sınırından kırpar. */
export function truncate(text: string, max = 155): string {
  const clean = stripHtml(text);
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(" ")).trimEnd() + "…";
}
