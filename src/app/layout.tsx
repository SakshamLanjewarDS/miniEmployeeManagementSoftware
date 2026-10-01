import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#5A81FA",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "100% DESIGN Studio — Project & Employee Management OS",
  description: "Enterprise architectural employee, project, drawings, and site visit management platform",
  applicationName: "100% DESIGN Studio OS",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "100% DESIGN Studio",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
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
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body suppressHydrationWarning className="antialiased min-h-screen selection:bg-[#5A81FA] selection:text-white">
        {children}
      </body>
    </html>
  );
}
