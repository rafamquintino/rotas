import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Chopeiras – Cervejaria Gonçalves',
    short_name: 'Chopeiras',
    description: 'Estoque, assepsia e manutenção de chopeiras',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FAF5EC',
    theme_color: '#3B2000',
    lang: 'pt-BR',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Agenda', url: '/agenda' },
      { name: 'Estoque', url: '/chopeiras' },
    ],
  };
}
