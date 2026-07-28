import './globals.css';

export const metadata = {
  title: 'Kalkulator Proteksi Pembangkit',
  description: 'Kalkulator setting proteksi trafo, generator, motor, busbar, feeder, dan kabel untuk unit pembangkit.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Sans+Condensed:wght@500;600&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
