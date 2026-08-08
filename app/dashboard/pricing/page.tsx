'use client';

import { useState, useContext, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Sparkles, ChevronRight, ChevronLeft, CheckCircle, AlertTriangle, ArrowRight, Heart, Info } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import confetti from 'canvas-confetti';
import { BusinessContext } from '../layout';
import { formatCurrency } from '../../lib/utils';

// Helper component for counting numbers up
const CountUpNumber = ({ value, currency }: { value: number, currency: string }) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(count, value, { duration: 1.5, ease: "easeOut" });
    const unsubscribe = rounded.on("change", (latest) => setDisplay(latest));
    return () => { controls.stop(); unsubscribe(); };
  }, [value, count, rounded]);

  return <span>{formatCurrency(display, currency, 'en')}</span>;
};

const AIThinkingScreen = () => {
  const [tasks, setTasks] = useState<string[]>([]);
  const allTasks = [
    "Reading your recipe...",
    "Calculating ingredient costs...",
    "Searching local bakeries...",
    "Comparing competitors...",
    "Calculating ideal profit...",
    "Building pricing strategy..."
  ];

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      if (current < allTasks.length) {
        setTasks(prev => {
          if (!prev.includes(allTasks[current])) return [...prev, allTasks[current]];
          return prev;
        });
        current++;
      } else {
        clearInterval(interval);
      }
    }, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }} 
      animate={{ opacity: 1, scale: 1 }} 
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.4 }}
      className="card text-center py-16 flex flex-col items-center justify-center relative overflow-hidden bg-white/80 backdrop-blur-md shadow-xl border-primary/20"
    >
       <motion.div 
         animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }} 
         transition={{ repeat: Infinity, duration: 2 }}
         className="mb-8 relative"
       >
         <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full" />
         <Sparkles size={56} className="text-primary relative z-10 drop-shadow-md" />
       </motion.div>
       <h2 className="text-2xl font-bold mb-8 text-slate-800 tracking-tight">✨ Bakery AI is working...</h2>
       <div className="text-left space-y-4 max-w-xs w-full mx-auto">
         <AnimatePresence>
           {tasks.map((task, i) => (
             <motion.div 
               key={task} 
               initial={{ opacity: 0, x: -20, height: 0 }} 
               animate={{ opacity: 1, x: 0, height: 'auto' }}
               className="flex items-center gap-3 text-slate-700 font-medium"
             >
               <motion.div
                 initial={{ scale: 0 }}
                 animate={{ scale: 1 }}
                 transition={{ type: "spring", stiffness: 300, damping: 20 }}
               >
                 <CheckCircle size={22} className="text-green-500" />
               </motion.div>
               {task}
             </motion.div>
           ))}
         </AnimatePresence>
       </div>
    </motion.div>
  );
};

