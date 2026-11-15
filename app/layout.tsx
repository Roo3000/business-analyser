import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Business Analyser",
  description:
    "Sales & e-commerce revenue analyser with cost, profit, margins, and projections. Upload CSV/Excel and get instant insights.",
  openGraph: {
    title: "Business Analyser",
    description:
      "Sales & e-commerce revenue analyser with cost, profit, margins, and projections.",
    url: "https://business-analyser-eight.vercel.app",
    siteName: "Business Analyser",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Business Analyser",
    description:
      "Sales & e-commerce revenue analyser with cost, profit, margins, and projections.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
