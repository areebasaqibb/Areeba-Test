'use client';

import { useEffect, useState, useContext } from 'react';
import { Package, ShoppingCart, DollarSign, TrendingUp, Sparkles, X, Palette } from 'lucide-react';
import Link from 'next/link';
import { BusinessContext } from './layout';
import { formatCurrency } from '../lib/utils';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { business, setBusiness } = useContext(BusinessContext);
  const [stats, setStats] = useState({ ingredients: 0, products: 0, recipes: 0, orders: 0, revenue: 0, profit: 0, customers: 0 });
  const [newBusinessName, setNewBusinessName] = useState('');
  const [advisorInsights, setAdvisorInsights] = useState<any>(null);
  const [isLoadingAdvisor, setIsLoadingAdvisor] = useState(false);
  const [showThemeBanner, setShowThemeBanner] = useState(false);

  useEffect(() => {
    if (!business) return;
    
    // Check onboarding theme banner
    if (!localStorage.getItem('hasDismissedThemeBanner')) {
      setShowThemeBanner(true);
    }
    
    const loadData = async () => {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      try {
        const [iRes, pRes, rRes, oRes, cRes] = await Promise.all([
          fetch('http://localhost:3001/api/ingredients', { headers }).then(r => r.json()),
          fetch('http://localhost:3001/api/products', { headers }).then(r => r.json()),
          fetch('http://localhost:3001/api/recipes', { headers }).then(r => r.json()),
          fetch('http://localhost:3001/api/orders', { headers }).then(r => r.json()),
          fetch('http://localhost:3001/api/customers', { headers }).then(r => r.json())
        ]);
        
        const totalRevenue = oRes.filter((o: any) => o.paymentStatus !== 'Pending').reduce((acc: number, o: any) => acc + (o.total || 0), 0);
        
        let totalProfit = 0;
        oRes.forEach((o: any) => {
          if (o.paymentStatus === 'Pending') return;
          let cost = 0;
          o.items?.forEach((item: any) => {
            if (item.recipeId) {
               const r = rRes.find((x: any) => x.id === item.recipeId);
               if (r) cost += (r.totalCost || 0) * item.quantity;
            } else if (item.productId) {
               const p = pRes.find((x: any) => x.id === item.productId);
               if (p) {
                 if (item.flavors && item.flavors.length > 0) {
                   // Calculate based on exact flavors selected
                   item.flavors.forEach((f: any) => {
                     // Since GET /api/orders returns nested flavors: { flavor: { ... } }
                     // But if it's the client side structure, we might need to find it in `p`. 
                     // Wait, GET /api/orders now returns: `flavors: [{ flavor: { productionCost: ... }, quantity: ... }]`
                     const flavorCost = f.flavor?.productionCost || 0;
                     cost += flavorCost * f.quantity;
                   });
                 } else if (p.flavors && p.flavors.length > 0) {
                   // Fallback for old orders: assume first flavor
                   cost += (p.flavors[0].productionCost || 0) * item.quantity;
                 }
               }
            }
          });
          // Profit is now calculated using subtotal to exclude delivery fees
          totalProfit += ((o.subtotal || 0) - cost);
        });

        setStats({
          ingredients: iRes.length,
          products: pRes.length,
          recipes: rRes.length,
          orders: oRes.length,
          revenue: totalRevenue,
          profit: totalProfit,
          customers: cRes.length
        });
      } catch (err) {
        console.error(err);
      }
    };

    const loadAdvisor = async () => {
      setIsLoadingAdvisor(true);
      const token = localStorage.getItem('token');
      try {
        const res = await fetch('http://localhost:3001/api/ai/advisor', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAdvisorInsights(data);
        }
      } catch (error) {
        console.error("Failed to load advisor insights");
      } finally {
        setIsLoadingAdvisor(false);
      }
    };
    
    loadData();
    loadAdvisor();
  }, [business]);

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:3001/api/business', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newBusinessName })
      });
      if (!res.ok) throw new Error('Failed to create');
      const data = await res.json();
      setBusiness(data);
      toast.success('Business profile created!');
    } catch (error) {
      toast.error('Could not create business profile');
    }
  };

  if (!business) {
    return (
      <div className="card" style={{ maxWidth: '500px', margin: '4rem auto' }}>
        <h2 className="text-2xl font-bold mb-4">Welcome to Bakery OS!</h2>
        <p className="text-muted mb-6">Let's start by creating your business profile.</p>
        <form onSubmit={handleCreateBusiness}>
          <div className="input-group">
            <label>Business Name</label>
            <input 
              type="text" 
              className="input" 
              value={newBusinessName} 
              onChange={e => setNewBusinessName(e.target.value)} 
              placeholder="e.g. Areeba's Sweet Treats"
              required 
            />
          </div>
          <button type="submit" className="btn btn-primary w-full">Create Business</button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Overview</h1>
          <p className="text-muted mt-2">Welcome back to {business.name}. Here's what's happening today.</p>
        </div>
      </div>

      {showThemeBanner && (
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 mb-8 flex items-center justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-primary shadow-sm">
              <Palette size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">🎨 Make this yours</h3>
              <p className="text-slate-600 text-sm">Upload your logo to automatically theme your dashboard.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 relative z-10">
            <Link href="/dashboard/settings/theme" className="btn bg-primary text-white font-bold hover:bg-primary-hover px-5">
              Theme Dashboard
            </Link>
            <button 
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
              onClick={() => {
                localStorage.setItem('hasDismissedThemeBanner', 'true');
                setShowThemeBanner(false);
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {isLoadingAdvisor ? (
        <div className="card mb-8 p-6 text-center">
          <div className="animate-spin inline-block mb-4"><TrendingUp size={24} className="text-primary" /></div>
          <p className="text-muted">AI Co-Founder is analyzing your business and the local market...</p>
        </div>
      ) : advisorInsights ? (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Sparkles className="text-primary" /> AI Co-Founder Insights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card" style={{ borderTop: '4px solid var(--warning)' }}>
              <h3 className="font-bold mb-4 text-warning">Market Alerts</h3>
              <ul className="space-y-3">
                {advisorInsights.marketAlerts?.map((alert: string, i: number) => (
                  <li key={i} className="text-sm text-slate-700 bg-amber-50 p-3 rounded-xl border border-amber-100">{alert}</li>
                ))}
              </ul>
            </div>
            <div className="card" style={{ borderTop: '4px solid var(--primary)' }}>
              <h3 className="font-bold mb-4 text-primary">Financial Targets</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted uppercase tracking-wider mb-1">Est. Startup Cost</p>
                  <p className="font-bold text-xl text-slate-800">{advisorInsights.financialTargets?.estimatedStartupCost}</p>
                </div>
                <div>
                  <p className="text-xs text-muted uppercase tracking-wider mb-1">Recommended Monthly Target</p>
                  <p className="font-bold text-xl text-slate-800">{advisorInsights.financialTargets?.recommendedMonthlyTarget}</p>
                </div>
                <div>
                  <p className="text-xs text-muted uppercase tracking-wider mb-1">Average Profit Margin</p>
                  <p className="font-bold text-xl text-slate-800">{advisorInsights.financialTargets?.averageProfitMargin}</p>
                </div>
              </div>
            </div>
            <div className="card" style={{ borderTop: '4px solid var(--success)' }}>
              <h3 className="font-bold mb-4 text-success">Growth Opportunities</h3>
              <ul className="space-y-3">
                {advisorInsights.growthOpportunities?.map((opp: string, i: number) => (
                  <li key={i} className="text-sm text-slate-700 bg-green-50 p-3 rounded-xl border border-green-100">{opp}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      <h2 className="text-xl font-bold mb-4">Key Metrics</h2>
      {/* TODO: Real trend calculation requires querying historical records with timestamps to compare current week vs previous week. Revisit once there's enough real order history to make "this week" comparisons meaningful. */}
      <div className="kpi-grid">
        <div className="card kpi-card items-start">
          <div className="kpi-icon"><Package size={24} /></div>
          <div>
            <p className="text-sm text-muted font-medium">My Recipes</p>
            <p className="kpi-value">{stats.recipes}</p>
            {stats.recipes === 0 && (
              <div className="mt-2">
                <Link href="/dashboard/recipes" className="text-xs text-primary font-bold hover:underline bg-primary/10 px-2 py-1 rounded-md inline-block">Add first recipe</Link>
              </div>
            )}
          </div>
        </div>

        <div className="card kpi-card items-start">
          <div className="kpi-icon success"><ShoppingCart size={24} /></div>
          <div>
            <p className="text-sm text-muted font-medium">Total Orders</p>
            <p className="kpi-value">{stats.orders}</p>
            {stats.orders === 0 && (
              <div className="mt-2">
                <Link href="/dashboard/orders" className="text-xs text-primary font-bold hover:underline bg-primary/10 px-2 py-1 rounded-md inline-block">Add first order</Link>
              </div>
            )}
          </div>
        </div>

        <div className="card kpi-card items-start">
          <div className="kpi-icon secondary"><TrendingUp size={24} /></div>
          <div>
            <p className="text-sm text-muted font-medium">Total Revenue</p>
            <p className="kpi-value text-primary">{formatCurrency(stats.revenue, business.currency, 'en')}</p>
            {stats.revenue === 0 && (
              <div className="mt-2">
                <Link href="/dashboard/orders" className="text-xs text-primary font-bold hover:underline bg-primary/10 px-2 py-1 rounded-md inline-block">Record a sale</Link>
              </div>
            )}
          </div>
        </div>

        <div className="card kpi-card items-start">
          <div className="kpi-icon" style={{ backgroundColor: 'var(--success)', color: 'white' }}><DollarSign size={24} /></div>
          <div>
            <p className="text-sm text-muted font-medium">Total Profit</p>
            <p className="kpi-value text-success">{formatCurrency(stats.profit, business.currency, 'en')}</p>
          </div>
        </div>

        <div className="card kpi-card items-start">
          <div className="kpi-icon warning"><DollarSign size={24} /></div>
          <div>
            <p className="text-sm text-muted font-medium">Happy Customers</p>
            <p className="kpi-value">{stats.customers}</p>
            {stats.customers === 0 && (
              <div className="mt-2">
                <Link href="/dashboard/customers" className="text-xs text-primary font-bold hover:underline bg-primary/10 px-2 py-1 rounded-md inline-block">Add customer</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
