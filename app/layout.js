import './globals.css';

export const metadata = {
  title: 'Avatar Builder - Chubflix',
  description: 'Generate character images using Stable Diffusion',
  themeColor: '#141414',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Avatar Builder',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
