'use client';

import { useState, useEffect, useContext } from 'react';
import toast from 'react-hot-toast';
import { Search, Plus, Edit2, Trash2, PackageSearch, Sparkles, CheckCircle2, ChevronRight, AlertTriangle } from 'lucide-react';
import { BusinessContext } from '../layout';
import { formatCurrency } from '../../lib/utils';

export default function Ingredients() {
  const { business } = useContext(BusinessContext);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  
  // Modal & Wizard State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [cost, setCost] = useState('');
  const [packageSize, setPackageSize] = useState('1');
  const [unit, setUnit] = useState('kg');
  const [selectedSourceIndex, setSelectedSourceIndex] = useState<number>(0);
  
  // AI Research state
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState('');
  const [aiResult, setAiResult] = useState<any>(null);
  const [isAutoPriced, setIsAutoPriced] = useState(false);

  const loadData = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/ingredients`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setIngredients(data);
    } catch (err) {
      toast.error('Failed to load ingredients');
    }
  };

  useEffect(() => {
    if (business) loadData();
  }, [business]);

  const startAiResearch = async () => {
    if (!name) return toast.error('Please enter an ingredient name first.');
    
    setWizardStep(3); // Go to research step
    setIsAiLoading(true);
    setAiResult(null);

    // Simulate phases for UI
    const phases = [
      'Searching local stores...',
      'Checking Carrefour...',
      'Checking Metro...',
      'Normalizing prices...',
      'Calculating average...'
    ];
    let pIdx = 0;
    const interval = setInterval(() => {
      setLoadingPhase(phases[pIdx]);
      pIdx = (pIdx + 1) % phases.length;
    }, 1200);

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/ai/lookup-ingredient`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ingredientName: name, brand: brand || null })
      });
      
      clearInterval(interval);
      setIsAiLoading(false);

      if (!res.ok) {
        throw new Error('AI lookup failed');
      }
      
      const data = await res.json();
      if (data && data.options && data.options.length > 0) {
        setAiResult(data);
        setSelectedSourceIndex(0);
        setIsAutoPriced(true);
        setWizardStep(4); // Go to Source Selection
      } else {
        setCost(data.averagePrice.toString());
        setUnit(data.unit);
        setIsAutoPriced(true);
        setWizardStep(5); // Go to review step
      }
      toast.success('Market research complete!');
    } catch (err) {
      clearInterval(interval);
      setIsAiLoading(false);
      toast.error('AI Lookup failed. Please enter price manually.');
      setWizardStep(5); // Go to manual entry
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    const url = editingId 
      ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/ingredients/${editingId}`
      : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/ingredients`;
      
    const method = editingId ? 'PUT' : 'POST';

    try {
      // Normalize cost per standard unit (kg/L/piece)
      let standardCost = parseFloat(cost);
      let standardUnit = unit;
      const size = parseFloat(packageSize) || 1;

      if (unit === 'g') {
        standardCost = (standardCost / size) * 1000;
        standardUnit = 'kg';
      } else if (unit === 'ml') {
        standardCost = (standardCost / size) * 1000;
        standardUnit = 'L';
      } else if (unit === 'kg' || unit === 'L') {
        standardCost = (standardCost / size);
      }

      const payload = { 
        name, 
        brand,
        cost: standardCost, 
        unit: standardUnit,
        isAutoPriced
      };

      if (aiResult && isAutoPriced) {
        const selectedOpt = aiResult.options[selectedSourceIndex];
        Object.assign(payload, {
          cost: selectedOpt.normalizedPrice,
          unit: selectedOpt.unit,
          sourcePrice: selectedOpt.normalizedPrice,
          normalizedPrice: selectedOpt.normalizedPrice,
          lowestPrice: selectedOpt.normalizedPrice,
          highestPrice: selectedOpt.normalizedPrice,
          confidenceScore: aiResult.confidenceScore,
          priceSources: [selectedOpt.source]
        });
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to save');
      
      toast.success(`Ingredient ${editingId ? 'updated' : 'added'}!`);
      closeModal();
      loadData();
    } catch (error) {
      toast.error('Failed to save ingredient');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ingredient?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/ingredients/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Ingredient deleted');
      loadData();
    } catch (err) {
      toast.error('Failed to delete ingredient');
    }
  };

  const openModal = (ingredient?: any) => {
    if (ingredient) {
      setEditingId(ingredient.id);
      setName(ingredient.name);
      setBrand(ingredient.brand || '');
      setCost(ingredient.cost.toString());
      setUnit(ingredient.unit);
      setIsAutoPriced(ingredient.isAutoPriced);
      setWizardStep(5);
    } else {
      setEditingId(null);
      setName('');
      setBrand('');
      setCost('');
      setPackageSize('1');
      setUnit('kg');
      setIsAutoPriced(false);
      setAiResult(null);
      setWizardStep(1);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const renderWizardStep = () => {
    if (wizardStep === 1) {
      return (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">What ingredient are you adding?</h2>
          <div className="input-group">
            <label>Ingredient Name <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              className="input" 
              placeholder="e.g. Unsalted Butter, Cocoa Powder, Eggs"
              value={name} 
              onChange={e => setName(e.target.value)} 
              autoFocus
              required 
            />
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button type="button" className="btn btn-ghost" onClick={closeModal}>Cancel</button>
            <button type="button" className="btn btn-ghost text-primary" onClick={() => setWizardStep(5)}>Enter Price Manually</button>
            <button type="button" className="btn btn-primary" disabled={!name} onClick={() => setWizardStep(2)}>
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      );
    }

    if (wizardStep === 2) {
      return (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Specific Brand? (Optional)</h2>
          <p className="text-muted text-sm mb-4">Adding a brand helps our AI find the most accurate local price for you.</p>
          <div className="input-group">
            <label>Brand Name</label>
            <input 
              type="text" 
              className="input" 
              placeholder="e.g. Nurpur, President, Dawn"
              value={brand} 
              onChange={e => setBrand(e.target.value)} 
            />
          </div>
          <div className="flex justify-between gap-2 mt-6">
            <button type="button" className="btn btn-ghost" onClick={() => setWizardStep(1)}>Back</button>
            <div className="flex gap-2">
              <button type="button" className="btn btn-ghost text-primary" onClick={() => setWizardStep(5)}>Skip AI</button>
              <button type="button" className="btn btn-primary gap-2" onClick={startAiResearch}>
                <Sparkles size={16} /> Find Best Price
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (wizardStep === 3) {
      return (
        <div className="flex flex-col items-center justify-center py-12 space-y-6 text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <div>
            <h2 className="text-xl font-bold mb-2">AI Market Research</h2>
            <p className="text-muted animate-pulse">{loadingPhase || 'Initializing...'}</p>
          </div>
        </div>
      );
    }

    if (wizardStep === 4 && aiResult && aiResult.options) {
      return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Select Retailer Source</h2>
              <p className="text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{name}</span>
                {brand && ` • ${brand}`}
              </p>
            </div>
          </div>
          {aiResult.substitutedBrand && (
            <div className="flex items-start gap-2 text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 p-3 rounded-lg mb-4 text-sm font-medium">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <p>Exact product not found. Showing options for: {aiResult.productName || 'Substitute Brand'}.</p>
            </div>
          )}
          <div className="grid grid-cols-1 gap-6 mb-8">
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Available Sources</h3>
              {aiResult.options.map((opt: any, idx: number) => (
                <div 
                  key={idx}
                  onClick={() => setSelectedSourceIndex(idx)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex justify-between items-center ${selectedSourceIndex === idx ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm' : 'border-slate-100 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'}`}
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800 dark:text-slate-100 mb-1">{opt.source}</span>
                    <span className="text-sm text-slate-500">{opt.sourceAmount} {opt.sourceUnit}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                      <span className="font-semibold text-primary text-lg">{formatCurrency(opt.sourcePrice, business.currency, 'en')}</span>
                    </div>
                    {selectedSourceIndex === idx ? <CheckCircle2 className="text-primary" size={24} /> : <div className="w-6 h-6 border-2 border-slate-200 rounded-full"></div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setWizardStep(3)} className="text-muted hover:text-slate-800 dark:hover:text-slate-200 font-medium px-4 py-2">Back</button>
            <button type="button" onClick={() => setWizardStep(5)} className="px-6 py-2.5 rounded-full font-bold text-white bg-primary hover:bg-primary/90 transition-all">Confirm Selection</button>
          </div>
        </div>
      );
    }

    if (wizardStep === 5) {
      return (
        <div className="space-y-6">
          <h2 className="text-xl font-bold">{editingId ? 'Edit Ingredient' : aiResult ? 'Review AI Pricing' : 'Manual Entry'}</h2>
          {aiResult && (
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg">{name}</h3>
                  <p className="text-sm text-muted">{brand || 'Any brand'}</p>
                </div>
                <div className="flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-sm font-medium">
                  <CheckCircle2 size={16} />
                  {aiResult.confidenceScore}% Match
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                  <p className="text-xs text-muted mb-1">Recommended Price</p>
                  <p className="font-bold text-lg text-primary">{formatCurrency(aiResult.options ? aiResult.options[selectedSourceIndex].normalizedPrice : cost, business.currency, 'en')} / {aiResult.options ? aiResult.options[selectedSourceIndex].unit : unit}</p>
                </div>
                <div className="p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                  <p className="text-xs text-muted mb-1">Confidence</p>
                  <p className="font-semibold">{aiResult.confidenceScore}%</p>
                </div>
                <div className="p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                  <p className="text-xs text-muted mb-1">Source</p>
                  <p className="font-semibold truncate" title={aiResult.options ? aiResult.options[selectedSourceIndex].source : 'Manual'}>{aiResult.options ? aiResult.options[selectedSourceIndex].source : 'Manual Entry'}</p>
                </div>
                <div className="p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                  <p className="text-xs text-muted mb-1">Last Updated</p>
                  <p className="font-semibold">Today</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {(!aiResult || editingId) && (
              <div className="grid grid-cols-2 gap-4">
                <div className="input-group">
                  <label>Ingredient Name</label>
                  <input type="text" className="input" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="input-group">
                  <label>Brand (Optional)</label>
                  <input type="text" className="input" value={brand} onChange={e => setBrand(e.target.value)} />
                </div>
              </div>
            )}
            {(!aiResult || !isAutoPriced) && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="input-group">
                    <label>Retail Price ({business.currency})</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      className="input" 
                      value={cost} 
                      onChange={e => {
                        setCost(e.target.value);
                        setIsAutoPriced(false); // Manual override
                      }} 
                      placeholder="e.g. 1450"
                      required={!isAutoPriced}
                    />
                  </div>
                  <div className="input-group">
                    <label>Package Size</label>
                    <input 
                      type="number" 
                      step="0.01"
                      className="input" 
                      placeholder="e.g. 500"
                      value={packageSize}
                      onChange={e => {
                        setPackageSize(e.target.value);
                        setIsAutoPriced(false);
                      }} 
                      required={!isAutoPriced}
                    />
                  </div>
                  <div className="input-group">
                    <label>Package Unit</label>
                    <select 
                      className="input" 
                      value={unit} 
                      onChange={e => {
                        setUnit(e.target.value);
                        setIsAutoPriced(false);
                      }} 
                    >
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                      <option value="ml">ml</option>
                      <option value="L">L</option>
                      <option value="piece">piece</option>
                    </select>
                  </div>
                </div>
                
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg text-sm mb-4">
                  <strong>Note:</strong> Enter the exact price and quantity you see on the website. The system will automatically convert it to standard price per kg/L for recipe calculations.
                </div>
              </>
            )}

            <div className="flex justify-between gap-4 mt-6">
              {!editingId && <button type="button" className="btn btn-ghost" onClick={() => setWizardStep(2)}>Back</button>}
              <div className="flex gap-2 ml-auto">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Save Changes' : 'Accept & Add'}</button>
              </div>
            </div>
          </form>
        </div>
      );
    }
  };

  const filtered = ingredients.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase()) || 
    (i.brand && i.brand.toLowerCase().includes(search.toLowerCase()))
  );

  if (!business) return null;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Ingredients</h1>
        <div className="flex gap-2">
          <button className="btn btn-ghost bg-white" onClick={() => {
            setEditingId(null);
            setName(''); setBrand(''); setCost(''); setUnit('kg');
            setIsAutoPriced(false); setAiResult(null);
            setWizardStep(5);
            setIsModalOpen(true);
          }}>
            <Plus size={16} /> Add Manually
          </button>
          <button className="btn btn-primary gap-2" onClick={() => openModal()}>
            <Sparkles size={16} /> Add with AI
          </button>
        </div>
      </div>

      <div className="card mb-6">
        <div className="input-icon-wrapper w-full max-w-md">
          <Search className="icon" size={18} />
          <input 
            type="text" 
            className="input" 
            placeholder="Search ingredients..." 
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
                <th>Name</th>
                <th>Brand</th>
                <th>Cost</th>
                <th>Unit</th>
                <th>AI Verified</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(i => (
                <tr key={i.id}>
                  <td className="font-medium">{i.name}</td>
                  <td className="text-muted">{i.brand || '-'}</td>
                  <td>{formatCurrency(i.cost, business.currency, `${business.language}-${business.country || 'US'}`)}</td>
                  <td>{i.unit}</td>
                  <td>
                    {i.isAutoPriced ? (
                      <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full font-medium flex items-center gap-1 w-max">
                        <CheckCircle2 size={12} /> {i.confidenceScore}% Confidence
                      </span>
                    ) : (
                      <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-full">Manual</span>
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
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <PackageSearch className="icon" />
            <h3 className="text-lg font-bold">No ingredients found</h3>
            <p className="mt-2 text-muted max-w-sm">
              {search ? "We couldn't find any ingredients matching your search." : "You haven't added any ingredients yet. Add your first ingredient to get started."}
            </p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
            {renderWizardStep()}
          </div>
        </div>
      )}
    </div>
  );
}
