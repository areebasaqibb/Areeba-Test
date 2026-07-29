'use client';

import { useState, useEffect, useContext, useRef } from 'react';
import toast from 'react-hot-toast';
import { Upload, Sparkles, Save, CheckCircle, Palette, MonitorPlay, Droplet } from 'lucide-react';
import { BusinessContext } from '../../layout';
import { motion, AnimatePresence } from 'framer-motion';

const PRESETS = [
  {
    name: 'Elegant Blush',
    lightMode: { '--primary': '#F47C9B', '--primary-hover': '#e36888', '--primary-light': '#fdf2f5', '--secondary': '#F9D5E5', '--background': '#FFF9F6', '--surface': '#FFFFFF', '--surface-hover': '#faf5f2', '--text': '#2E2E2E', '--text-muted': '#6b6b6b', '--border': '#f5e3df' },
    darkMode: { '--primary': '#F47C9B', '--primary-hover': '#ff8ba9', '--primary-light': '#4a2530', '--secondary': '#F9D5E5', '--background': '#1f1a18', '--surface': '#2b2421', '--surface-hover': '#362d29', '--text': '#fdfcfb', '--text-muted': '#a19e9c', '--border': '#423733' }
  },
  {
    name: 'Strawberry Cream',
    lightMode: { '--primary': '#E63973', '--primary-hover': '#c92d60', '--primary-light': '#fce8ef', '--secondary': '#FFF5F7', '--background': '#FFFFFF', '--surface': '#FFF9FC', '--surface-hover': '#fcf0f6', '--text': '#333333', '--text-muted': '#777777', '--border': '#fce1ec' },
    darkMode: { '--primary': '#E63973', '--primary-hover': '#ff4d8a', '--primary-light': '#4d1427', '--secondary': '#FFF5F7', '--background': '#171415', '--surface': '#262124', '--surface-hover': '#332c30', '--text': '#fcfcfc', '--text-muted': '#969696', '--border': '#3d3439' }
  },
  {
    name: 'Pistachio & Cream',
    lightMode: { '--primary': '#8CBF88', '--primary-hover': '#7aa677', '--primary-light': '#eff6ef', '--secondary': '#DDEEDB', '--background': '#FAF8F3', '--surface': '#FFFFFF', '--surface-hover': '#f5f7f2', '--text': '#2F4F3E', '--text-muted': '#6c8779', '--border': '#e1e8dc' },
    darkMode: { '--primary': '#8CBF88', '--primary-hover': '#a0d99c', '--primary-light': '#2b3d2a', '--secondary': '#DDEEDB', '--background': '#151715', '--surface': '#1d211d', '--surface-hover': '#282d28', '--text': '#f1f5f3', '--text-muted': '#8da397', '--border': '#303630' }
  },
  {
    name: 'Royal Blue & Gold',
    lightMode: { '--primary': '#3B5BDB', '--primary-hover': '#2d4ab5', '--primary-light': '#eff2fb', '--secondary': '#E8F0FF', '--background': '#FFFFFF', '--surface': '#F9FBFF', '--surface-hover': '#f0f4fc', '--text': '#1D3557', '--text-muted': '#5c6e87', '--border': '#e1e7f0' },
    darkMode: { '--primary': '#3B5BDB', '--primary-hover': '#5274fa', '--primary-light': '#121b42', '--secondary': '#E8F0FF', '--background': '#0f131a', '--surface': '#161c26', '--surface-hover': '#1e2633', '--text': '#f0f3f7', '--text-muted': '#8a9ab0', '--border': '#252e3d' }
  },
  {
    name: 'Lavender Luxury',
    lightMode: { '--primary': '#9B6BFF', '--primary-hover': '#8055db', '--primary-light': '#f5f0ff', '--secondary': '#EFE8FF', '--background': '#FCFBFF', '--surface': '#FFFFFF', '--surface-hover': '#f7f5fa', '--text': '#312244', '--text-muted': '#726187', '--border': '#ede8f5' },
    darkMode: { '--primary': '#9B6BFF', '--primary-hover': '#b087ff', '--primary-light': '#322252', '--secondary': '#EFE8FF', '--background': '#16131c', '--surface': '#201b29', '--surface-hover': '#2b2436', '--text': '#f4f1f7', '--text-muted': '#968ba6', '--border': '#342c42' }
  },
  {
    name: 'Aqua & Mint',
    lightMode: { '--primary': '#00B8A9', '--primary-hover': '#009c8f', '--primary-light': '#e5f8f6', '--secondary': '#DFFCF8', '--background': '#FFFFFF', '--surface': '#F8FFFF', '--surface-hover': '#effafc', '--text': '#2D3748', '--text-muted': '#718096', '--border': '#e2e8f0' },
    darkMode: { '--primary': '#00B8A9', '--primary-hover': '#00d4c3', '--primary-light': '#003632', '--secondary': '#DFFCF8', '--background': '#0f171a', '--surface': '#162126', '--surface-hover': '#1d2c33', '--text': '#f7fafc', '--text-muted': '#a0aec0', '--border': '#25353d' }
  },
  {
    name: 'Dark Mode Luxury',
    lightMode: { '--primary': '#FF5A8A', '--primary-hover': '#e04c77', '--primary-light': '#ffe8ee', '--secondary': '#7C3AED', '--background': '#f3f4f6', '--surface': '#ffffff', '--surface-hover': '#f9fafb', '--text': '#111827', '--text-muted': '#6b7280', '--border': '#e5e7eb' },
    darkMode: { '--primary': '#FF5A8A', '--primary-hover': '#ff7a9f', '--primary-light': '#521d2c', '--secondary': '#7C3AED', '--background': '#111827', '--surface': '#1F2937', '--surface-hover': '#374151', '--text': '#F9FAFB', '--text-muted': '#9CA3AF', '--border': '#374151' }
  }
];

