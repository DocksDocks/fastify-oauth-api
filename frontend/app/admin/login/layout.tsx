import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login - Admin Panel',
  description: 'Admin panel login',
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      {children}
    </div>
  );
}
