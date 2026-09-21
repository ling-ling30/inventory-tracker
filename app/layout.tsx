import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GA Inventory',
  description: 'General Affairs inventory and asset handover tracking',
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
