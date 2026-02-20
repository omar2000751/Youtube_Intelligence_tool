import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'YouTube Intelligence Tool',
  description: 'Find trending video opportunities before they peak',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        {children}
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              background: 'hsl(222.2 84% 7%)',
              border: '1px solid hsl(217.2 32.6% 17.5%)',
              color: 'hsl(210 40% 98%)',
            },
          }}
        />
      </body>
    </html>
  );
}
