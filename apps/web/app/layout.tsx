import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "VFXVideo Studio", template: "%s · VFXVideo Studio" },
  description: "An open-source art studio for photo, video, VFX and drawing.",
  applicationName: "VFXVideo Studio",
};

export const viewport: Viewport = {
  themeColor: "#141418",
  colorScheme: "dark",
  // Pinch-zoom belongs to the canvas, not the page.
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
