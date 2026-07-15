'use client';

import { useState } from 'react';

export default function PricingCalculator() {
  const [totalCost, setTotalCost] = useState('');
  const [desiredMargin, setDesiredMargin] = useState('50');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3001/api/ai/calculate-price', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          totalCost: parseFloat(totalCost),
          desiredMargin: parseFloat(desiredMargin),
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Calculation failed');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h2 className="text-2xl font-bold mb-4">AI Pricing Calculator</h2>
        <p className="text-muted mb-8">Enter your costs and desired margin to get an AI-recommended consumer-friendly price.</p>

        <form onSubmit={handleCalculate}>
          <div className="input-group">
            <label>Total Production Cost ($)</label>
            <input 
              type="number" 
              step="0.01" 
              className="input" 
              value={totalCost} 
              onChange={e => setTotalCost(e.target.value)} 
              required 
            />
          </div>
          
          <div className="input-group">
            <label>Desired Profit Margin (%)</label>
            <input 
              type="number" 
              className="input" 
              value={desiredMargin} 
              onChange={e => setDesiredMargin(e.target.value)} 
              required 
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={isLoading}>
            {isLoading ? 'Calculating...' : 'Get AI Recommended Price'}
          </button>
        </form>

        {error && (
          <div className="mt-4" style={{ color: 'var(--danger)', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem' }}>
            {error}
          </div>
        )}

        {result && (
          <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '0.5rem', border: '1px solid var(--success)' }}>
            <h3 className="text-2xl font-bold" style={{ color: 'var(--success)', marginBottom: '0.5rem' }}>
              ${result.recommendedPrice.toFixed(2)}
            </h3>
            <p style={{ color: 'var(--text)' }}>{result.explanation}</p>
          </div>
        )}
      </div>
    </div>
  );
}
