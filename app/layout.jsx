import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import AppSetup from '../components/AppSetup';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-poppins',
});

export const metadata = {
  title: 'Belhotel After Work | Hôtel, Restaurant & Bar',
  description:
    'Belhotel After Work, un complexe hôtelier avec chambres confortables, restaurant savoureux et bar lounge. Réservez directement sur WhatsApp.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'Belhotel', statusBarStyle: 'black-translucent' },
  icons: {
    icon: '/app-icon.jpg',
    apple: '/app-icon.jpg',
  },
};

export const viewport = {
  themeColor: '#ea580c',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={`${inter.variable} ${poppins.variable}`}>
      <body className="bg-white font-sans text-brand-ink antialiased">
        <AppSetup />
        {children}
      </body>
    </html>
  );
}
