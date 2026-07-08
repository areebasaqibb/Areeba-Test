'use client';

import { useState } from 'react';

export default function TestApiPage() {
  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleGetProducts = async () => {
    setStatus('loading');
    try {
      // Calls the /api/products endpoint
      const response = await fetch('/api/products');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const jsonData = await response.json();
      setData(jsonData);
      setStatus('success');
    } catch (error) {
      console.error('Error fetching products:', error);
      setStatus('error');
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Test API Endpoint</h1>
      
      <button 
        onClick={handleGetProducts}
        style={{
          padding: '10px 20px',
          backgroundColor: '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 'bold',
          marginBottom: '24px'
        }}
      >
        GET Products
      </button>

      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <h2 style={{ fontSize: '18px', margin: 0 }}>Response Status:</h2>
        {status === 'idle' && (
          <span style={{ padding: '4px 8px', background: '#e5e7eb', borderRadius: '12px', fontSize: '14px' }}>Waiting...</span>
        )}
        {status === 'loading' && (
          <span style={{ padding: '4px 8px', background: '#fef08a', borderRadius: '12px', fontSize: '14px' }}>Fetching...</span>
        )}
        {status === 'success' && (
          <span style={{ padding: '4px 8px', background: '#bbf7d0', color: '#166534', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold' }}>200 OK</span>
        )}
        {status === 'error' && (
          <span style={{ padding: '4px 8px', background: '#fecaca', color: '#991b1b', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold' }}>Error</span>
        )}
      </div>

      {data && (
        <div style={{ 
          backgroundColor: '#1e1e1e', 
          color: '#d4d4d4', 
          padding: '20px', 
          borderRadius: '8px',
          overflowX: 'auto'
        }}>
          <pre style={{ margin: 0 }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
