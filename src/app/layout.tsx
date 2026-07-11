import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "OZMO Cosméticos y Perfumes | Elegancia que se siente",
  description: "Boutique digital premium de cosméticos y perfumes. Encuentra tu esencia y la elegancia que se siente en OZMO.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "OZMO",
  },
  icons: {
    apple: "/logo.jpg",
  },
  openGraph: {
    title: "OZMO Cosméticos y Perfumes | Elegancia que se siente",
    description: "Boutique digital premium de cosméticos y perfumes. Encuentra tu esencia y la elegancia que se siente en OZMO.",
    url: "https://ozmo-cosmeticos.vercel.app",
    siteName: "OZMO Cosméticos y Perfumes",
    images: [
      {
        url: "https://ozmo-cosmeticos.vercel.app/logo.jpg",
        width: 800,
        height: 800,
        alt: "OZMO Cosméticos y Perfumes - Logo",
      },
    ],
    locale: "es_MX",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "OZMO Cosméticos y Perfumes | Elegancia que se siente",
    description: "Boutique digital premium de cosméticos y perfumes. Encuentra tu esencia y la elegancia que se siente en OZMO.",
    images: ["https://ozmo-cosmeticos.vercel.app/logo.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${playfair.variable} ${inter.variable} h-full antialiased dark-theme`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    console.log('SW registered:', reg.scope);
                  }).catch(function(err) {
                    console.error('SW registration failed:', err);
                  });
                });
              }
            `
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
