export default function manifest() {
  return {
    name: 'Avatar Builder - Chubflix',
    short_name: 'Avatar Builder',
    description: 'Generate character images using Stable Diffusion',
    start_url: '/?v=' + Date.now(), // Cache busting
    display: 'standalone',
    background_color: '#141414',
    theme_color: '#141414',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
    categories: ['productivity', 'utilities'],
    shortcuts: [
      {
        name: 'Generate Image',
        short_name: 'Generate',
        description: 'Start generating a new image',
        url: '/',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
    ],
  };
}
