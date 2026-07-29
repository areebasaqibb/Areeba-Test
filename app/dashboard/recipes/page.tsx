'use client';

import { useState, useEffect, useContext } from 'react';
import toast from 'react-hot-toast';
import { Search, Plus, Edit2, Trash2, ChefHat, Sparkles, CheckCircle2, Calculator, Save, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { BusinessContext } from '../layout';
import { formatCurrency } from '../../lib/utils';
import { normalizePrice } from '../../../services/PriceNormalizationService';

export default function Recipes() {
  const { business } = useContext(BusinessContext);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [ingredientsPool, setIngredientsPool] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [servingSize, setServingSize] = useState('');
  const [yieldCount, setYieldCount] = useState('1');
  const [notes, setNotes] = useState('');
  
  // Recipe Ingredients List [{ ingredientId, quantity, unit, _cost }]
  const [recipeIngredients, setRecipeIngredients] = useState<any[]>([]);
  
  // Live Costing
  const [laborCost, setLaborCost] = useState('0');
  const [utilitiesCost, setUtilitiesCost] = useState('0');
  const [packagingCost, setPackagingCost] = useState('0');
  const [suggestedPrice, setSuggestedPrice] = useState('0');
  const [laborTime, setLaborTime] = useState('1 hour');
  const [electricityTime, setElectricityTime] = useState('1 hour');
  const [isAiEstimating, setIsAiEstimating] = useState(false);

  const loadData = async () => {
    const token = localStorage.getItem('token');
    try {
      const [resR, resI] = await Promise.all([
        fetch('http://localhost:3001/api/recipes', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:3001/api/ingredients', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      setRecipes(await resR.json());
      setIngredientsPool(await resI.json());
    } catch (err) {
      toast.error('Failed to load recipes');
    }
  };

  useEffect(() => {
    if (business) loadData();
  }, [business]);

  // Calculations
  const calculateIngredientCost = (ri: any) => {
    const poolItem = ingredientsPool.find(i => i.id === ri.ingredientId);
    if (!poolItem || !ri.quantity) return 0;
    
    let calcQty = parseFloat(ri.quantity);
    let calcUnit = ri.unit.toLowerCase();

    if (calcUnit === 'cup') {
        const name = poolItem.name.toLowerCase();
        let multiplier = 200; // default 200g
        if (name.includes('flour') || name.includes('cocoa')) multiplier = 125;
        else if (name.includes('butter') || name.includes('margarine')) multiplier = 227;
        else if (name.includes('sugar')) multiplier = 200;
        else if (name.includes('milk') || name.includes('water') || name.includes('oil')) multiplier = 240;
        
        calcQty = calcQty * multiplier;
        calcUnit = (poolItem.unit.toLowerCase() === 'l' || poolItem.unit.toLowerCase() === 'ml') ? 'ml' : 'g';
    }

    let cost = 0;
    const poolUnit = poolItem.unit.toLowerCase();
    
    if (poolUnit === 'kg' && calcUnit === 'g') {
      cost = (calcQty / 1000) * poolItem.cost;
    } else if (poolUnit === 'l' && calcUnit === 'ml') {
      cost = (calcQty / 1000) * poolItem.cost;
    } else if (poolUnit === 'g' && calcUnit === 'kg') {
      cost = (calcQty * 1000) * poolItem.cost;
    } else if (poolUnit === 'ml' && calcUnit === 'l') {
      cost = (calcQty * 1000) * poolItem.cost;
    } else if (poolUnit === calcUnit) {
      cost = calcQty * poolItem.cost;
    } else {
      cost = calcQty * (poolItem.cost / 1000); 
    }
    return cost || 0;
  };

  const totalIngredientCost = recipeIngredients.reduce((sum, ri) => sum + calculateIngredientCost(ri), 0);
  const totalProductionCost = totalIngredientCost + parseFloat(laborCost || '0') + parseFloat(utilitiesCost || '0') + parseFloat(packagingCost || '0');
  const costPerPiece = totalProductionCost / (parseInt(yieldCount) || 1);
  const profitEstimate = parseFloat(suggestedPrice || '0') - totalProductionCost;

  const calculateTotalWeight = () => {
    let totalGrams = 0;
    recipeIngredients.forEach(ri => {
      if (!ri.quantity) return;
      let calcQty = parseFloat(ri.quantity);
      let calcUnit = (ri.unit || 'g').toLowerCase();

      if (calcUnit === 'cup') {
        const poolItem = ingredientsPool.find(i => i.id === ri.ingredientId);
        let multiplier = 200; 
        if (poolItem) {
          const name = poolItem.name.toLowerCase();
          if (name.includes('flour') || name.includes('cocoa')) multiplier = 125;
          else if (name.includes('butter') || name.includes('margarine')) multiplier = 227;
          else if (name.includes('sugar')) multiplier = 200;
          else if (name.includes('milk') || name.includes('water') || name.includes('oil')) multiplier = 240;
        }
        totalGrams += calcQty * multiplier;
      } else if (calcUnit === 'kg' || calcUnit === 'l') {
        totalGrams += calcQty * 1000;
      } else if (calcUnit === 'g' || calcUnit === 'ml') {
        totalGrams += calcQty;
      } else if (calcUnit === 'piece') {
        // approximate weight for pieces like eggs
        totalGrams += calcQty * 50; 
      }
    });
    
    if (totalGrams === 0) return '0 g';
    if (totalGrams >= 1000) {
      return (totalGrams / 1000).toFixed(2) + ' kg';
    }
    return totalGrams.toFixed(0) + ' g';
  };

  // Automatically adjust selling price according to profit margin whenever costs change
  useEffect(() => {
    if (business && totalProductionCost > 0) {
      const margin = business.profitMargin || 3.0;
      const priceWithMargin = (totalIngredientCost * margin) + parseFloat(laborCost || '0') + parseFloat(utilitiesCost || '0') + parseFloat(packagingCost || '0');
      setSuggestedPrice(priceWithMargin.toFixed(2));
    }
  }, [totalIngredientCost, laborCost, utilitiesCost, packagingCost, totalProductionCost, business]);

  const estimateAiCosts = async () => {
    if (!name) return toast.error('Enter recipe name first');
    setIsAiEstimating(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:3001/api/ai/recipe-estimate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, category, yield: parseInt(yieldCount) || 1, 
          ingredientCost: totalIngredientCost,
          laborTime, electricityTime
        })
      });
      const data = await res.json();
      setSuggestedPrice(data.suggestedPrice?.toString() || '0');
      toast.success('AI calculated optimal pricing!');
    } catch(err) {
      toast.error('AI Estimation failed');
    } finally {
      setIsAiEstimating(false);
    }
  };

  const handleLaborTimeChange = (val: string) => {
    setLaborTime(val);
    const hours = val.includes('15 mins') ? 0.25 : val.includes('30 mins') ? 0.5 : val.includes('45 mins') ? 0.75 : parseFloat(val) || 1;
    setLaborCost((hours * 250).toString()); // Approx 250 PKR/hr baker wage
  };

  const handleElectricityTimeChange = (val: string) => {
    setElectricityTime(val);
    const hours = val.includes('15 mins') ? 0.25 : val.includes('30 mins') ? 0.5 : val.includes('45 mins') ? 0.75 : parseFloat(val) || 1;
    setUtilitiesCost((hours * 150).toString()); // Approx 150 PKR/hr electricity
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const url = editingId ? `http://localhost:3001/api/recipes/${editingId}` : 'http://localhost:3001/api/recipes';
    
    try {
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, category, servingSize, yield: parseInt(yieldCount), notes,
          laborCost: parseFloat(laborCost), packagingCost: parseFloat(packagingCost),
          utilitiesCost: parseFloat(utilitiesCost), totalCost: totalProductionCost,
          suggestedPrice: parseFloat(suggestedPrice),
          ingredients: recipeIngredients
        })
      });
      if (!res.ok) throw new Error();
      toast.success(`Recipe saved!`);
      closeModal();
      loadData();
    } catch (err) {
      toast.error('Failed to save recipe');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:3001/api/recipes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      toast.success('Recipe deleted');
      loadData();
    } catch (err) {
      toast.error('Failed to delete recipe');
    }
  };

  const openModal = (recipe?: any) => {
    if (recipe) {
      setEditingId(recipe.id);
      setName(recipe.name);
      setCategory(recipe.category || '');
      setServingSize(recipe.servingSize || '');
      setYieldCount(recipe.yield?.toString() || '1');
      setNotes(recipe.notes || '');
      setRecipeIngredients(recipe.ingredients || []);
      setLaborCost(recipe.laborCost?.toString() || '0');
      setUtilitiesCost(recipe.utilitiesCost?.toString() || '0');
      setPackagingCost(recipe.packagingCost?.toString() || '0');
      setSuggestedPrice(recipe.suggestedPrice?.toString() || '0');
      setLaborTime('1 hour'); 
      setElectricityTime('1 hour');
    } else {
      setEditingId(null);
      setName(''); setCategory(''); setServingSize(''); setYieldCount('1'); setNotes('');
      setRecipeIngredients([]);
      setLaborCost('0'); setUtilitiesCost('0'); setPackagingCost('0'); setSuggestedPrice('0');
      setLaborTime('1 hour'); setElectricityTime('1 hour');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  if (!business) return null;

  const uniqueCategories = Array.from(new Set(recipes.map(r => r.category).filter(Boolean)));
  
  const filteredRecipes = selectedCategoryFilter 
    ? recipes.filter(r => r.category === selectedCategoryFilter)
    : recipes;

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold">My Recipes</h1>
        <div className="flex gap-2 w-full md:w-auto">
          <select 
            className="input py-2 px-3 text-sm h-10 w-40" 
            value={selectedCategoryFilter} 
            onChange={e => setSelectedCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {uniqueCategories.map(c => <option key={c as string} value={c as string}>{c as string}</option>)}
          </select>
          <button className="btn btn-primary h-10 px-4 whitespace-nowrap" onClick={() => openModal()}>
            <Plus size={18} /> New Recipe
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRecipes.map(r => (
          <div key={r.id} className="card p-0 overflow-hidden hover:shadow-lg transition-all border border-slate-100 dark:border-slate-800 flex flex-col">

            <div className="p-6 flex flex-col flex-1">
              <div className="flex justify-between items-start mb-4">
                <div>
                <h3 className="font-bold text-lg">{r.name}</h3>
                <p className="text-sm text-primary font-medium">{r.category}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex gap-2">
                  <button onClick={() => openModal(r)} className="text-slate-400 hover:text-blue-500 transition-colors p-1"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(r.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1"><Trash2 size={16} /></button>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl text-center">
                  <p className="text-xs text-muted">Yield</p>
                  <p className="font-bold leading-none">{r.yield}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2 mb-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Total Cost</span>
                <span className="font-medium">{formatCurrency(r.totalCost, business.currency, 'en')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Cost / Piece</span>
                <span className="font-medium">{formatCurrency(r.totalCost / (r.yield || 1), business.currency, 'en')}</span>
              </div>
            </div>
          </div>
        </div>
        ))}
        {filteredRecipes.length === 0 && (
           <div className="col-span-full empty-state">
             <ChefHat className="icon" />
             <h3 className="text-lg font-bold">No recipes yet</h3>
             <p className="text-muted">Create your first recipe or adjust your category filter.</p>
           </div>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay overflow-y-auto" onClick={closeModal}>
          <div className="modal-content max-w-4xl w-full my-8 p-0 overflow-y-auto max-h-[90vh] flex flex-col md:flex-row" onClick={e => e.stopPropagation()}>
            
            {/* Left Side: Recipe Form */}
            <div className="flex-1 p-6 border-r border-slate-100 dark:border-slate-800">
              <h2 className="text-xl font-bold mb-6">Recipe Builder</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="input-group mb-0 col-span-2">
                  <label>Recipe Name</label>
                  <input type="text" className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Fudgy Brownies" />
                </div>
                <div className="input-group mb-0">
                  <label>Category</label>
                  <input type="text" className="input" value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Brownies" />
                </div>
                <div className="input-group mb-0">
                  <label>Yield (Pieces/Servings)</label>
                  <input type="number" className="input" value={yieldCount} onChange={e => setYieldCount(e.target.value)} />
                </div>
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label className="font-semibold text-sm">Ingredients</label>
                  <button type="button" className="text-sm text-primary flex items-center gap-1 font-medium hover:underline"
                    onClick={() => setRecipeIngredients([...recipeIngredients, { ingredientId: '', quantity: '', unit: 'g' }])}>
                    <Plus size={14} /> Add Ingredient
                  </button>
                </div>
                
                {recipeIngredients.map((ri, idx) => (
                  <div key={idx} className="flex gap-2 mb-2 items-start">
                    <select className="input flex-1" value={ri.ingredientId} onChange={e => {
                      const newArr = [...recipeIngredients];
                      newArr[idx].ingredientId = e.target.value;
                      setRecipeIngredients(newArr);
                    }}>
                      <option value="">Select from Pantry...</option>
                      {ingredientsPool.map(p => <option key={p.id} value={p.id}>{p.name} ({formatCurrency(p.cost, business.currency, 'en')}/{p.unit})</option>)}
                    </select>
                    <input type="number" placeholder="Qty" className="input w-24" value={ri.quantity} onChange={e => {
                      const newArr = [...recipeIngredients];
                      newArr[idx].quantity = e.target.value;
                      setRecipeIngredients(newArr);
                    }}/>
                    <select className="input w-24" value={ri.unit} onChange={e => {
                      const newArr = [...recipeIngredients];
                      newArr[idx].unit = e.target.value;
                      setRecipeIngredients(newArr);
                    }}>
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                      <option value="ml">ml</option>
                      <option value="cup">cup</option>
                      <option value="piece">piece</option>
                    </select>
                    <div className="flex flex-col items-end w-20 pt-2 shrink-0">
                      <span className="font-semibold text-sm">{formatCurrency(calculateIngredientCost(ri), business.currency, 'en')}</span>
                    </div>
                    <button type="button" className="btn btn-ghost btn-icon text-red-500 mt-1" onClick={() => {
                      setRecipeIngredients(recipeIngredients.filter((_, i) => i !== idx));
                    }}><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>

              <div className="input-group">
                <label>Preparation Notes</label>
                <textarea className="input" rows={2} value={notes} onChange={e => setNotes(e.target.value)}></textarea>
              </div>

            </div>

            {/* Right Side: Costing & AI */}
            <div className="w-full md:w-80 bg-slate-50 dark:bg-slate-900/50 p-6 flex flex-col justify-between">
              <div>
                <h3 className="font-bold mb-4 flex items-center gap-2"><Calculator size={18} /> Cost Breakdown</h3>
                
                <div className="space-y-3 text-sm mb-6">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-muted">Ingredients</span>
                    <span className="font-medium">{formatCurrency(totalIngredientCost, business.currency, 'en')}</span>
                  </div>
                  
                  <div className="flex flex-col gap-1 pb-2 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center">
                      <span className="text-muted text-xs">Labour Time</span>
                      <select className="input py-0 px-2 h-7 w-24 text-xs bg-slate-100 dark:bg-slate-800 border-none" value={laborTime} onChange={e => handleLaborTimeChange(e.target.value)}>
                        <option value="15 mins">15 mins</option>
                        <option value="30 mins">30 mins</option>
                        <option value="45 mins">45 mins</option>
                        <option value="1 hour">1 hour</option>
                        <option value="1.5 hours">1.5 hours</option>
                        <option value="2 hours">2 hours</option>
                        <option value="3 hours">3 hours</option>
                      </select>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted font-medium">Labour (Est)</span>
                      <input type="number" className="input py-1 px-2 h-8 w-24 text-right" value={laborCost} onChange={e => setLaborCost(e.target.value)} />
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1 pb-2 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center">
                      <span className="text-muted text-xs">Electricity Time</span>
                      <select className="input py-0 px-2 h-7 w-24 text-xs bg-slate-100 dark:bg-slate-800 border-none" value={electricityTime} onChange={e => handleElectricityTimeChange(e.target.value)}>
                        <option value="15 mins">15 mins</option>
                        <option value="30 mins">30 mins</option>
                        <option value="45 mins">45 mins</option>
                        <option value="1 hour">1 hour</option>
                        <option value="1.5 hours">1.5 hours</option>
                        <option value="2 hours">2 hours</option>
                        <option value="3 hours">3 hours</option>
                      </select>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted font-medium">Utilities (Est)</span>
                      <input type="number" className="input py-1 px-2 h-8 w-24 text-right" value={utilitiesCost} onChange={e => setUtilitiesCost(e.target.value)} />
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-muted">Packaging</span>
                    <input type="number" className="input py-1 px-2 h-8 w-24 text-right" value={packagingCost} onChange={e => setPackagingCost(e.target.value)} />
                  </div>

                  <div className="flex justify-between items-center pt-2 font-bold text-base">
                    <span>Total Cost</span>
                    <span>{formatCurrency(totalProductionCost, business.currency, 'en')}</span>
                  </div>
                  <div className="flex justify-between items-center text-primary font-medium">
                    <span>Cost per Piece</span>
                    <span>{formatCurrency(costPerPiece, business.currency, 'en')}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                    <span>Total Net Weight</span>
                    <span>{calculateTotalWeight()}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button type="button" className="btn btn-ghost flex-1" onClick={closeModal}>Discard</button>
                <button type="button" className="btn btn-primary flex-1 gap-2" onClick={handleSubmit}>
                  <Save size={16} /> Save Recipe
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
