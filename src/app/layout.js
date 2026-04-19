import './globals.css';
import Footer from '@/components/Footer';

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://drishta.in'),
  title: {
    default: 'Drishta | A mirror or a glass.',
    template: '%s | Drishta',
  },
  description:
    'Drishta is a civic accountability platform for India. Track politician promises, report local issues, and stay informed.',
  keywords: ['india politics', 'politician promises', 'civic accountability', 'constituency issues'],
  authors: [{ name: 'Drishta' }],
  creator: 'Drishta',
  publisher: 'Drishta',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://drishta.in',
    siteName: 'Drishta',
    title: 'Drishta — A mirror. A glass.',
    description: 'See what was promised. See what was done.',
    images: [{ url: '/og-default.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@drishta_in',
    creator: '@drishta_in',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="flex flex-col min-h-screen">
        {children}
        <Footer />
      </body>
    </html>
  );
}
