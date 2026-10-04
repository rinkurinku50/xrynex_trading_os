export default function manifest() {
  return {
    id: '/',
    name: 'Xrynex Trading OS',
    short_name: 'Xrynex',
    description: 'A trading workspace to learn, plan, execute, and improve your process.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#0a0e13',
    theme_color: '#0a0e13',
    icons: [
      { src: '/pwa-icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/pwa-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}