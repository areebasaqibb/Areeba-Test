'use client';

import { useState, useEffect, useContext } from 'react';
import { Sparkles, TrendingUp, DollarSign, Users, Award, Clock, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { BusinessContext } from '../layout';

export default function InsightsPage() {
  const { business } = useContext(BusinessContext);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3001/api/insights', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center"><div className="animate-spin inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div></div>;
  if (!data) return <div className="p-8 text-center text-red-500">Failed to load insights</div>;

  const { trends, bestSellers, trendingFlavors, marginHealth, customerInsights, aiRecommendation } = data;
  const currency = business?.currencySymbol || '$';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <TrendingUp className="text-primary" />
          Business Insights
        </h1>
      </div>

      {/* AI Recommendations Banner */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-xl p-6 flex items-start gap-4">
        <div className="bg-primary/20 p-3 rounded-full shrink-0">
          <Sparkles className="text-primary w-6 h-6" />
        </div>
        <div>
          <h2 className="font-bold text-lg text-slate-800 mb-1">AI Bakery Manager</h2>
          <p className="text-slate-600">{aiRecommendation}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Revenue & Orders Trend */}
        <div className="card md:col-span-2 shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-700">
            <TrendingUp size={20} className="text-slate-400" />
            Revenue & Orders Trend
          </h2>
          {trends.length < 2 ? (
             <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
               <TrendingUp className="mx-auto mb-2 opacity-50" size={32} />
               <p>Add orders over multiple weeks to see your revenue trends here.</p>
             </div>
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="week" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${currency}${v}`} />
                  <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line yAxisId="right" type="monotone" dataKey="orders" name="Orders" stroke="var(--secondary)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Best Sellers */}
        <div className="card shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-700">
            <Award size={20} className="text-slate-400" />
            Best Sellers (Items)
          </h2>
          {bestSellers.length === 0 ? (
            <div className="py-8 text-center text-slate-500">No orders yet to determine best sellers.</div>
          ) : (
            <div className="space-y-3">
              {bestSellers.slice(0, 5).map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-400 w-4">{i + 1}.</span>
                    <span className="font-medium text-slate-700">{item.name}</span>
                  </div>
                  <span className="font-bold text-primary">{item.units} sold</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Trending Flavors */}
        <div className="card shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-700">
            <Sparkles size={20} className="text-slate-400" />
            Trending Flavors
          </h2>
          {(!trendingFlavors || trendingFlavors.length === 0) ? (
            <div className="py-8 text-center text-slate-500">Add flavors to your orders to see trends.</div>
          ) : (
            <div className="space-y-3">
              {trendingFlavors.slice(0, 5).map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-400 w-4">{i + 1}.</span>
                    <span className="font-medium text-slate-700">{item.name}</span>
                  </div>
                  <span className="font-bold text-primary">{item.units} sold</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Margin Health */}
        <div className="card shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-700">
            <DollarSign size={20} className="text-slate-400" />
            Margin Health
          </h2>
          {marginHealth.length === 0 ? (
            <div className="py-8 text-center text-slate-500">Not enough pricing data from orders.</div>
          ) : (
            <div className="space-y-3">
              {marginHealth.slice(0, 5).map((m: any, i: number) => {
                const isHealthy = m.actualMargin >= m.targetMargin;
                return (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="font-medium text-slate-700 truncate mr-2">{m.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-slate-400">Target: {m.targetMargin}%</span>
                      <span className={`font-bold px-2 py-1 rounded-full text-xs ${isHealthy ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {m.actualMargin.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Customer Insights */}
        <div className="card shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-700">
            <Users size={20} className="text-slate-400" />
            Customer Insights
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg text-center">
              <div className="text-3xl font-bold text-primary mb-1">
                {customerInsights.repeatRate.toFixed(0)}%
              </div>
              <div className="text-sm text-slate-500 font-medium">Repeat Rate</div>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg text-center flex flex-col justify-center">
              {customerInsights.topCustomer ? (
                <>
                  <div className="text-sm font-bold text-slate-700 truncate">{customerInsights.topCustomer.name}</div>
                  <div className="text-sm text-slate-500">Top Spender ({currency}{customerInsights.topCustomer.spend.toFixed(2)})</div>
                </>
              ) : (
                <div className="text-sm text-slate-500">No top customer yet</div>
              )}
            </div>
          </div>
        </div>

        {/* Ingredient Cost Watch (Coming Soon) */}
        <div className="card shadow-sm border border-slate-100 opacity-70">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-700">
            <AlertCircle size={20} className="text-slate-400" />
            Ingredient Cost Watch
          </h2>
          <div className="py-8 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
            <Clock className="mx-auto mb-2 text-slate-400" size={24} />
            <p className="text-slate-500 font-medium">Price tracking coming soon</p>
            <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto">We'll notify you here when your ingredient costs increase over time.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
