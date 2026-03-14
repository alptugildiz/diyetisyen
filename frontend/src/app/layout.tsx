import type { Metadata } from "next";
import localFont from "next/font/local";
import GsapProvider from "@/providers/GsapProvider";
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

export const metadata: Metadata = {
  title: "Diyetisyen | Sağlıklı Yaşam",
  description:
    "Uzman diyetisyen danışmanlığı, kişiye özel diyet programları ve sağlıklı beslenme rehberliği.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body
        className={`${nexa.variable} antialiased`}
      >
        <GsapProvider>{children}</GsapProvider>
      </body>
    </html>
  );
}
