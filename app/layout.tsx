import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Proofline — evidence before approval",
  description: "Review brand content against approved evidence, resolve findings and release a traceable version. Built by Hail Mary.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
