import './globals.css';
import type { Metadata } from 'next';

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
