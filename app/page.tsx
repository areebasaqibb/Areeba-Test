'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [logo, setLogo] = useState('');
  const [instagram, setInstagram] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [productsSold, setProductsSold] = useState('');
  const [businessGoal, setBusinessGoal] = useState('Side Income');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin 
      ? { email, password } 
      : { email, password, name, country, state, city, logo, instagram, whatsapp, productsSold, businessGoal };

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      localStorage.setItem('token', data.token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
        <h1 className="text-2xl font-bold mb-8 text-center">
          {isLogin ? 'Welcome Back' : 'Start Your Home Bakery'}
        </h1>
        
        {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <div className="input-group">
                <label>Name</label>
                <input
                  type="text"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin}
                />
              </div>
              <div className="input-group">
                <label>Country</label>
                <input
                  type="text"
                  className="input"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  required={!isLogin}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="input-group">
                  <label>State/Province</label>
                  <input
                    type="text"
                    className="input"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label>City</label>
                  <input
                    type="text"
                    className="input"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required={!isLogin}
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Bakery Logo URL (Optional)</label>
                <input
                  type="url"
                  className="input"
                  placeholder="e.g. https://example.com/logo.png"
                  value={logo}
                  onChange={(e) => setLogo(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="input-group">
                  <label>Instagram Handle (Optional)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="@sweetbakes"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label>WhatsApp Number (Optional)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="+1234567890"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                  />
                </div>
              </div>

              <div className="input-group">
                <label>What products do you sell?</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Cakes, Brownies, Cookies"
                  value={productsSold}
                  onChange={(e) => setProductsSold(e.target.value)}
                  required={!isLogin}
                />
              </div>

              <div className="input-group">
                <label>What is your business goal?</label>
                <select
                  className="input"
                  value={businessGoal}
                  onChange={(e) => setBusinessGoal(e.target.value)}
                >
                  <option value="Hobby">Just a Hobby</option>
                  <option value="Side Income">Side Income</option>
                  <option value="Full-Time">Full-Time Business</option>
                </select>
              </div>
            </>
          )}
          <div className="input-group">
            <label>Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            {isLogin ? 'Login' : 'Register'}
          </button>
        </form>

        <div className="text-center" style={{ marginTop: '1.5rem', color: 'var(--text-muted)' }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}
          >
            {isLogin ? 'Register' : 'Login'}
          </button>
        </div>
      </div>
    </div>
  );
}
