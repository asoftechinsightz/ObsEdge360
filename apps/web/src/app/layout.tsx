import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OpsEdge360 — Enterprise Observability Platform',
  description: 'Standalone IT, OT, cloud, and business observability with AI-assisted operations',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