const QUICK_THEMES = [
  { name: 'Pink Blossom', hex: '#fb7185' },
  { name: 'Ocean Blue', hex: '#0284c7' },
  { name: 'Emerald Green', hex: '#10b981' },
  { name: 'Royal Purple', hex: '#8b5cf6' },
  { name: 'Sunset Orange', hex: '#f97316' },
  { name: 'Ruby Red', hex: '#e11d48' },
  { name: 'Golden Yellow', hex: '#eab308' },
  { name: 'Aqua Mint', hex: '#14b8a6' },
  { name: 'Chocolate Brown', hex: '#78350f' },
  { name: 'Monochrome Black', hex: '#171717' }
];

export default function BrandThemeSettings() {
  const { business, setBusiness } = useContext(BusinessContext);
  const [themes, setThemes] = useState<any[]>([]);
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null);
  
  // Builder State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [currentLightMode, setCurrentLightMode] = useState<any>(PRESETS[0].lightMode);
  const [currentDarkMode, setCurrentDarkMode] = useState<any>(PRESETS[0].darkMode);
  const [themeName, setThemeName] = useState('My Custom Theme');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (business) {
      loadThemes();
      setActiveThemeId(business.activeThemeId);
      if (business.activeTheme) {
        setCurrentLightMode(typeof business.activeTheme.lightMode === 'string' ? JSON.parse(business.activeTheme.lightMode) : business.activeTheme.lightMode);
        setCurrentDarkMode(typeof business.activeTheme.darkMode === 'string' ? JSON.parse(business.activeTheme.darkMode) : business.activeTheme.darkMode);
        setThemeName(business.activeTheme.name);
      }
    }
  }, [business]);

  // Sync builder changes with global style temporarily for live preview
  useEffect(() => {
    let styleEl = document.getElementById('ai-brand-theme-style');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'ai-brand-theme-style';
      document.head.appendChild(styleEl);
    }
    
    let cssString = ':root {\n';
    Object.entries(currentLightMode).forEach(([k, v]) => cssString += `  ${k}: ${v};\n`);
    cssString += '}\n\n.dark {\n';
    Object.entries(currentDarkMode).forEach(([k, v]) => cssString += `  ${k}: ${v};\n`);
    cssString += '}\n';
    styleEl.innerHTML = cssString;
  }, [currentLightMode, currentDarkMode]);

  const loadThemes = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/themes', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setThemes(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const extractTheme = async (base64Image: string) => {
    setIsAnalyzing(true);
    setAiAnalysis(null);
    try {
      const res = await fetch('http://localhost:3001/api/ai/extract-theme', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Image })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to extract theme');
      
      setCurrentLightMode(data.lightMode);
      setCurrentDarkMode(data.darkMode);
      
      const lines = data.message.split('\n');
      setAiAnalysis({
        personality: lines[0]?.split(': ')[1] || 'Modern',
        color: lines[1]?.split(': ')[1] || data.lightMode['--primary'],
        theme: lines[2]?.split(': ')[1] || 'Custom',
        reason: lines[3]?.split(': ')[1] || 'Colors were intelligently extracted from your logo.'
      });
      
      setThemeName('AI Extracted Theme');
      toast.success('Theme generated successfully!');
      setSelectedFile(null); // Clear selected file after success
    } catch (err) {
      toast.error('Failed to extract theme. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const submitFile = () => {
    if (!selectedFile) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      extractTheme(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setCurrentLightMode(preset.lightMode);
    setCurrentDarkMode(preset.darkMode);
    setThemeName(preset.name);
    setAiAnalysis(null);
  };

  const generateQuickTheme = (name: string, hex: string) => {
    // Generate a quick fallback theme based on a single hex color for the quick presets
    // A robust app would use chroma-js here on the frontend too, but we can simulate closely
    // by calling the backend or using a very simplified mapping.
    // For demo purposes, we'll construct a simplified version, but ideally we'd send it to backend to do proper contrast.
    // We will just do a basic CSS override of the primary color, keeping the Elegant Blush structure as base.
    
    const base = PRESETS[0];
    setCurrentLightMode({
      ...base.lightMode,
      '--primary': hex,
      '--primary-light': hex + '1a', // 10% opacity
    });
    setCurrentDarkMode({
      ...base.darkMode,
      '--primary': hex,
      '--primary-light': hex + '33', // 20% opacity
    });
    setThemeName(name);
    setAiAnalysis(null);
  };

  const saveTheme = async (setActive = false) => {
    try {
      const res = await fetch('http://localhost:3001/api/themes', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: themeName,
          lightMode: currentLightMode,
          darkMode: currentDarkMode,
          setActive
        })
      });
      const data = await res.json();
      toast.success(setActive ? 'Theme saved and activated!' : 'Theme saved successfully!');
      if (setActive) {
        setActiveThemeId(data.id);
        setBusiness({ ...business, activeThemeId: data.id, activeTheme: data });
      }
      loadThemes();
    } catch (err) {
      toast.error('Failed to save theme');
    }
  };

  const activateTheme = async (id: string) => {
    try {
      await fetch(`http://localhost:3001/api/themes/${id}/activate`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Theme activated!');
      
      const theme = themes.find(t => t.id === id);
      setActiveThemeId(id);
      setBusiness({ ...business, activeThemeId: id, activeTheme: theme });
      
      setCurrentLightMode(typeof theme.lightMode === 'string' ? JSON.parse(theme.lightMode) : theme.lightMode);
      setCurrentDarkMode(typeof theme.darkMode === 'string' ? JSON.parse(theme.darkMode) : theme.darkMode);
      setThemeName(theme.name);
    } catch (err) {
      toast.error('Failed to activate theme');
    }
  };

  return (
    <div className="pb-12 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Palette className="text-primary" size={32} /> Advanced AI Themes
          </h1>
          <p className="text-slate-500 mt-2 max-w-xl">
            Upload your logo and let AI extract a genuine, fully accessible color palette for your brand.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-primary shadow-lg hover:shadow-xl transition-shadow" onClick={() => saveTheme(true)}>
            <CheckCircle size={18} className="mr-2"/> Save & Activate
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column - Controls */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Logo Upload Section */}
          <div className="card border-primary/20 bg-gradient-to-br from-white to-primary/5">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800">
              <Sparkles className="text-primary" size={20} /> AI Extraction Engine
            </h3>
            
            <div 
              className={`border-2 border-dashed border-primary/30 rounded-2xl p-8 text-center transition-colors ${!selectedFile && !isAnalyzing ? 'hover:bg-primary/5 cursor-pointer' : ''}`}
              onClick={() => { if (!selectedFile && !isAnalyzing) fileInputRef.current?.click(); }}
            >
              {isAnalyzing ? (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="font-bold text-primary">Analyzing logo & ensuring WCAG contrast...</p>
                </div>
              ) : selectedFile ? (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center shadow-md mb-4 text-primary">
                    <Upload size={24} />
                  </div>
                  <p className="font-bold text-slate-700 mb-1">{selectedFile.name}</p>
                  <p className="text-sm text-slate-500 mb-4">Ready to extract colors</p>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition-colors" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}>Cancel</button>
                    <button className="px-4 py-2 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg shadow-md transition-colors" onClick={(e) => { e.stopPropagation(); submitFile(); }}>Extract Colors</button>
                  </div>
                </div>
              ) : business?.logo ? (
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 shrink-0 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden mb-4 shadow-md">
                    <img src={business.logo} alt="Business Logo" className="w-full h-full object-cover" />
                  </div>
                  <p className="font-bold text-slate-700 mb-1">Use Business Logo</p>
                  <p className="text-sm text-slate-500 mb-4">Extract a color palette directly from your bakery's logo.</p>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition-colors" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>Upload Different Image</button>
                    <button className="px-4 py-2 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg shadow-md transition-colors" onClick={(e) => { e.stopPropagation(); extractTheme(business.logo); }}>Extract Colors</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center pointer-events-none">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md mb-4 text-primary">
                    <Upload size={24} />
                  </div>
                  <p className="font-bold text-slate-700 mb-1">Upload your Bakery Logo</p>
                  <p className="text-sm text-slate-500">PNG, JPG, SVG up to 5MB</p>
                </div>
              )}
              <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" />
            </div>

            <AnimatePresence>
              {aiAnalysis && !isAnalyzing && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 p-5 bg-white rounded-xl border border-primary/20 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 text-primary font-bold mb-4">
                    <Sparkles size={16}/> AI analyzed your bakery branding.
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-500 font-medium">Brand Personality:</span>
                      <span className="font-bold text-slate-800">{aiAnalysis.personality}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-500 font-medium">Primary Color:</span>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: aiAnalysis.color }}></div>
                        <span className="font-bold font-mono text-slate-800">{aiAnalysis.color}</span>
                      </div>
                    </div>
                    <div className="flex justify-between pb-2">
                      <span className="text-slate-500 font-medium">Recommended Theme:</span>
                      <span className="font-bold text-primary">{aiAnalysis.theme}</span>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg text-sm text-slate-600 leading-relaxed italic border border-slate-100">
                    "{aiAnalysis.reason}"
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Detailed Presets Gallery */}
          <div className="card">
            <h3 className="text-lg font-bold mb-4 text-slate-800">Designer Presets</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {PRESETS.map(preset => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className={`flex flex-col items-start gap-2 p-4 rounded-xl border transition-all ${
                    themeName === preset.name ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                  }`}
                >
                  <div className="flex gap-1 w-full h-8 rounded-lg overflow-hidden mb-1">
                    <div className="h-full flex-1" style={{ backgroundColor: preset.lightMode['--primary'] }}></div>
                    <div className="h-full w-4" style={{ backgroundColor: preset.lightMode['--secondary'] }}></div>
                    <div className="h-full w-4" style={{ backgroundColor: preset.lightMode['--background'] }}></div>
                  </div>
                  <span className="font-bold text-sm text-slate-700">{preset.name}</span>
                </button>
              ))}
            </div>

            <h3 className="text-sm font-bold mb-3 text-slate-500 uppercase tracking-widest">Quick Colors</h3>
            <div className="flex flex-wrap gap-2">
              {QUICK_THEMES.map(qt => (
                <button
                  key={qt.name}
                  onClick={() => generateQuickTheme(qt.name, qt.hex)}
                  title={qt.name}
                  className="w-10 h-10 rounded-full border-2 border-white shadow-md hover:scale-110 transition-transform"
                  style={{ backgroundColor: qt.hex }}
                ></button>
              ))}
            </div>
          </div>

          {/* Color Customization */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">Fine Tune</h3>
              <input 
                type="text" 
                className="text-sm font-bold bg-transparent border-b border-dashed border-slate-300 text-right w-40 focus:outline-none focus:border-primary" 
                value={themeName} 
                onChange={e => setThemeName(e.target.value)}
              />
            </div>
            
            <div className="space-y-4">
              {[
                { label: 'Primary Color', key: '--primary' },
                { label: 'Secondary Color', key: '--secondary' },
                { label: 'Background', key: '--background' },
                { label: 'Surface (Cards)', key: '--surface' },
                { label: 'Text', key: '--text' }
              ].map(color => (
                <div key={color.key} className="flex justify-between items-center bg-slate-50 p-2 px-3 rounded-lg border border-slate-100">
                  <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Droplet size={14} className="text-slate-400" /> {color.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 uppercase font-mono">{currentLightMode[color.key]}</span>
                    <input 
                      type="color" 
                      value={currentLightMode[color.key]} 
                      onChange={(e) => setCurrentLightMode({...currentLightMode, [color.key]: e.target.value})}
                      className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Saved Themes Library */}
          {themes.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-bold mb-4 text-slate-800">My Saved Themes</h3>
              <div className="space-y-2">
                {themes.map(t => (
                  <div key={t.id} className={`flex justify-between items-center p-3 rounded-xl border ${activeThemeId === t.id ? 'border-primary bg-primary/5' : 'border-slate-200 bg-white'}`}>
                    <span className="font-medium text-sm text-slate-700">{t.name}</span>
                    {activeThemeId === t.id ? (
                      <span className="text-xs font-bold text-primary flex items-center gap-1"><CheckCircle size={14}/> Active</span>
                    ) : (
                      <button className="text-xs font-bold text-slate-500 hover:text-primary transition-colors" onClick={() => activateTheme(t.id)}>Activate</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right Column - Comprehensive Live Preview */}
        <div className="lg:col-span-7">
          <div className="sticky top-24">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <MonitorPlay size={16} /> Live Application Preview
            </h3>
            
            <div className="border border-[var(--border)] rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 ease-in-out" style={{ backgroundColor: 'var(--background)' }}>
              
              {/* Mock Topbar */}
              <div className="h-16 border-b border-[var(--border)] flex items-center justify-between px-6" style={{ backgroundColor: 'var(--surface)' }}>
                <div className="font-bold text-lg" style={{ color: 'var(--text)' }}>Bakery OS</div>
                <div className="flex gap-4 items-center">
                  <div className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Orders</div>
                  <div className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Menu</div>
                  <div className="w-8 h-8 rounded-full ml-4" style={{ backgroundColor: 'var(--primary-light)' }}></div>
                </div>
              </div>

              <div className="flex h-[700px]">
                {/* Mock Sidebar */}
                <div className="w-64 border-r border-[var(--border)] p-4 space-y-2" style={{ backgroundColor: 'var(--surface)' }}>
                  {['Dashboard', 'Magic Pricing', 'Sweet Ingredients', 'Recipes', 'Reports', 'Settings'].map((item, i) => (
                    <div 
                      key={item} 
                      className="p-3 rounded-xl text-sm font-bold transition-colors flex items-center gap-3"
                      style={{ 
                        backgroundColor: i === 1 ? 'var(--primary-light)' : 'transparent',
                        color: i === 1 ? 'var(--primary)' : 'var(--text-muted)'
                      }}
                    >
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: i === 1 ? 'var(--primary)' : 'var(--border)' }}></div>
                      {item}
                    </div>
                  ))}
                </div>

                {/* Mock Content */}
                <div className="flex-1 p-8 space-y-6 overflow-hidden overflow-y-auto">
                  
                  <div className="flex flex-row justify-between items-center mb-4 gap-4">
                    <h2 className="text-2xl font-bold truncate" style={{ color: 'var(--text)' }}>Pricing Wizard</h2>
                    <button className="whitespace-nowrap flex-shrink-0 px-5 py-2.5 text-sm font-bold transition-transform hover:scale-105 active:scale-95" style={{ color: 'var(--primary)', backgroundColor: 'transparent' }}>
                      Save Product
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { title: 'Base Cost', val: '$2.45' },
                      { title: 'Packaging', val: '$0.50' },
                      { title: 'Total Cost', val: '$2.95', highlight: true }
                    ].map(kpi => (
                      <div key={kpi.title} className="p-4 rounded-2xl border border-[var(--border)] shadow-sm" style={{ backgroundColor: kpi.highlight ? 'var(--primary-light)' : 'var(--surface)' }}>
                        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: kpi.highlight ? 'var(--primary)' : 'var(--text-muted)' }}>{kpi.title}</p>
                        <p className="text-2xl font-black" style={{ color: kpi.highlight ? 'var(--primary)' : 'var(--text)' }}>{kpi.val}</p>
                      </div>
                    ))}
                  </div>

                  {/* Mock Table */}
                  <div className="rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden" style={{ backgroundColor: 'var(--surface)' }}>
                    <div className="p-4 border-b border-[var(--border)] font-bold text-sm" style={{ color: 'var(--text)' }}>Ingredient Cost Breakdown</div>
                    <div className="p-4 space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-slate-100" style={{ backgroundColor: 'var(--background)' }}></div>
                            <span style={{ color: 'var(--text-muted)' }}>Ingredient {i}</span>
                          </div>
                          <span className="font-bold" style={{ color: 'var(--text)' }}>$1.{i}0</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mock Form & Buttons */}
                  <div className="flex gap-4">
                    <div className="flex-1 p-4 rounded-2xl border border-[var(--border)]" style={{ backgroundColor: 'var(--surface)' }}>
                       <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Target Margin</div>
                       <div className="h-10 rounded-lg border border-[var(--border)] flex items-center px-3 text-sm font-bold" style={{ color: 'var(--text)', backgroundColor: 'var(--background)' }}>
                         3.0x
                       </div>
                    </div>
                    <div className="flex-1 p-4 flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95" style={{ color: 'var(--primary)', backgroundColor: 'transparent' }}>
                       <div className="text-lg font-bold">Calculate AI Price</div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
