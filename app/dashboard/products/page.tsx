'use client';

import { useState, useEffect, useContext, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Search, Plus, Edit2, Trash2, ShoppingBasket, ChevronRight, ChevronLeft, Sparkles, Box, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { BusinessContext } from '../layout';
import { formatCurrency } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type FlavorIngredient = { ingredientId: string; quantity: string; unit: string; name?: string };
type Flavor = { id?: string; name: string; ingredients: FlavorIngredient[]; productionCost?: number; suggestedPrice?: number; profitMargin?: number; pricingMode?: 'ai' | 'manual'; manualPrice?: string | number; };

export default function Products() {
  const { business } = useContext(BusinessContext);
  const [products, setProducts] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  
  // Wizard state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Product state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [baseRecipeId, setBaseRecipeId] = useState('');
  const [expandedDescriptions, setExpandedDescriptions] = useState<string[]>([]);
  const [flavors, setFlavors] = useState<Flavor[]>([]);
  
  // Box Pricing state
  const [boxQuantity, setBoxQuantity] = useState(6);
  const [mixedBoxSelection, setMixedBoxSelection] = useState<Record<number, number>>({}); // flavorIndex -> quantity

  const loadData = async () => {
    const token = localStorage.getItem('token');
    try {
      const [prodRes, recRes, ingRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/products`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/recipes`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/ingredients`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      setProducts(await prodRes.json());
      setRecipes(await recRes.json());
      setIngredients(await ingRes.json());
    } catch (err) {
      toast.error('Failed to load data');
    }
  };

  useEffect(() => {
    if (business) loadData();
  }, [business]);

  // Recalculate flavor costs whenever ingredients or flavors change
  const processedFlavors = useMemo(() => {
    const baseRecipe = recipes.find(r => r.id === baseRecipeId);
    let baseCostPerPiece = 0;
    let basePackaging = 0;
    
    if (baseRecipe && baseRecipe.totalCost && baseRecipe.yield) {
      // Base recipe cost minus packaging because packaging is usually per box, but let's assume totalCost includes per-piece packaging or we handle packaging separately. 
      // The prompt says "Box of 6 -> 6x flavor cost + Packaging". We will extract packaging.
      const ingredientLaborUtilsCost = (baseRecipe.totalCost - (baseRecipe.packagingCost || 0));
      baseCostPerPiece = ingredientLaborUtilsCost / baseRecipe.yield;
      basePackaging = baseRecipe.packagingCost || 0;
    }

    return flavors.map(flavor => {
      let extrasCost = 0;
      flavor.ingredients.forEach(fi => {
        const ing = ingredients.find(i => i.id === fi.ingredientId);
        if (ing && parseFloat(fi.quantity) > 0) {
          let multiplier = 1;
          if (ing.unit.toLowerCase() === 'kg' && fi.unit.toLowerCase() === 'g') multiplier = 0.001;
          if (ing.unit.toLowerCase() === 'l' && fi.unit.toLowerCase() === 'ml') multiplier = 0.001;
          if (ing.unit.toLowerCase() === 'g' && fi.unit.toLowerCase() === 'kg') multiplier = 1000;
          extrasCost += (ing.cost * multiplier * parseFloat(fi.quantity));
        }
      });

      const totalProductionCost = baseCostPerPiece + extrasCost;
      const margin = business?.profitMargin || 3.0; 
      const aiPrice = totalProductionCost * margin;
      const suggestedPrice = flavor.pricingMode === 'manual' ? (parseFloat(flavor.manualPrice as string) || 0) : aiPrice;
      const profitPercent = suggestedPrice > 0 ? ((suggestedPrice - totalProductionCost) / suggestedPrice) * 100 : 0;

      return {
        ...flavor,
        productionCost: totalProductionCost,
        suggestedPrice: suggestedPrice,
        profitMargin: profitPercent
      };
    });
  }, [flavors, baseRecipeId, recipes, ingredients, business]);

  // Box Pricing calculation
  const boxPricing = useMemo(() => {
    const baseRecipe = recipes.find(r => r.id === baseRecipeId);
    const packagingCost = baseRecipe?.packagingCost || 0;
    
    let totalItems = 0;
    let totalItemsCost = 0;

    Object.entries(mixedBoxSelection).forEach(([indexStr, qty]) => {
      const idx = parseInt(indexStr);
      const flavor = processedFlavors[idx];
      if (flavor) {
        totalItems += qty;
        totalItemsCost += (flavor.productionCost || 0) * qty;
      }
    });

    // If no mixed selection, just use average or first flavor as base for the simple box calculation
    let defaultBoxCost = 0;
    if (processedFlavors.length > 0) {
      const avgFlavorCost = processedFlavors.reduce((acc, f) => acc + (f.productionCost||0), 0) / processedFlavors.length;
      defaultBoxCost = (avgFlavorCost * boxQuantity) + packagingCost;
    }
    const defaultBoxPrice = defaultBoxCost * (business?.profitMargin || 3.0);

    const mixedBoxTotalCost = totalItemsCost + packagingCost;
    const mixedBoxPrice = mixedBoxTotalCost * (business?.profitMargin || 3.0);

    return {
      defaultBoxCost, defaultBoxPrice, mixedBoxTotalCost, mixedBoxPrice, totalItems
    };
  }, [processedFlavors, mixedBoxSelection, boxQuantity, baseRecipeId, recipes, business]);


  const handleSubmit = async () => {
    const token = localStorage.getItem('token');
    const url = editingId ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/products/${editingId}` : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/products`;
    const method = editingId ? 'PUT' : 'POST';

    try {
      // Map processed flavors to send to backend
      const payloadFlavors = processedFlavors.map(f => ({
        name: f.name,
        productionCost: f.productionCost,
        suggestedPrice: f.suggestedPrice,
        profitMargin: f.profitMargin,
        ingredients: f.ingredients.map(fi => ({ ingredientId: fi.ingredientId, quantity: fi.quantity, unit: fi.unit }))
      }));

      const res = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, imageUrl, baseRecipeId, flavors: payloadFlavors })
      });

      if (!res.ok) throw new Error('Failed to save');
      
      toast.success(`Menu Item ${editingId ? 'updated' : 'added'}!`);
      setIsWizardOpen(false);
      loadData();
    } catch (error) {
      toast.error('Failed to save product');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/products/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Deleted');
      loadData();
    } catch (err) {
      toast.error('Failed to delete product');
    }
  };

  const openWizard = (product?: any) => {
    setStep(1);
    if (product) {
      setEditingId(product.id);
      setName(product.name);
      setDescription(product.description || '');
      setImageUrl(product.imageUrl || '');
      setBaseRecipeId(product.baseRecipeId || '');
      
      // Load flavors mapping
      if (product.flavors) {
        setFlavors(product.flavors.map((f: any) => ({
          id: f.id,
          name: f.name,
          ingredients: f.ingredients.map((fi: any) => ({
            ingredientId: fi.ingredientId,
            quantity: fi.quantity.toString(),
            unit: fi.unit
          })),
          pricingMode: 'ai',
          manualPrice: f.suggestedPrice || ''
        })));
      } else {
        setFlavors([]);
      }
    } else {
      setEditingId(null);
      setName('');
      setDescription('');
      setImageUrl('');
      setBaseRecipeId('');
      setFlavors([{ name: 'Classic', ingredients: [], pricingMode: 'ai', manualPrice: '' }]); // default flavor
    }
    setMixedBoxSelection({});
    setIsWizardOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('image', file);

    const token = localStorage.getItem('token');
    setUploading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setImageUrl(data.url);
      toast.success('Image uploaded!');
    } catch (err) {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const toggleDescription = (id: string) => {
    setExpandedDescriptions(prev => 
      prev.includes(id) ? prev.filter(descId => descId !== id) : [...prev, id]
    );
  };

  const addFlavor = () => setFlavors([...flavors, { name: '', ingredients: [], pricingMode: 'ai', manualPrice: '' }]);
  const updateFlavorName = (index: number, newName: string) => {
    const f = [...flavors]; f[index].name = newName; setFlavors(f);
  };
  const removeFlavor = (index: number) => setFlavors(flavors.filter((_, i) => i !== index));

  const addFlavorIngredient = (fIndex: number) => {
    const f = [...flavors]; f[fIndex].ingredients.push({ ingredientId: '', quantity: '0', unit: 'g' }); setFlavors(f);
  };
  const updateFlavorIngredient = (fIndex: number, iIndex: number, field: keyof FlavorIngredient, value: string) => {
    const f = [...flavors]; f[fIndex].ingredients[iIndex][field] = value as any; setFlavors(f);
  };
  const removeFlavorIngredient = (fIndex: number, iIndex: number) => {
    const f = [...flavors]; f[fIndex].ingredients.splice(iIndex, 1); setFlavors(f);
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  if (!business) return null;

  return (
    <div className="pb-12">
      {!isWizardOpen ? (
        <>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">AI Menu Builder</h1>
              <p className="text-slate-500 mt-1">Let AI automatically price your flavors based on live ingredient costs.</p>
            </div>
            <button className="btn btn-primary shadow-md hover:shadow-lg transition-shadow" onClick={() => openWizard()}>
              <Sparkles size={18} className="mr-2"/> Build Menu Item
            </button>
          </div>

          <div className="card mb-6">
            <div className="input-icon-wrapper w-full max-w-md">
              <Search className="icon" size={18} />
              <input type="text" className="input" placeholder="Search menu items..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.length > 0 ? (
              filtered.map(p => (
                <motion.div whileHover={{ y: -4 }} key={p.id} className="card p-0 overflow-hidden shadow-sm hover:shadow-md border border-slate-100 flex flex-col">
                  <div className="h-32 w-full bg-primary/5 flex items-center justify-center border-b border-primary/10 overflow-hidden">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="text-primary/30" size={32} />
                    )}
                  </div>
                  <div className="p-6 border-b border-slate-50 bg-white flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-bold text-slate-800">{p.name}</h3>
                      <div className="flex gap-1">
                        <button className="p-1.5 text-slate-400 hover:text-primary transition-colors bg-slate-50 rounded-md" onClick={() => openWizard(p)}><Edit2 size={14} /></button>
                        <button className="p-1.5 text-slate-400 hover:text-red-500 transition-colors bg-slate-50 rounded-md" onClick={() => handleDelete(p.id)}><Trash2 size={14} /></button>
                      </div>
                    </div>
                    <div>
                      <p className={`text-sm text-slate-500 mb-1 ${expandedDescriptions.includes(p.id) ? '' : 'line-clamp-2'}`}>
                        {p.description || 'No description'}
                      </p>
                      {p.description && p.description.length > 80 && (
                        <button 
                          className="text-xs font-bold text-primary hover:text-primary/80 mb-3" 
                          onClick={() => toggleDescription(p.id)}
                        >
                          {expandedDescriptions.includes(p.id) ? 'See less' : 'See more'}
                        </button>
                      )}
                      {(!p.description || p.description.length <= 80) && <div className="mb-3"></div>}
                    </div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-md mb-4">
                      <Box size={12}/> {p.baseRecipe?.name || 'No Base Recipe'}
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 p-4 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Flavors</p>
                    {p.flavors && p.flavors.length > 0 ? (
                      <div className="space-y-2">
                        {p.flavors.map((f: any) => (
                          <div key={f.id} className="flex justify-between items-center bg-white p-2 px-3 rounded-lg border border-slate-100 shadow-sm text-sm">
                            <span className="font-medium text-slate-700">{f.name}</span>
                            <span className="text-primary font-bold">{formatCurrency(f.suggestedPrice || 0, business.currency)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-400 italic">No flavors configured.</p>
                        <button className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1" onClick={() => openWizard(p)}><Plus size={12}/> Add flavor</button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full empty-state card flex flex-col items-center justify-center p-12">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
                  <Sparkles size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">No menu items yet</h3>
                <p className="text-slate-500 max-w-sm text-center">Use the AI Menu Builder to connect your recipes and ingredients and automatically calculate selling prices.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        /* WIZARD UI */
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
          
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="text-primary" /> {editingId ? 'Edit' : 'Create'} Menu Item
            </h2>
            <button className="btn btn-ghost text-slate-500" onClick={() => setIsWizardOpen(false)}>Cancel</button>
          </div>

          <div className="flex gap-2 mb-8 overflow-hidden rounded-full bg-slate-100 p-1">
            {[1, 2, 3].map(s => (
              <div key={s} className={`flex-1 text-center py-2 text-sm font-bold rounded-full transition-colors ${step === s ? 'bg-white shadow text-primary' : 'text-slate-400'}`}>
                {s === 1 && '1. Base Info'}
                {s === 2 && '2. AI Flavor Builder'}
                {s === 3 && '3. Pricing Insights'}
              </div>
            ))}
          </div>

          <div className="card shadow-xl border-primary/10">
            {step === 1 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Menu Item Name</label>
                  <input type="text" className="input" placeholder="e.g. The Ultimate Brownie Collection" value={name} onChange={e => setName(e.target.value)} autoFocus/>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Description (Optional)</label>
                  <textarea className="input" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">Product Image (Optional)</label>
                  <div className="flex gap-4 items-center">
                    {imageUrl && (
                      <div className="h-16 w-16 rounded-md overflow-hidden bg-slate-100 border border-slate-200">
                        <img src={imageUrl} alt="Preview" className="h-full w-full object-cover" />
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/jpeg, image/png, image/webp" 
                      onChange={handleFileUpload} 
                      className="block w-full text-sm text-slate-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-primary/10 file:text-primary
                        hover:file:bg-primary/20
                        cursor-pointer"
                      disabled={uploading}
                    />
                    {uploading && <span className="text-sm text-slate-400">Uploading...</span>}
                  </div>
                </div>
                <div className="p-5 bg-primary/5 rounded-2xl border border-primary/20">
                  <label className="block text-sm font-bold text-primary mb-2 flex items-center gap-2">
                    <Box size={16}/> Select Base Recipe
                  </label>
                  <p className="text-sm text-slate-600 mb-4">The AI will use the base recipe's cost to calculate all your flavor variations.</p>
                  <select className="input bg-white border-primary/30" value={baseRecipeId} onChange={e => setBaseRecipeId(e.target.value)}>
                    <option value="">-- Choose Recipe --</option>
                    {recipes.map(r => <option key={r.id} value={r.id}>{r.name} (Yields {r.yield})</option>)}
                  </select>
                </div>
                
                <div className="flex justify-end mt-8">
                  <button className="btn btn-primary" disabled={!name || !baseRecipeId} onClick={() => setStep(2)}>
                    Next: Build Flavors <ChevronRight size={18}/>
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-slate-800">AI Flavor Builder</h3>
                  <p className="text-slate-500">Define the unique ingredients for each flavor. The AI automatically prices them based on your pantry.</p>
                </div>

                <div className="space-y-6">
                  {flavors.map((flavor, fIdx) => (
                    <div key={fIdx} className="border border-slate-200 rounded-2xl p-5 bg-slate-50 relative group">
                      <button className="absolute top-4 right-4 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeFlavor(fIdx)}>
                        <Trash2 size={16} />
                      </button>
                      
                      <div className="w-2/3 mb-4">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Flavor Name</label>
                        <input type="text" className="input bg-white" placeholder="e.g. Lotus Biscoff" value={flavor.name} onChange={e => updateFlavorName(fIdx, e.target.value)}/>
                      </div>

                      <div className="space-y-3 mb-4">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Extra Ingredients</label>
                        {flavor.ingredients.map((ing, iIdx) => (
                          <div key={iIdx} className="flex gap-2 items-center">
                            <select className="input bg-white flex-1" value={ing.ingredientId} onChange={e => updateFlavorIngredient(fIdx, iIdx, 'ingredientId', e.target.value)}>
                              <option value="">Select Ingredient...</option>
                              {ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({formatCurrency(i.cost, business.currency)}/{i.unit})</option>)}
                            </select>
                            <input type="number" className="input bg-white w-24" placeholder="Qty" value={ing.quantity} onChange={e => updateFlavorIngredient(fIdx, iIdx, 'quantity', e.target.value)}/>
                            <select className="input bg-white w-24" value={ing.unit} onChange={e => updateFlavorIngredient(fIdx, iIdx, 'unit', e.target.value)}>
                              <option>g</option><option>kg</option><option>ml</option><option>L</option><option>pcs</option>
                            </select>
                            <button className="p-2 text-slate-400 hover:text-red-500" onClick={() => removeFlavorIngredient(fIdx, iIdx)}><Trash2 size={16}/></button>
                          </div>
                        ))}
                      </div>
                      
                      <button className="text-sm font-bold text-primary hover:text-primary/80 flex items-center gap-1" onClick={() => addFlavorIngredient(fIdx)}>
                        <Plus size={14}/> Add Ingredient
                      </button>
                    </div>
                  ))}
                </div>

                <button className="w-full mt-4 py-4 border-2 border-dashed border-primary/30 rounded-2xl text-primary font-bold hover:bg-primary/5 transition-colors flex items-center justify-center gap-2" onClick={addFlavor}>
                  <Plus size={18}/> Add Another Flavor
                </button>

                <div className="flex justify-between mt-8">
                  <button className="btn btn-ghost" onClick={() => setStep(1)}><ChevronLeft size={18}/> Back</button>
                  <button className="btn btn-primary" onClick={() => setStep(3)}>Generate AI Pricing <Sparkles size={18} className="ml-1"/></button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="text-center mb-10">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 text-primary rounded-full mb-4">
                    <Sparkles size={32} />
                  </div>
                  <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight">AI Insights & Pricing</h3>
                  <p className="text-slate-500 mt-2 max-w-lg mx-auto">The AI has automatically calculated costs and suggested prices for all flavors using your live ingredient data and {business.profitMargin}x target margin.</p>
                </div>

                <h4 className="font-bold text-lg mb-4 text-slate-800">Flavor Pricing Cards</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                  {processedFlavors.map((flavor, idx) => (
                    <div key={idx} className="border border-slate-200 rounded-2xl p-5 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="text-xl font-bold text-slate-800">{flavor.name || 'Unnamed Flavor'}</h4>
                        <div className="flex bg-slate-100 rounded-lg p-1">
                          <button 
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${flavor.pricingMode !== 'manual' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            onClick={() => {
                              const f = [...flavors];
                              f[idx].pricingMode = 'ai';
                              setFlavors(f);
                            }}
                          >
                            AI
                          </button>
                          <button 
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${flavor.pricingMode === 'manual' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            onClick={() => {
                              const f = [...flavors];
                              f[idx].pricingMode = 'manual';
                              if (!f[idx].manualPrice) f[idx].manualPrice = flavor.suggestedPrice;
                              setFlavors(f);
                            }}
                          >
                            Manual
                          </button>
                        </div>
                      </div>
                      <div className="space-y-3 flex-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Production Cost</span>
                          <span className="font-bold text-slate-700">{formatCurrency(flavor.productionCost || 0, business.currency)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Profit Margin</span>
                          <span className={`font-bold ${(flavor.profitMargin || 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>{(flavor.profitMargin || 0).toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="pt-3 mt-3 border-t border-slate-100 flex justify-between items-center">
                        <span className="font-bold text-slate-800">Final Price</span>
                        {flavor.pricingMode === 'manual' ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-400">{business.currency}</span>
                            <input 
                              type="number" 
                              className="input bg-slate-50 w-24 text-right py-1 px-2 text-lg font-black text-primary" 
                              value={flavor.manualPrice} 
                              onChange={(e) => {
                                const f = [...flavors];
                                f[idx].manualPrice = e.target.value;
                                setFlavors(f);
                              }}
                            />
                          </div>
                        ) : (
                          <span className="text-2xl font-black text-primary">{formatCurrency(flavor.suggestedPrice || 0, business.currency)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200 mb-8">
                  <h4 className="font-bold text-xl mb-6 text-slate-800 flex items-center gap-2">
                    <Box className="text-primary"/> Box Pricing Calculator
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-3">Custom Mixed Box</label>
                      <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200">
                        {processedFlavors.map((flavor, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <span className="text-sm font-medium text-slate-700">{flavor.name || 'Flavor'}</span>
                            <div className="flex items-center gap-2">
                              <button className="w-6 h-6 rounded bg-slate-100 text-slate-600 hover:bg-slate-200" onClick={() => setMixedBoxSelection({...mixedBoxSelection, [idx]: Math.max(0, (mixedBoxSelection[idx]||0) - 1)})}>-</button>
                              <span className="w-4 text-center text-sm font-bold">{mixedBoxSelection[idx] || 0}</span>
                              <button className="w-6 h-6 rounded bg-slate-100 text-slate-600 hover:bg-slate-200" onClick={() => setMixedBoxSelection({...mixedBoxSelection, [idx]: (mixedBoxSelection[idx]||0) + 1})}>+</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex flex-col justify-center">
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">
                          Box of {boxPricing.totalItems || boxQuantity} Price
                        </p>
                        <p className="text-4xl font-black text-slate-800 mb-1">
                          {formatCurrency(boxPricing.totalItems > 0 ? boxPricing.mixedBoxPrice : boxPricing.defaultBoxPrice, business.currency)}
                        </p>
                        <p className="text-sm text-slate-400">
                          Cost: {formatCurrency(boxPricing.totalItems > 0 ? boxPricing.mixedBoxTotalCost : boxPricing.defaultBoxCost, business.currency)}
                        </p>
                      </div>
                      {boxPricing.totalItems === 0 && (
                        <div className="mt-4 flex gap-2 justify-center">
                          {[1, 6, 12, 24].map(q => (
                            <button key={q} onClick={() => setBoxQuantity(q)} className={`px-4 py-2 rounded-full text-sm font-bold border transition-colors ${boxQuantity === q ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                              {q === 1 ? '1 Piece' : `${q} Pack`}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between mt-8 border-t border-slate-100 pt-6">
                  <button className="btn btn-ghost" onClick={() => setStep(2)}><ChevronLeft size={18}/> Back</button>
                  <button className="btn btn-primary px-8" onClick={handleSubmit}>Save AI Menu Item <CheckCircle size={18} className="ml-1"/></button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
