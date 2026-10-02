import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#0B122B",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "100% DESIGN Studio — Project & Employee Management OS",
  description: "Enterprise architectural employee, project, drawings, and site visit management platform",
  applicationName: "100% DESIGN Studio OS",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Studio OS",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/icons/apple-touch-icon-152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/apple-touch-icon-120.png", sizes: "120x120", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "Studio OS",
    "msapplication-TileColor": "#0B122B",
    "msapplication-TileImage": "/icons/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/apple-touch-icon-152.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/icons/apple-touch-icon-120.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Studio OS" />
        <meta name="msapplication-TileColor" content="#0B122B" />
        <meta name="msapplication-TileImage" content="/icons/icon-192.png" />
      </head>
      <body suppressHydrationWarning className="antialiased min-h-screen selection:bg-[#5A81FA] selection:text-white">
        {children}
      </body>
    </html>
  );
}
