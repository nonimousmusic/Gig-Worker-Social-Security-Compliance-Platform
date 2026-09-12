import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GigCessHQ — Gig Worker Social Security Compliance Platform",
  description:
    "Track worker registration, calculate day-count eligibility, manage Form-XX/XXI filings, and never miss a statutory deadline. Built for Indian aggregators under the Code on Social Security, 2020.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-surface text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
