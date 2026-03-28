import { Analytics } from '@vercel/analytics/next';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { Toaster } from 'sonner';
import { CommandPalette } from '@/components/command-palette';
import { ThemeProvider } from '@/components/theme-provider';
import { ensureSchedulerLoaded } from '@/lib/historify/scheduler';
import './globals.css';
import Sidebar from './components/Sidebar';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Sensibull Trading Dashboard',
  description: 'AI-driven R-Factor trading and analytics',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await ensureSchedulerLoaded();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <NuqsAdapter>
            <div className="flex min-h-screen">
              <Sidebar />
              <main className="flex-1 overflow-auto">{children}</main>
            </div>
            <CommandPalette />
            <Toaster theme="dark" richColors position="top-right" />
          </NuqsAdapter>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
