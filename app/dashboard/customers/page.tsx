'use client';

import { useState, useEffect, useContext } from 'react';
import toast from 'react-hot-toast';
import { Search, Plus, Edit2, Trash2, Heart, Users, Star, Gift, Sparkles } from 'lucide-react';
import { BusinessContext } from '../layout';
import { formatCurrency } from '../../lib/utils';

export default function Customers() {
  const { business } = useContext(BusinessContext);
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [aiCampaign, setAiCampaign] = useState('');
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [instagram, setInstagram] = useState('');
  const [notes, setNotes] = useState('');

  const loadData = async () => {
    const token = localStorage.getItem('token');
    try {
      const [resC, resAI] = await Promise.all([
        fetch('http://localhost:3001/api/customers', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:3001/api/ai/customers-insight', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      setCustomers(await resC.json());
      const ai = await resAI.json();
      setAiCampaign(ai.campaignSuggestion);
    } catch (err) {
      toast.error('Failed to load customers');
    }
  };

  useEffect(() => {
    if (business) loadData();
  }, [business]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    const url = editingCustomerId ? `http://localhost:3001/api/customers/${editingCustomerId}` : 'http://localhost:3001/api/customers';
    const method = editingCustomerId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, instagram, notes })
      });
      if (!res.ok) throw new Error();
      toast.success(editingCustomerId ? 'Customer updated!' : 'Customer added!');
      setIsModalOpen(false);
      loadData();
    } catch(err) {
      toast.error('Failed to save customer');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:3001/api/customers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete customer');
      }
      toast.success('Customer deleted');
      loadData();
    } catch(err: any) {
      toast.error(err.message || 'Failed to delete customer');
    }
  };

  const openModal = () => {
    setEditingCustomerId(null);
    setName(''); setPhone(''); setInstagram(''); setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (c: any) => {
    setEditingCustomerId(c.id);
    setName(c.name);
    setPhone(c.phone || '');
    setInstagram(c.instagram || '');
    setNotes(c.notes || '');
    setIsModalOpen(true);
  };

  const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  if (!business) return null;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Happy Customers</h1>
        <button className="btn btn-primary" onClick={openModal}>
          <Plus size={18} /> Add Customer
        </button>
      </div>

      {aiCampaign && (
        <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl p-4 mb-8 flex items-start gap-3">
          <Gift className="text-primary shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-bold text-primary">AI Campaign Suggestion</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">{aiCampaign}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {filtered.map(c => (
          <div key={c.id} className="card flex flex-col items-center text-center relative group">
            <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
              <button 
                onClick={() => openEditModal(c)}
                className="text-slate-300 hover:text-primary p-1"
                title="Edit Customer"
              >
                <Edit2 size={16} />
              </button>
              <button 
                onClick={() => handleDelete(c.id)}
                className="text-slate-300 hover:text-red-500 p-1"
                title="Delete Customer"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4 text-xl font-bold">
              {c.name.charAt(0).toUpperCase()}
            </div>
            <h3 className="font-bold text-lg mb-1">{c.name}</h3>
            <p className="text-sm text-muted mb-4">{c.phone || c.instagram || 'No contact info'}</p>
            
            <div className="flex gap-4 w-full justify-center pt-4 border-t border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-xs text-muted mb-1">Orders</p>
                <p className="font-bold">{c.totalOrders}</p>
              </div>
              <div className="w-px bg-slate-200 dark:bg-slate-700"></div>
              <div>
                <p className="text-xs text-muted mb-1">Spent</p>
                <p className="font-bold text-primary">{formatCurrency(c.lifetimeSpending, business.currency, 'en')}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-6">{editingCustomerId ? 'Edit Customer' : 'New Customer'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="input-group">
                <label>Name</label>
                <input type="text" className="input" value={name} onChange={e => setName(e.target.value)} required/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="input-group">
                  <label>Phone</label>
                  <input type="text" className="input" value={phone} onChange={e => setPhone(e.target.value)}/>
                </div>
                <div className="input-group">
                  <label>Instagram Handle</label>
                  <input type="text" className="input" value={instagram} onChange={e => setInstagram(e.target.value)}/>
                </div>
              </div>
              <div className="input-group">
                <label>Notes</label>
                <textarea className="input" value={notes} onChange={e => setNotes(e.target.value)}></textarea>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingCustomerId ? 'Save Changes' : 'Add Customer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
