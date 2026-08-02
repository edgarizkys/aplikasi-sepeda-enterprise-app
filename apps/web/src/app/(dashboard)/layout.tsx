import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/app/providers';
import { Navbar } from '@/components/navbar';
import { Sidebar } from '@/components/sidebar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Aplikasi Sepeda Enterprise',
  description: 'Manajemen armada sepeda perusahaan dengan tracking peminjaman dan maintenance',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>
        <Providers>
          <div className="flex h-screen overflow-hidden bg-gray-100">
            <Sidebar />
            
            <div className="flex-1 flex flex-col overflow-hidden">
              <Navbar />
              
              <main className="flex-1 overflow-y-auto">
                <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
                  {children}
                </div>
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}