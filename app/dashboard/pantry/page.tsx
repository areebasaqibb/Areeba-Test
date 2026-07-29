'use client';

import { useState, useEffect, useContext } from 'react';
import toast from 'react-hot-toast';
import { Search, Plus, Edit2, Trash2, PackageSearch, Sparkles, CheckCircle2, AlertTriangle, TrendingDown } from 'lucide-react';
import { BusinessContext } from '../layout';
import { formatCurrency } from '../../lib/utils';

export default function Pantry() {
  const { business } = useContext(BusinessContext);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [cost, setCost] = useState('');
  const [unit, setUnit] = useState('kg');
  const [stockQuantity, setStockQuantity] = useState('0');

  const loadData = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:3001/api/ingredients', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setIngredients(data);
    } catch (err) {
      toast.error('Failed to load pantry items');
    }
  };

  useEffect(() => {
    if (business) loadData();
  }, [business]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    const url = editingId 
      ? `http://localhost:3001/api/ingredients/${editingId}`
      : 'http://localhost:3001/api/ingredients';
      
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          name, 
          brand,
          cost: parseFloat(cost), 
          unit,
          stockQuantity: parseFloat(stockQuantity),
          minStock: 0
        })
      });

      if (!res.ok) throw new Error('Failed to save');
      
      toast.success(`Pantry item ${editingId ? 'updated' : 'added'}!`);
      closeModal();
      loadData();
    } catch (error) {
      toast.error('Failed to save item');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:3001/api/ingredients/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Item deleted');
      loadData();
    } catch (err) {
      toast.error('Failed to delete item');
    }
  };

  const handleStockUpdate = async (id: string, newStock: string) => {
    const parsed = parseFloat(newStock);
    if (isNaN(parsed)) return;

    // Optimistically update UI
    setIngredients(prev => prev.map(ing => 
      ing.id === id ? { ...ing, stockQuantity: parsed } : ing
    ));

    const ingredient = ingredients.find(i => i.id === id);
    if (!ingredient) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:3001/api/ingredients/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          name: ingredient.name, 
          brand: ingredient.brand,
          cost: ingredient.cost, 
          unit: ingredient.unit,
          stockQuantity: parsed,
          minStock: 0
        })
      });

      if (!res.ok) throw new Error('Failed to update stock');
      toast.success('Stock updated');
    } catch (err) {
      toast.error('Failed to update stock');
      loadData();
    }
  };

  const openModal = (ingredient?: any) => {
    if (ingredient) {
      setEditingId(ingredient.id);
      setName(ingredient.name);
      setBrand(ingredient.brand || '');
      setCost(ingredient.cost.toString());
      setUnit(ingredient.unit);
      setStockQuantity(ingredient.stockQuantity?.toString() || '0');
    } else {
      setEditingId(null);
      setName('');
      setBrand('');
      setCost('');
      setUnit('kg');
      setStockQuantity('0');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const filtered = ingredients.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase()) || 
    (i.brand && i.brand.toLowerCase().includes(search.toLowerCase()))
  );

  if (!business) return null;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Pantry</h1>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <Plus size={18} /> Add Item
        </button>
      </div>

      
      <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl p-4 mb-8 flex items-start gap-3">
        <Sparkles className="text-primary shrink-0 mt-0.5" size={20} />
        <div>
          <h3 className="font-bold text-primary">AI Market Insight</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Based on your location, flour prices have dropped slightly this week. It might be a good time to buy in bulk.
          </p>
        </div>
      </div>

      <div className="card mb-6">
        <div className="input-icon-wrapper w-full max-w-md">
          <Search className="icon" size={18} />
          <input 
            type="text" 
            className="input" 
            placeholder="Search pantry..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-wrapper">
        {filtered.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Brand</th>
                <th>Current Price</th>
                <th>Stock</th>
                <th>AI Insight</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(i => {
                const isOut = i.stockQuantity <= 0;
                return (
                  <tr key={i.id} className={isOut ? 'bg-red-50/50 dark:bg-red-900/10' : ''}>
                    <td className="font-medium">{i.name}</td>
                    <td className="text-muted">{i.brand || '-'}</td>
                    <td>{formatCurrency(i.cost, business.currency, 'en')} / {i.unit}</td>
                    <td className={isOut ? 'text-red-600 font-bold' : ''}>
                      <div className="flex items-center gap-1">
                        <input 
                          type="number"
                          className="w-16 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-600 focus:outline-none focus:border-primary text-center px-1"
                          defaultValue={i.stockQuantity}
                          onBlur={(e) => {
                            if (parseFloat(e.target.value) !== i.stockQuantity) {
                              handleStockUpdate(i.id, e.target.value);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                          }}
                        />
                        <span>{i.unit}</span>
                      </div>
                    </td>
                    <td>
                      {i.isAutoPriced ? (
                        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full font-medium flex items-center gap-1 w-max">
                          <CheckCircle2 size={12} /> {i.confidenceScore}% Confidence
                        </span>
                      ) : (
                        <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-full flex items-center gap-1 w-max">Manual Entry</span>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <button className="btn btn-ghost btn-icon" onClick={() => openModal(i)}>
                          <Edit2 size={16} />
                        </button>
                        <button className="btn btn-ghost btn-icon text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" onClick={() => handleDelete(i.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <PackageSearch className="icon" />
            <h3 className="text-lg font-bold">Pantry is empty</h3>
            <p className="mt-2 text-muted max-w-sm">
              Keep track of all your baking ingredients here.
            </p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-6">{editingId ? 'Edit Pantry Item' : 'Add to Pantry'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="input-group">
                  <label>Item Name</label>
                  <input type="text" className="input" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="input-group">
                  <label>Brand (Optional)</label>
                  <input type="text" className="input" value={brand} onChange={e => setBrand(e.target.value)} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="input-group">
                  <label>Cost ({business.currency})</label>
                  <input type="number" step="0.01" className="input" value={cost} onChange={e => setCost(e.target.value)} required />
                </div>
                <div className="input-group">
                  <label>Unit (e.g., kg, L, piece)</label>
                  <input type="text" className="input" value={unit} onChange={e => setUnit(e.target.value)} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="input-group">
                  <label>Current Stock</label>
                  <input type="number" step="0.01" className="input" value={stockQuantity} onChange={e => setStockQuantity(e.target.value)} required />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Save Changes' : 'Add Item'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
