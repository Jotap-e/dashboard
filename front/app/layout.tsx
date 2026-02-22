import type { Metadata } from 'next';
import './globals.css';
import { AppLayout } from '@/components/layout/app-layout';

export const metadata: Metadata = {
  title: 'AdvHub Dashboard',
  description: 'AdvHub AI Dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-[#1A1A1A] text-white font-sans" style={{ fontFamily: "'Poppins', sans-serif" }}>
        <AppLayout>
          {children}
        </AppLayout>
      </body>
    </html>
  );
}