const VisualStepper = ({ currentStep }: { currentStep: number }) => {
  const steps = [
    { num: 1, label: "Recipe" },
    { num: 2, label: "Costs" },
    { num: 3, label: "Profile" },
    { num: 4, label: "Analysis" }
  ];

  return (
    <div className="w-full max-w-2xl mx-auto mt-6 mb-8 px-4">
      <div className="flex items-center justify-between relative">
        {/* Background Line */}
        <div className="absolute left-0 right-0 top-4 h-1 bg-slate-100 rounded-full z-0 translate-y-[-50%]" />
        
        {/* Animated Progress Line */}
        <motion.div 
          className="absolute left-0 top-4 h-1 bg-primary rounded-full z-0 translate-y-[-50%]"
          initial={{ width: '0%' }}
          animate={{ width: `${(Math.max(1, currentStep) - 1) / (steps.length - 1) * 100}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />

        {/* Step Indicators */}
        {steps.map((s, i) => {
          const isCompleted = currentStep > s.num || (currentStep === 4 && s.num === 4);
          const isCurrent = currentStep === s.num;
          const isUpcoming = currentStep < s.num;

          return (
            <div key={s.num} className="relative z-10 flex flex-col items-center gap-2">
              <motion.div
                initial={false}
                animate={{ scale: isCurrent ? 1.2 : 1 }}
                transition={{ duration: 0.3 }}
                className="w-8 h-8 rounded-full border-2 flex items-center justify-center shadow-sm z-10 transition-colors duration-300"
                style={{
                  backgroundColor: isCompleted || isCurrent ? 'var(--primary)' : 'white',
                  borderColor: isCompleted || isCurrent ? 'var(--primary)' : '#e2e8f0',
                  color: isCompleted || isCurrent ? 'white' : '#94a3b8'
                }}
              >
                {isCompleted ? (
                  <CheckCircle size={16} className="text-white" />
                ) : (
                  <span className="text-xs font-bold">{s.num}</span>
                )}
              </motion.div>
              <div className="absolute top-10 w-24 text-center left-1/2 -translate-x-1/2">
                <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ${isCurrent ? 'text-primary' : isCompleted ? 'text-slate-600' : 'text-slate-400'}`}>
                  {s.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function MagicPricingWizard() {
  const { business } = useContext(BusinessContext);
  
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1); // 1 for forward, -1 for backward
  const [isLoading, setIsLoading] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<'budget' | 'competitive' | 'recommended' | 'premium'>('recommended');
  
  const [recipes, setRecipes] = useState<any[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('Cake');
  const [servingSize, setServingSize] = useState('12 slices');
  
  const [ingredientCost, setIngredientCost] = useState('');
  const [packagingCost, setPackagingCost] = useState('');
  const [laborTime, setLaborTime] = useState('120');
  const [utilitiesEstimate, setUtilitiesEstimate] = useState('');
  const [deliveryCost, setDeliveryCost] = useState('');
  const [targetMargin, setTargetMargin] = useState('50');
  
  const [businessType, setBusinessType] = useState('Home Bakery');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');

  const router = useRouter();

  useEffect(() => {
    if (business) {
      if (business.country) setCountry(business.country);
      if (business.city) setCity(business.city);
      
      const token = localStorage.getItem('token');
      if (token) {
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/recipes`, { headers: { 'Authorization': `Bearer ${token}` } })
          .then(res => res.json())
          .then(data => setRecipes(data))
          .catch(err => console.error(err));
      }
    }
  }, [business]);

  // Trigger confetti when AI finishes and shows result
  useEffect(() => {
    if (step === 4 && result && !isLoading) {
      setTimeout(() => {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f472b6', '#fb7185', '#38bdf8', '#34d399']
        });
      }, 500);
    }
  }, [step, result, isLoading]);

  const handleNext = () => {
    setDirection(1);
    setStep(s => s + 1);
  };
  const handleBack = () => {
    setDirection(-1);
    setStep(s => s - 1);
  };

  const handleNextFromStep1 = async () => {
    if (ingredientCost && parseFloat(ingredientCost) > 0) {
      handleNext();
      return;
    }
    
    setIsEstimating(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/ai/estimate-costs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ productName, category, servingSize })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ingredientCost !== undefined) setIngredientCost(data.ingredientCost.toString());
        if (data.packagingCost !== undefined) setPackagingCost(data.packagingCost.toString());
        if (data.laborTime !== undefined) setLaborTime(data.laborTime.toString());
        if (data.utilitiesEstimate !== undefined) setUtilitiesEstimate(data.utilitiesEstimate.toString());
        if (data.deliveryCost !== undefined) setDeliveryCost(data.deliveryCost.toString());
      } else {
        // Fallback if the AI API fails (e.g., due to insufficient credits)
        setIngredientCost('5.00');
        setPackagingCost('1.50');
        setLaborTime('120');
        setUtilitiesEstimate('0.50');
        setDeliveryCost('2.00');
      }
    } catch (err) {
      console.error('Failed to estimate costs', err);
      // Fallback if the AI API fails completely
      setIngredientCost('5.00');
      setPackagingCost('1.50');
      setLaborTime('120');
      setUtilitiesEstimate('0.50');
      setDeliveryCost('2.00');
    } finally {
      setIsEstimating(false);
      handleNext();
    }
  };

  const calculatePrice = async () => {
    setDirection(1);
    setStep(4);
    setIsLoading(true);
    setResult(null);

    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/ai/calculate-price`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productName, category, servingSize,
          ingredients: [{ cost: ingredientCost || '0' }], 
          packagingCost: packagingCost || '0', 
          laborTime,
          utilitiesEstimate: utilitiesEstimate || '0',
          deliveryCost: deliveryCost || '0',
          targetMargin,
          businessType, country, city
        })
      });

      if (!res.ok) throw new Error('AI pricing failed');
      const data = await res.json();
      
      // Delay setting result to allow AI thinking screen to finish its checklist naturally
      setTimeout(() => {
        setResult(data);
        setIsLoading(false);
        toast.success('Magic price calculated successfully!', { icon: '✨' });
      }, 3500);
      
    } catch (err) {
      toast.error('Could not calculate price.');
      setDirection(-1);
      setStep(3);
      setIsLoading(false);
    }
  };

  const saveToMenu = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const desc = servingSize ? `Minimum order: ${servingSize}` : '';
      const finalPrice = result?.strategies?.[selectedStrategy]?.price || result?.recommendation?.suggestedPrice || 0;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: productName || 'Untitled Treat',
          description: desc,
          sellingPrice: finalPrice
        })
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('Saved to My Menu!');
      router.push('/dashboard/products');
    } catch (err) {
      toast.error('Could not save to menu');
    } finally {
      setIsSaving(false);
    }
  };

  if (!business) return null;

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0,
      filter: 'blur(4px)'
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      filter: 'blur(0px)'
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 50 : -50,
      opacity: 0,
      filter: 'blur(4px)'
    })
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative min-h-screen pb-12"
    >
      <div style={{ maxWidth: '800px', margin: '0 auto', paddingTop: '3rem' }}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}
          className="mb-12 text-center flex flex-col items-center"
        >
          <motion.div
            animate={{ y: [0, -8, 0], rotate: [0, -3, 3, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6 border border-primary/20 shadow-inner"
          >
            <span className="text-3xl">✨</span>
          </motion.div>
          <h1 className="text-4xl font-extrabold flex items-center justify-center gap-3 text-slate-800 tracking-tight">
            Magic Pricing Wizard
          </h1>
          <p className="text-slate-500 mt-4 text-lg max-w-md mx-auto leading-relaxed">
            Your AI bakery consultant is analysing your product and local market.
          </p>
          
          <div className="mb-4 w-full max-w-lg mt-8">
            <VisualStepper currentStep={step} />
          </div>
        </motion.div>

        <div className="relative">
          <AnimatePresence custom={direction} mode="wait">
            
            {/* Step 1 */}
            {step === 1 && (
              <motion.div 
                key="step1" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4 }}
                className="card shadow-lg border-slate-100 bg-white"
              >
                <h2 className="text-2xl font-bold mb-6 text-slate-800">1. The Treat</h2>
                
                <div className="input-group">
                  <label>Select a Recipe to Price</label>
                  <motion.select 
                    whileFocus={{ scale: 1.01, boxShadow: '0 0 0 3px rgba(244,114,182,0.2)' }}
                    className="input mb-4 border-primary/50 text-primary bg-primary/5 cursor-pointer outline-none transition-shadow" 
                    value={selectedRecipeId || ""}
                    onChange={(e) => {
                      const r = recipes.find(rec => rec.id === e.target.value);
                      setSelectedRecipeId(e.target.value || null);
                      if (r) {
                        setProductName(r.name);
                        setCategory(r.category || 'Cake');
                        setServingSize(r.yield ? `${r.yield} pieces` : '12 slices');
                        const ingCost = r.totalCost - (r.laborCost || 0) - (r.utilitiesCost || 0) - (r.packagingCost || 0);
                        setIngredientCost(ingCost > 0 ? ingCost.toString() : '0');
                        setPackagingCost(r.packagingCost?.toString() || '0');
                        setUtilitiesEstimate(r.utilitiesCost?.toString() || '0');
                        const mins = r.laborCost ? (r.laborCost / 250) * 60 : 120;
                        setLaborTime(mins.toString());
                      }
                    }}
                  >
                    <option value="" disabled>-- Select a Recipe --</option>
                    {recipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </motion.select>
                </div>

                <div className="input-group">
                  <label>What are you baking?</label>
                  <motion.input whileFocus={{ scale: 1.01, boxShadow: '0 0 0 3px rgba(244,114,182,0.2)' }} type="text" className="input outline-none transition-shadow" placeholder="e.g., Chocolate Fudge Brownies" value={productName} onChange={e => setProductName(e.target.value)} />
                </div>
                
                <div className="grid grid-cols-2 gap-5">
                  <div className="input-group">
                    <label>Category</label>
                    <motion.select whileFocus={{ scale: 1.01, boxShadow: '0 0 0 3px rgba(244,114,182,0.2)' }} className="input outline-none transition-shadow" value={category} onChange={e => setCategory(e.target.value)}>
                      <option>Cake</option>
                      <option>Cupcakes</option>
                      <option>Cookies</option>
                      <option>Brownies</option>
                      <option>Bread</option>
                      <option>Pastry</option>
                      <option>Other</option>
                    </motion.select>
                  </div>
                  <div className="input-group">
                    <label>Serving Size / Quantity</label>
                    <motion.input whileFocus={{ scale: 1.01, boxShadow: '0 0 0 3px rgba(244,114,182,0.2)' }} type="text" className="input outline-none transition-shadow" placeholder="e.g., 12 pieces" value={servingSize} onChange={e => setServingSize(e.target.value)} />
                  </div>
                </div>
                
                <div className="flex justify-end mt-8">
                  <motion.button 
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    className="btn btn-primary px-6" onClick={handleNextFromStep1} disabled={!selectedRecipeId}
                  >
                    {isEstimating ? <span className="animate-spin mr-2"><Sparkles size={18} /></span> : null}
                    {isEstimating ? 'Estimating...' : 'Next Step'} <ArrowRight size={18} />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <motion.div key="step2" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4 }} className="card shadow-lg border-slate-100 bg-white">
                <div className="mb-6 flex items-start gap-4 bg-primary/5 p-5 rounded-2xl border border-primary/10">
                  <Sparkles className="text-primary mt-1 flex-shrink-0" size={24} />
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">2. The Recipe & Cost</h2>
                    <p className="text-sm text-slate-600 mt-1">We've estimated these costs. Feel free to adjust them if you have exact numbers!</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-5">
                  <div className="input-group">
                    <label>Ingredients Cost ({business.currency})</label>
                    <motion.input whileFocus={{ scale: 1.01, boxShadow: '0 0 0 3px rgba(244,114,182,0.2)' }} type="number" step="0.01" className="input outline-none transition-shadow" placeholder="e.g. 5.00" value={ingredientCost} onChange={e => setIngredientCost(e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label>Packaging Cost ({business.currency})</label>
                    <motion.input whileFocus={{ scale: 1.01, boxShadow: '0 0 0 3px rgba(244,114,182,0.2)' }} type="number" step="0.01" className="input outline-none transition-shadow" placeholder="e.g. 1.50" value={packagingCost} onChange={e => setPackagingCost(e.target.value)} />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-5 mt-2">
                  <div className="input-group">
                    <label>Utilities Estimate ({business.currency})</label>
                    <motion.input whileFocus={{ scale: 1.01, boxShadow: '0 0 0 3px rgba(244,114,182,0.2)' }} type="number" step="0.01" className="input outline-none transition-shadow" placeholder="e.g. 0.50" value={utilitiesEstimate} onChange={e => setUtilitiesEstimate(e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label>Delivery Cost ({business.currency})</label>
                    <motion.input whileFocus={{ scale: 1.01, boxShadow: '0 0 0 3px rgba(244,114,182,0.2)' }} type="number" step="0.01" className="input outline-none transition-shadow" placeholder="e.g. 2.00" value={deliveryCost} onChange={e => setDeliveryCost(e.target.value)} />
                  </div>
                </div>
                
                <div className="input-group mt-2">
                  <label>Target Profit Margin (%)</label>
                  <motion.input whileFocus={{ scale: 1.01, boxShadow: '0 0 0 3px rgba(244,114,182,0.2)' }} type="number" className="input outline-none transition-shadow" value={targetMargin} onChange={e => setTargetMargin(e.target.value)} />
                </div>
                
                <div className="input-group mt-2">
                  <label>Active Labor Time (Minutes)</label>
                  <motion.input whileFocus={{ scale: 1.01, boxShadow: '0 0 0 3px rgba(244,114,182,0.2)' }} type="number" className="input outline-none transition-shadow" value={laborTime} onChange={e => setLaborTime(e.target.value)} />
                  <p className="text-xs text-slate-500 mt-2 font-medium"><Info size={12} className="inline mr-1" /> Your time is valuable! We'll factor this into the recommended price.</p>
                </div>
                
                <div className="flex justify-between mt-8">
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="btn bg-slate-100 text-slate-600 hover:bg-slate-200" onClick={handleBack}><ChevronLeft size={18} /> Back</motion.button>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="btn btn-primary px-6" onClick={handleNext} disabled={!ingredientCost || !laborTime}>Next Step <ArrowRight size={18} /></motion.button>
                </div>
              </motion.div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <motion.div key="step3" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4 }} className="card shadow-lg border-slate-100 bg-white">
                <h2 className="text-2xl font-bold mb-6 text-slate-800">3. Your Bakery Location</h2>
                <div className="input-group">
                  <label>Business Type</label>
                  <motion.select whileFocus={{ scale: 1.01, boxShadow: '0 0 0 3px rgba(244,114,182,0.2)' }} className="input outline-none transition-shadow" value={businessType} onChange={e => setBusinessType(e.target.value)}>
                    <option>Home Bakery</option>
                    <option>Retail Storefront</option>
                    <option>Wholesale</option>
                  </motion.select>
                </div>
                <div className="grid grid-cols-2 gap-5 mt-2">
                  <div className="input-group">
                    <label>Country</label>
                    <motion.input whileFocus={{ scale: 1.01, boxShadow: '0 0 0 3px rgba(244,114,182,0.2)' }} type="text" className="input outline-none transition-shadow" value={country} onChange={e => setCountry(e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label>City</label>
                    <motion.input whileFocus={{ scale: 1.01, boxShadow: '0 0 0 3px rgba(244,114,182,0.2)' }} type="text" className="input outline-none transition-shadow" value={city} onChange={e => setCity(e.target.value)} />
                  </div>
                </div>
                <div className="flex justify-between mt-8">
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="btn bg-slate-100 text-slate-600 hover:bg-slate-200" onClick={handleBack}><ChevronLeft size={18} /> Back</motion.button>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="btn btn-primary px-6" onClick={calculatePrice} disabled={!country || !city}>
                    <Sparkles size={18} /> Calculate Magic Price
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Loading AI OR Dashboard */}
            {step === 4 && (
              <motion.div key="step4" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.5 }}>
                
                {isLoading ? (
                  <AIThinkingScreen />
                ) : result ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 50, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="card border-primary/20 p-0 overflow-hidden shadow-2xl bg-white/90 backdrop-blur-md rounded-3xl"
                  >
                    {/* SECTION 1: Your Product */}
                    <div className="p-8 bg-white/50 border-b border-slate-100 rounded-t-3xl">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
                        <div>
                          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">{productName}</h2>
                          <p className="text-sm font-medium text-slate-500 uppercase tracking-widest mt-1">Cost & Profit Analysis</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <motion.div whileHover={{ scale: 1.02 }} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center">
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Total Cost</p>
                          <p className="text-xl font-bold text-slate-700"><CountUpNumber value={result.costs?.totalProduction || 0} currency={business.currency} /></p>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.02 }} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center">
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Per Serving</p>
                          <p className="text-xl font-bold text-slate-700"><CountUpNumber value={result.costs?.costPerPiece || 0} currency={business.currency} /></p>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.02 }} className="bg-primary/5 p-5 rounded-2xl border border-primary/20 text-center shadow-inner">
                          <p className="text-[10px] text-primary font-bold uppercase tracking-widest mb-2">Suggested Price</p>
                          <p className="text-xl font-bold text-primary">
                            <CountUpNumber value={result.strategies?.[selectedStrategy]?.price || result.recommendation?.suggestedPrice || 0} currency={business.currency} />
                          </p>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.02 }} className="bg-green-50 p-5 rounded-2xl border border-green-100 text-center shadow-inner relative overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }} 
                            animate={{ width: '100%' }} 
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="absolute bottom-0 left-0 h-1 bg-green-400"
                          />
                          <p className="text-[10px] text-green-700 font-bold uppercase tracking-widest mb-2">Expected Profit</p>
                          <p className="text-xl font-bold text-green-800">
                            <CountUpNumber value={(result.strategies?.[selectedStrategy]?.price || result.recommendation?.suggestedPrice || 0) - (result.costs?.totalProduction || 0)} currency={business.currency} />
                          </p>
                        </motion.div>
                      </div>
                    </div>



                    {/* SECTION 4: AI Recommendation */}
                    <div className="p-8 bg-primary/5 border-b border-primary/20 relative overflow-hidden">
                      <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 rounded-full blur-3xl opacity-50 pointer-events-none" />
                      <div className="bg-white rounded-3xl p-8 border border-primary/20 shadow-lg relative z-10">
                        <div className="flex flex-col lg:flex-row gap-8">
                          <div className="flex-1">
                            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-primary to-pink-400 text-white text-xs font-black uppercase tracking-wider rounded-full mb-4 shadow-md">
                              ⭐ AI Recommended
                            </motion.div>
                            <h3 className="font-bold text-lg text-slate-500 mb-1 uppercase tracking-widest text-[10px]">Suggested Selling Price</h3>
                            <div className="text-5xl font-black text-slate-800 tracking-tighter mb-4 text-glow">
                              <CountUpNumber value={result.recommendation?.suggestedPrice || 0} currency={business.currency} />
                            </div>
                            
                            {result.recommendation?.confidence && (
                              <div className="inline-flex items-center gap-1.5 text-green-600 text-sm font-bold bg-green-50 px-3 py-1.5 rounded-xl border border-green-100">
                                <CheckCircle size={16} /> {result.recommendation.confidence} Confidence Score
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 bg-slate-50 rounded-2xl p-6 border border-slate-100">
                            <p className="font-black text-slate-800 mb-3 text-sm uppercase tracking-wider">Why this price?</p>
                            <ul className="space-y-3">
                              {result.recommendation?.reasons?.map((reason: string, i: number) => (
                                <motion.li 
                                  key={i}
                                  initial={{ opacity: 0, x: 20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.4 + (i * 0.1) }}
                                  className="flex items-start gap-3 text-slate-600 text-sm font-medium"
                                >
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                                  {reason}
                                </motion.li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 5 & 6: Position Yourself & Pricing Strategies */}
                    <div className="p-8 bg-white border-b border-slate-100">
                      <div className="mb-8">
                        <h3 className="font-bold text-xl mb-6 text-slate-800">Position Yourself</h3>
                        
                        {/* Summary Card */}
                        <div className="bg-white p-6 rounded-2xl border-2 border-slate-100 shadow-sm text-center">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Current Strategy</p>
                          <motion.p 
                            key={selectedStrategy}
                            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            className="text-4xl font-black text-slate-800 mb-4"
                          >
                            {formatCurrency(result.strategies?.[selectedStrategy]?.price || result.recommendation?.suggestedPrice || 0, business.currency, 'en')}
                          </motion.p>
                          
                          <motion.div 
                            key={selectedStrategy + "-badge"}
                            initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-green-100 text-green-700"
                          >
                            {selectedStrategy === 'budget' && "Budget Position"}
                            {selectedStrategy === 'competitive' && "Competitive Position"}
                            {selectedStrategy === 'recommended' && "Recommended Position"}
                            {selectedStrategy === 'premium' && "Premium Position"}
                          </motion.div>
                        </div>
                      </div>

                      {/* Strategy Rows */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Budget Card (Secondary) */}
                        <motion.button 
                          onClick={() => setSelectedStrategy('budget')}
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          className={`flex flex-col items-center justify-center py-4 px-3 rounded-2xl transition-all ${
                            selectedStrategy === 'budget' 
                            ? 'bg-slate-50 border-slate-300 shadow-sm ring-1 ring-slate-200' 
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                          style={{ borderWidth: '0.5px' }}
                        >
                          <div className="text-lg text-slate-400 mb-1">🪙</div>
                          <div className="text-[12px] font-medium text-slate-500 mb-2 capitalize">Budget</div>
                          <div className="text-[17px] font-medium text-slate-700 mb-1">
                            <CountUpNumber value={result.strategies?.budget?.price || 0} currency={business.currency} />
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Margin: {result.strategies?.budget?.margin}%
                          </div>
                        </motion.button>

                        {/* Recommended Card (Dominant) */}
                        <motion.button 
                          onClick={() => setSelectedStrategy('recommended')}
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          className={`flex flex-col items-center justify-center py-4 px-3 rounded-2xl transition-all border-2 ${
                            selectedStrategy === 'recommended' 
                            ? 'bg-primary/5 border-primary shadow-md ring-2 ring-primary/20' 
                            : 'bg-white border-primary/50 hover:bg-primary/5 shadow-sm'
                          }`}
                        >
                          <div className="text-2xl text-primary mb-1">⭐</div>
                          <div className="text-[12px] font-medium text-primary mb-2 capitalize">Recommended</div>
                          <div className="text-[20px] font-bold text-slate-800 mb-1">
                            <CountUpNumber value={result.strategies?.recommended?.price || 0} currency={business.currency} />
                          </div>
                          <div className="text-[11px] font-medium text-primary">
                            Margin: {result.strategies?.recommended?.margin}%
                          </div>
                        </motion.button>

                        {/* Premium Card (Secondary) */}
                        <motion.button 
                          onClick={() => setSelectedStrategy('premium')}
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          className={`flex flex-col items-center justify-center py-4 px-3 rounded-2xl transition-all ${
                            selectedStrategy === 'premium' 
                            ? 'bg-slate-50 border-slate-300 shadow-sm ring-1 ring-slate-200' 
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                          style={{ borderWidth: '0.5px' }}
                        >
                          <div className="text-lg text-slate-400 mb-1">💎</div>
                          <div className="text-[12px] font-medium text-slate-500 mb-2 capitalize">Premium</div>
                          <div className="text-[17px] font-medium text-slate-700 mb-1">
                            <CountUpNumber value={result.strategies?.premium?.price || 0} currency={business.currency} />
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Margin: {result.strategies?.premium?.margin}%
                          </div>
                        </motion.button>
                      </div>
                    </div>

                    {/* SECTION 7: AI Business Advice */}
                    {result.tips && result.tips.length > 0 && (
                      <div className="p-8 bg-slate-50 border-b border-slate-100">
                        <h3 className="font-bold text-xl mb-6 text-slate-800 flex items-center gap-2">
                          <Info className="text-primary" size={24} /> AI Consultant Advice
                        </h3>
                        <div className="space-y-4 max-w-2xl">
                          {result.tips.map((tip: string, idx: number) => (
                            <motion.div 
                              key={idx} 
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              whileInView={{ opacity: 1, y: 0, scale: 1 }}
                              viewport={{ once: true }}
                              transition={{ delay: idx * 0.15, type: "spring" }}
                              className="bg-white border border-slate-200 p-5 rounded-2xl rounded-tl-sm text-sm text-slate-700 shadow-sm flex items-start gap-4"
                            >
                              <span className="text-2xl pt-0.5">💡</span>
                              <p className="font-medium leading-relaxed">{tip}</p>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* SECTION 8: Action Bar */}
                    <div className="p-8 bg-white flex flex-wrap justify-center sm:justify-start gap-4">
                      <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="btn bg-transparent text-primary hover:bg-primary/10 font-bold px-6 py-3 rounded-xl border-none" onClick={() => toast.success('Product saved!')}>
                        Save Product
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="btn bg-primary text-white shadow-lg shadow-primary/30 font-bold px-8 py-3 rounded-xl border-none" onClick={saveToMenu} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Add to Menu'}
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="btn bg-primary/10 text-primary hover:bg-primary/20 font-bold px-6 py-3 rounded-xl border-none" onClick={() => toast.success('Order creation wizard opened!')}>
                        Create Order
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="btn bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold px-6 py-3 rounded-xl border-none" onClick={() => {
                        navigator.clipboard.writeText(`I'm selling ${productName} for ${formatCurrency(result.strategies?.[selectedStrategy]?.price || result.recommendation?.suggestedPrice, business.currency, 'en')}!`);
                        toast.success('Report link copied!');
                      }}>
                        Share Report
                      </motion.button>
                    </div>
                  </motion.div>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
