import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import AgentationWrapper from "@/components/AgentationWrapper";

const siteUrl = "https://athlete-mindai-udbt.onrender.com";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AthleteMind — Clinical Rehabilitation & AI Biomechanics Coach",
    template: "%s | AthleteMind",
  },
  description:
    "Train smarter with AthleteMind, an AI-powered biomechanics platform for real-time exercise form tracking, clinical physical therapy, and performance insights.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "AthleteMind",
    title: "AthleteMind | AI-Powered Biomechanics Coach & Clinical Portal",
    description:
      "Real-time exercise form tracking, movement analysis, and clinical physical therapy powered by AI.",
    images: [
      {
        url: "/main-menu-bg.jpg",
        alt: "AthleteMind biomechanics training interface",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AthleteMind | AI-Powered Biomechanics Coach & Clinical Portal",
    description:
      "Real-time exercise form tracking, movement analysis, and clinical physical therapy powered by AI.",
    images: ["/main-menu-bg.jpg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
        <AgentationWrapper />
      </body>
    </html>
  );
}
