import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LayoutContent } from "@/components/shared/LayoutContent";
import PWAProvider from "@/components/shared/PWAProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: 'OnTurn - Sistema de Reservas y Turnos Online',
    template: '%s | OnTurn'
  },
  description: 'Plataforma líder para gestión de reservas y turnos online. Conecta con servicios de calidad en tiempo real.',
  keywords: ['reservas', 'turnos', 'citas online', 'appointments', 'gestión de reservas', 'agenda online', 'turnos online'],
  authors: [{ name: 'OnTurn Team' }],
  creator: 'OnTurn',
  publisher: 'OnTurn',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://onturn.app'),
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: '/',
    siteName: 'OnTurn',
    title: 'OnTurn - Sistema de Reservas y Turnos Online',
    description: 'Plataforma líder para gestión de reservas y turnos online. Conecta con servicios de calidad en tiempo real.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'OnTurn - Sistema de Reservas',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OnTurn - Sistema de Reservas y Turnos Online',
    description: 'Plataforma líder para gestión de reservas y turnos online.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.png' },
    ],
  },
  manifest: '/manifest-customer.json',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <PWAProvider>
          <LayoutContent>{children}</LayoutContent>
        </PWAProvider>
      </body>
    </html>
  );
}
