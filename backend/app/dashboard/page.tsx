'use client';

import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [business, setBusiness] = useState<any>(null);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  const [newIngredient, setNewIngredient] = useState({ name: '', cost: '', unit: 'kg' });
  const [newProduct, setNewProduct] = useState({ name: '', description: '', sellingPrice: '' });

  const fetchWithAuth = async (url: string, options: any = {}) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`http://localhost:3001${url}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) throw new Error('API Request Failed');
    return res.json();
  };

  const loadData = async () => {
    try {
      const bRes = await fetchWithAuth('/api/business');
      setBusiness(bRes.business);
      
      const iRes = await fetchWithAuth('/api/ingredients');
      setIngredients(iRes);

      const pRes = await fetchWithAuth('/api/products');
      setProducts(pRes);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetchWithAuth('/api/ingredients', {
      method: 'POST',
      body: JSON.stringify({ ...newIngredient, cost: parseFloat(newIngredient.cost) })
    });
    setNewIngredient({ name: '', cost: '', unit: 'kg' });
    loadData();
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetchWithAuth('/api/products', {
      method: 'POST',
      body: JSON.stringify({ ...newProduct, sellingPrice: parseFloat(newProduct.sellingPrice) })
    });
    setNewProduct({ name: '', description: '', sellingPrice: '' });
    loadData();
  };

  return (
    <div className="container">
      <div className="mb-8 card">
        <h2 className="text-2xl font-bold">Business Profile</h2>
        {business ? (
          <p className="mt-2 text-muted">Name: {business.name}</p>
        ) : (
          <p>No business profile found. API expects business to be created on register, but please verify.</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Ingredients Section */}
        <div className="card">
          <h2 className="text-2xl font-bold mb-4">Ingredients</h2>
          
          <form onSubmit={handleAddIngredient} className="mb-4 flex gap-4 items-center">
            <input type="text" placeholder="Name" className="input" value={newIngredient.name} onChange={e => setNewIngredient({...newIngredient, name: e.target.value})} required />
            <input type="number" step="0.01" placeholder="Cost" className="input" value={newIngredient.cost} onChange={e => setNewIngredient({...newIngredient, cost: e.target.value})} required />
            <select className="input" value={newIngredient.unit} onChange={e => setNewIngredient({...newIngredient, unit: e.target.value})}>
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="cup">cup</option>
            </select>
            <button type="submit" className="btn btn-primary">Add</button>
          </form>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Cost</th>
                  <th>Unit</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map(ing => (
                  <tr key={ing.id}>
                    <td>{ing.name}</td>
                    <td>${ing.cost.toFixed(2)}</td>
                    <td>{ing.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Products Section */}
        <div className="card">
          <h2 className="text-2xl font-bold mb-4">Products</h2>
          
          <form onSubmit={handleAddProduct} className="mb-4 flex gap-4 items-center">
            <input type="text" placeholder="Name" className="input" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} required />
            <input type="number" step="0.01" placeholder="Price" className="input" value={newProduct.sellingPrice} onChange={e => setNewProduct({...newProduct, sellingPrice: e.target.value})} required />
            <button type="submit" className="btn btn-primary">Add</button>
          </form>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {products.map(prod => (
                  <tr key={prod.id}>
                    <td>{prod.name}</td>
                    <td>${prod.sellingPrice?.toFixed(2) || '0.00'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
