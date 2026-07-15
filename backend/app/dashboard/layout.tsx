'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
    } else {
      setIsLoading(false);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  if (isLoading) return <div className="container">Loading...</div>;

  return (
    <div>
      <nav style={{ background: 'rgba(30, 41, 59, 0.9)', borderBottom: '1px solid var(--border)', padding: '1rem 2rem' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 0 }}>
          <div className="font-bold text-2xl">Bakery OS</div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" style={{ color: pathname === '/dashboard' ? 'var(--primary)' : 'var(--text-muted)' }}>Overview</Link>
            <Link href="/dashboard/pricing" style={{ color: pathname === '/dashboard/pricing' ? 'var(--primary)' : 'var(--text-muted)' }}>AI Pricing</Link>
            <button onClick={handleLogout} className="btn" style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)' }}>
              Logout
            </button>
          </div>
        </div>
      </nav>
      <main>
        {children}
      </main>
    </div>
  );
}
