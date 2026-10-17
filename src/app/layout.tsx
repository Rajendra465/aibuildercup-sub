import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { SiteNav } from "@/components/site-nav";
import { Aurora } from "@/components/fx/aurora";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
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
      <body className={`${inter.variable} ${display.variable} min-h-screen font-sans antialiased text-foreground`}>
        <Aurora />
        <SiteNav />
        {children}
      </body>
    </html>
  );
}
