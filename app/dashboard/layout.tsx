'use client';

import { useEffect, useState, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { LayoutDashboard, Store, Box, Cherry, BookOpen, Settings, LogOut, Menu, X, Check, Heart, Users, BarChart3, Globe, Sparkles, Database, Sun, Moon, Palette } from 'lucide-react';
import BrandThemeProvider from '../components/BrandThemeProvider';

export const BusinessContext = createContext<any>(null);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [business, setBusiness] = useState<any>(null);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }

    // Fetch business profile to provide context
    fetch('http://localhost:3001/api/business', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.business) {
          setBusiness(data.business);
        }
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, [router, pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  const navSections: { title: string, items: { label: string, icon: any, href: string, disabled?: boolean }[] }[] = [
    {
      title: 'Insights',
      items: [
        { label: 'Overview', icon: LayoutDashboard, href: '/dashboard' },
        { label: 'Magic Pricing', icon: Sparkles, href: '/dashboard/pricing' },
        { label: 'Insights', icon: BarChart3, href: '/dashboard/reports' },
      ]
    },
    {
      title: 'Operations',
      items: [
        { label: 'Sweet Ingredients', icon: Database, href: '/dashboard/ingredients' },
        { label: 'My Recipes', icon: BookOpen, href: '/dashboard/recipes' },
        { label: 'Pantry', icon: Box, href: '/dashboard/pantry' },
        { label: 'My Menu', icon: Store, href: '/dashboard/products' },
      ]
    },
    {
      title: 'Sales',
      items: [
        { label: 'Sweet Orders', icon: Heart, href: '/dashboard/orders' },
        { label: 'Happy Customers', icon: Users, href: '/dashboard/customers' },
      ]
    },
    {
      title: 'Settings',
      items: [
        { label: 'My Website', icon: Globe, href: '/dashboard/website' },
        { label: 'Settings', icon: Settings, href: '/dashboard/settings' },
        { label: 'Brand Theme', icon: Palette, href: '/dashboard/settings/theme' },
      ]
    }
  ];

  if (isLoading) return (
    <div className="container-center">
      <div className="animate-spin"><Loader className="w-8 h-8 text-primary" /></div>
    </div>
  );

  return (
    <BusinessContext.Provider value={{ business, setBusiness }}>
      <BrandThemeProvider activeTheme={business?.activeTheme} />
      <div className="app-layout">
        {/* Sidebar */}
        <aside className={`sidebar ${!isSidebarOpen ? 'collapsed' : ''}`}>
          <div style={{ padding: '2rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Heart className="text-primary" fill="currentColor" /> 
              <span>Bakery OS</span>
            </h1>
            <button className="btn btn-ghost btn-icon" onClick={() => setIsSidebarOpen(false)} style={{ display: 'md:none' }}>
              <X size={20} />
            </button>
          </div>
          
          <nav style={{ padding: '1rem 0', flex: 1, overflowY: 'auto' }}>
            
            {business && (
              <div className="px-6 mb-8 flex flex-col items-center">
                {business.logo ? (
                  <div className="shrink-0 rounded-full border border-primary/20 bg-white flex items-center justify-center overflow-hidden mb-3 shadow-sm" style={{ width: '200px', height: '200px' }}>
                    <img src={business.logo} alt="Business Logo" className="w-full h-full object-cover object-center" />
                  </div>
                ) : (
                  <div className="shrink-0 rounded-full border border-primary/20 bg-primary flex items-center justify-center text-white font-bold text-2xl shadow-sm mb-3" style={{ width: '200px', height: '200px' }}>
                    {business.name?.substring(0, 2).toUpperCase() || 'B'}
                  </div>
                )}
                <div className="text-center">
                  <h3 className="font-bold text-slate-800 leading-tight">{business.name}</h3>
                </div>
              </div>
            )}

            {navSections.map(section => (
              <div key={section.title} className="mb-6">
                <div className="px-6 mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  {section.title}
                </div>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link 
                      key={item.href} 
                      href={item.disabled ? '#' : item.href}
                      className={`nav-item ${isActive ? 'active' : ''}`}
                      style={{ opacity: item.disabled ? 0.5 : 1, cursor: item.disabled ? 'not-allowed' : 'pointer' }}
                      onClick={e => item.disabled && e.preventDefault()}
                    >
                      <Icon size={20} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
            <button onClick={handleLogout} className="btn btn-ghost w-full" style={{ justifyContent: 'flex-start', color: 'var(--danger)' }}>
              <LogOut size={20} style={{ marginRight: '0.75rem' }} />
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className={`main-content ${!isSidebarOpen ? 'expanded' : ''}`}>
          <header className="topbar">
            <button className="btn btn-ghost btn-icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={{ marginRight: '1rem' }}>
              <Menu size={24} />
            </button>
            <div style={{ flex: 1 }}></div>
            <div className="flex items-center gap-4">
              <button 
                className="btn btn-ghost btn-icon" 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              {business && (
                <div className="text-sm text-muted">
                  {business.name} &bull; {business.currency}
                </div>
              )}
            </div>
          </header>
          
          <div className="content-container">
            {children}
          </div>
        </div>
      </div>
    </BusinessContext.Provider>
  );
}

// Quick loader component since I used it above
function Loader(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
