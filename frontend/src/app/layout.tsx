import type { Metadata } from "next";
import Script from "next/script";
import localFont from "next/font/local";
import GsapProvider from "@/providers/GsapProvider";
import AppointmentModal from "@/components/AppointmentModal";
import JsonLd from "@/components/JsonLd";
import { SITE, siteGraph } from "@/lib/seo";
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

const HOME_TITLE = "Lüleburgaz Diyetisyen | Dyt. Beyza Şule Kahraman";
const HOME_DESCRIPTION =
  "Lüleburgaz ve Kırklareli'de kişiye özel diyet programları. Dyt. Beyza Şule Kahraman ile kilo verme, sporcu ve hastalıklara özel beslenme danışmanlığı.";

export const metadata: Metadata = {
  title: {
    default: HOME_TITLE,
    template: "%s | Beyza Şule Kahraman",
  },
  description: HOME_DESCRIPTION,
  metadataBase: new URL(SITE.url),
  alternates: { canonical: "/" },
  icons: { icon: "/favicon.svg" },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: SITE.url,
    siteName: SITE.name,
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [{ url: SITE.defaultImage, alt: SITE.person }],
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [SITE.defaultImage],
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
        <JsonLd data={siteGraph()} />
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

