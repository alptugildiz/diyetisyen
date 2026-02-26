import type { Metadata } from "next";
import { Geist } from "next/font/google";
import GsapProvider from "@/providers/GsapProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
      <body className={`${geistSans.variable} antialiased`}>
        <GsapProvider>{children}</GsapProvider>
      </body>
    </html>
  );
}
