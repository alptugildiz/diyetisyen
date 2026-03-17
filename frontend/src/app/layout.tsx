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
    default: "Diyetisyen | Beyza Şule Kahraman",
    template: "%s | Beyza Şule Kahraman",
  },
  description:
    "Uzman diyetisyen danışmanlığı, kişiye özel diyet programları ve sağlıklı beslenme rehberliği.",
  metadataBase: new URL("https://trakyadyt.com"),
  alternates: { canonical: "/" },
  icons: { icon: "/favicon.svg" },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: "https://trakyadyt.com",
    siteName: "Diyetisyen Beyza Şule Kahraman",
    title: "Diyetisyen | Beyza Şule Kahraman",
    description:
      "Uzman diyetisyen danışmanlığı, kişiye özel diyet programları ve sağlıklı beslenme rehberliği.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Diyetisyen | Beyza Şule Kahraman",
    description:
      "Uzman diyetisyen danışmanlığı, kişiye özel diyet programları ve sağlıklı beslenme rehberliği.",
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
