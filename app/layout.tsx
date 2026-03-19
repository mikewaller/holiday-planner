import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700", "900"],
  style: ["normal", "italic"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Hatch a Plan",
  description: "Find dates that work for everyone. Share a link. No fuss.",
  openGraph: {
    title: "Hatch a Plan",
    description: "Find dates that work for everyone. Share a link. No fuss.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hatch a Plan",
    description: "Find dates that work for everyone. Share a link. No fuss.",
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${nunito.variable} antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
