import type { Metadata } from "next";
import Script from "next/script";
import localFont from "next/font/local";
import GsapProvider from "@/providers/GsapProvider";
import AppointmentModal from "@/components/AppointmentModal";
import "./globals.css";

const nexa = localFont({
  variable: "--font-nexa",
  src: [
    { path: "../../public/font/NexaThin.otf",    weight: "100", style: "normal" },
    { path: "../../public/font/NexaLight.otf",   weight: "300", style: "normal" },
    { path: "../../public/font/NexaRegular.otf", weight: "400", style: "normal" },
    { path: "../../public/font/NexaBold.otf",    weight: "700", style: "normal" },
    { path: "../../public/font/NexaBlack.otf",   weight: "900", style: "normal" },
  ],
});

const GA_ID = "G-JKSWXYLYTP";

export const metadata: Metadata = {
  title: {
    default: "Trakya Diyetisyeni | Beyza Şule Kahraman",
    template: "%s | Beyza Şule Kahraman",
  },
  description:
    "Lüleburgaz ve Trakya bölgesinin uzman diyetisyeni Beyza Şule Kahraman ile kişiye özel diyet programları ve sağlıklı beslenme danışmanlığı.",
  metadataBase: new URL("https://trakyadyt.com"),
  alternates: { canonical: "/" },
  icons: { icon: "/favicon.svg" },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: "https://trakyadyt.com",
    siteName: "Trakya Diyetisyeni Beyza Şule Kahraman",
    title: "Trakya Diyetisyeni | Beyza Şule Kahraman",
    description:
      "Lüleburgaz ve Trakya bölgesinin uzman diyetisyeni Beyza Şule Kahraman ile kişiye özel diyet programları ve sağlıklı beslenme danışmanlığı.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Trakya Diyetisyeni | Beyza Şule Kahraman",
    description:
      "Lüleburgaz ve Trakya bölgesinin uzman diyetisyeni Beyza Şule Kahraman ile kişiye özel diyet programları ve sağlıklı beslenme danışmanlığı.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              "name": "Diyetisyen Beyza Şule Kahraman",
              "description": "Lüleburgaz ve Trakya bölgesinin uzman diyetisyeni. Kişiye özel diyet programları ve sağlıklı beslenme danışmanlığı.",
              "url": "https://trakyadyt.com",
              "telephone": "+90-542-689-80-44",
              "address": {
                "@type": "PostalAddress",
                "addressLocality": "Lüleburgaz",
                "addressRegion": "Kırklareli",
                "addressCountry": "TR"
              },
              "areaServed": [
                { "@type": "City", "name": "Lüleburgaz" },
                { "@type": "City", "name": "Kırklareli" },
                { "@type": "AdministrativeArea", "name": "Trakya" }
              ],
              "priceRange": "$$",
              "knowsAbout": ["Beslenme", "Diyet", "Kilo Yönetimi", "Sağlıklı Beslenme"]
            }),
          }}
        />
        {/* Preconnect for external origins */}
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.google-analytics.com" />
        <link rel="preconnect" href="https://maps.google.com" />
        <link rel="dns-prefetch" href="https://maps.gstatic.com" />
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}
        </Script>
      </head>
      <body className={`${nexa.variable} antialiased`}>
        <GsapProvider>{children}</GsapProvider>
        <AppointmentModal />
      </body>
    </html>
  );
}

