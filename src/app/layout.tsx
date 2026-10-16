import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SiteNav } from "@/components/site-nav";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "InScene — The ad is in the scene.",
    template: "%s · InScene",
  },
  description:
    "InScene renders brand-safe, shoppable product placements directly into film scenes — personalised per viewer with Gemini video-to-video edits, with the director always in control.",
  applicationName: "InScene",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} font-sans antialiased bg-zinc-950 text-slate-50`}
      >
        <SiteNav />
        {children}
      </body>
    </html>
  );
}
