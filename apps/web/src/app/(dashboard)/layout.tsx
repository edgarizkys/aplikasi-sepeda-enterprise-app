import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/app/providers';
import { Navbar } from '@/components/layout/navbar';
import { Sidebar } from '@/components/layout/sidebar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Aplikasi Sepeda Enterprise',
  description: 'Enterprise App Management System',
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <style>{`
          :root {
            --accent-from: #6B7280;
            --accent-to: #374151;
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            background-color: #f9fafb;
            color: #111827;
            transition: background-color 0.3s ease;
          }
          
          body.dark {
            background-color: #111827;
            color: #f9fafb;
          }
          
          .gradient-bg {
            background: linear-gradient(135deg, var(--accent-from), var(--accent-to));
          }
          
          .glass {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
          }
          
          .card-hover {
            transition: all 0.3s ease;
          }
          
          .card-hover:hover {
            transform: translateY(-5px);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          }
          
          .fade-in {
            animation: fadeIn 0.3s ease-in;
          }
          
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .spinner {
            border: 3px solid rgba(107, 114, 128, 0.1);
            border-top: 3px solid #6B7280;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            animation: spin 0.8s linear infinite;
          }
          
          @keyframes spin {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
          
          .toast {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
            z-index: 9999;
            animation: slideIn 0.3s ease-out;
          }
          
          @keyframes slideIn {
            from {
              transform: translateX(400px);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          
          .toast.success {
            background-color: #10b981;
            color: white;
          }
          
          .toast.error {
            background-color: #ef4444;
            color: white;
          }
          
          .toast.info {
            background-color: #3b82f6;
            color: white;
          }
          
          .toast.warning {
            background-color: #f59e0b;
            color: white;
          }
          
          .scrollbar-thin::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          
          .scrollbar-thin::-webkit-scrollbar-track {
            background: transparent;
          }
          
          .scrollbar-thin::-webkit-scrollbar-thumb {
            background: #d1d5db;
            border-radius: 3px;
          }
          
          .scrollbar-thin::-webkit-scrollbar-thumb:hover {
            background: #9ca3af;
          }
        `}</style>
      </head>
      <body className={`${inter.className} antialiased`}>
        <Providers>
          <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
              <Navbar />
              <main className="flex-1 overflow-y-auto scrollbar-thin">
                <div className="min-h-full">{children}</div>
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}