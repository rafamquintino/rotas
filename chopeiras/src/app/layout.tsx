import type { Metadata, Viewport } from 'next';
import { Archivo } from 'next/font/google';
import './globals.css';
import { RegistrarSW } from '@/components/RegistrarSW';

const archivo = Archivo({ subsets: ['latin'], variable: '--fonte', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Chopeiras – Cervejaria Gonçalves', template: '%s · Chopeiras' },
  description: 'Controle de estoque, assepsia e manutenção de chopeiras',
  applicationName: 'Chopeiras Gonçalves',
  appleWebApp: { capable: true, title: 'Chopeiras', statusBarStyle: 'black-translucent' },
  icons: { icon: '/icons/icon.svg', apple: '/icons/icon-192.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#3B2000' },
    { media: '(prefers-color-scheme: dark)', color: '#140f0a' },
  ],
};

// Aplica o tema antes de pintar (evita flash). Padrão: segue o sistema.
const temaScript = `try{var t=localStorage.getItem('tema');if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={archivo.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: temaScript }} />
      </head>
      <body className="font-sans">
        {children}
        <RegistrarSW />
      </body>
    </html>
  );
}
