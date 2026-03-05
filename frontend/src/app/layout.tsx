import type { Metadata } from "next";
import { Geist, Oswald, Cabin, Hind_Vadodara } from "next/font/google";
import GsapProvider from "@/providers/GsapProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const cabin = Cabin({
  variable: "--font-cabin",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const hindVadodara = Hind_Vadodara({
  variable: "--font-hind-vadodara",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
        className={`${geistSans.variable} ${oswald.variable} ${cabin.variable} ${hindVadodara.variable} antialiased`}
      >
        <GsapProvider>{children}</GsapProvider>
      </body>
    </html>
  );
}
