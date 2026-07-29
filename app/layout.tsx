import './globals.css';
import type { Metadata } from 'next';
import { Providers } from './components/Providers';

export const metadata: Metadata = {
  title: 'Dessert Pricing App',
  description: 'Manage your bakery business and calculate optimal prices',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
        <script dangerouslySetInnerHTML={{
          __html: `
            tailwind.config = {
              darkMode: 'class',
              theme: {
                extend: {
                  colors: {
                    primary: 'var(--primary)'
                  }
                }
              }
            }
          `
        }}></script>
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
