'use client';

import { useState, useContext, useEffect } from 'react';
import toast from 'react-hot-toast';
import { BusinessContext } from '../layout';
import { Save, Upload, Image as ImageIcon, X } from 'lucide-react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../../../utils/cropImage';

const CURRENCIES = [
  { code: 'USD', label: 'US Dollar ($)' },
  { code: 'PKR', label: 'Pakistani Rupee (₨)' },
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'GBP', label: 'British Pound (£)' },
  { code: 'AED', label: 'UAE Dirham (AED)' },
  { code: 'SAR', label: 'Saudi Riyal (SAR)' },
  { code: 'INR', label: 'Indian Rupee (₹)' },
  { code: 'CAD', label: 'Canadian Dollar (C$)' },
  { code: 'AUD', label: 'Australian Dollar (A$)' },
];

export default function Settings() {
  const { business, setBusiness } = useContext(BusinessContext);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [language, setLanguage] = useState('en');
  const [logo, setLogo] = useState('');
  const [instagram, setInstagram] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [productsSold, setProductsSold] = useState('');
  const [businessGoal, setBusinessGoal] = useState('Side Income');
  const [profitMargin, setProfitMargin] = useState('3.0');
  const [isSaving, setIsSaving] = useState(false);
  
  // Cropper State
  const [imageSrc, setImageSrc] = useState('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  useEffect(() => {
    if (business) {
      setName(business.name);
      setCurrency(business.currency || 'USD');
      setCountry(business.country || '');
      setState(business.state || '');
      setCity(business.city || '');
      setLanguage(business.language || 'en');
      setLogo(business.logo || '');
      setInstagram(business.instagram || '');
      setWhatsapp(business.whatsapp || '');
      setProductsSold(business.productsSold || '');
      setBusinessGoal(business.businessGoal || 'Side Income');
      setProfitMargin(business.profitMargin?.toString() || '3.0');
    }
  }, [business]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be less than 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
    // Reset file input so they can re-upload the same file if they cancel
    e.target.value = '';
  };

  const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const applyCrop = async () => {
    try {
      if (!croppedAreaPixels) return;
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (croppedImage) {
        setLogo(croppedImage);
      }
      setImageSrc('');
    } catch (e) {
      console.error(e);
      toast.error('Failed to crop image');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Business Name is required.');
      return;
    }
    setIsSaving(true);
    const loadingToast = toast.loading('Saving settings...');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/business`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, currency, country, state, city, language, logo, instagram, whatsapp, productsSold, businessGoal, profitMargin })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update settings');
      
      setBusiness(data);
      toast.success('Settings saved successfully!', { id: loadingToast });
    } catch (err: any) {
      toast.error(err.message || 'Could not save settings.', { id: loadingToast });
    } finally {
      setIsSaving(false);
    }
  };

  if (!business) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-slate-800 mb-8">Business Settings</h2>
      
      <form onSubmit={handleSave}>
        <div className="card mb-8">
          <h3 className="font-bold text-lg mb-6">Brand Identity</h3>
          
          <div className="mb-8">
            <label className="block mb-2 font-medium">Business Logo</label>
            <div className="flex items-center gap-6">
              {logo ? (
                <div className="w-24 h-24 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                  <img src={logo} alt="Logo" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                  <ImageIcon size={32} />
                </div>
              )}
              <div className="flex-1">
                <label className="btn btn-secondary inline-flex gap-2 cursor-pointer mb-2">
                  <Upload size={18} />
                  Upload New Logo
                  <input type="file" id="logo-upload" className="hidden" accept="image/png, image/jpeg" onChange={handleLogoUpload} />
                </label>
                <p className="text-sm text-slate-500 max-w-sm">
                  PNG, JPG up to 2MB. This logo will be used across your dashboard and themes.
                </p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="input-group">
              <label>Business Name</label>
              <input type="text" className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sugar Fix Bakery" required />
            </div>
            
            <div className="input-group">
              <label>Default Currency</label>
              <select className="input" value={currency} onChange={e => setCurrency(e.target.value)}>
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="card mb-8">
          <h3 className="font-bold text-lg mb-6">Location & Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="input-group">
              <label>Country</label>
              <input type="text" className="input" value={country} onChange={e => setCountry(e.target.value)} placeholder="e.g. United States" />
            </div>
            
            <div className="input-group">
              <label>State / Province</label>
              <input type="text" className="input" value={state} onChange={e => setState(e.target.value)} placeholder="e.g. California" />
            </div>
            
            <div className="input-group">
              <label>City</label>
              <input type="text" className="input" value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Los Angeles" />
            </div>
            
            <div className="input-group">
              <label>Language</label>
              <select className="input" value={language} onChange={e => setLanguage(e.target.value)}>
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card mb-8">
          <h3 className="font-bold text-lg mb-6">Social & Analytics</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="input-group">
              <label>Instagram Handle</label>
              <input 
                type="text" 
                className="input" 
                value={instagram} 
                onChange={e => setInstagram(e.target.value)} 
                placeholder="@sugarfix"
              />
            </div>
            
            <div className="input-group">
              <label>WhatsApp Number</label>
              <input 
                type="text" 
                className="input" 
                value={whatsapp} 
                onChange={e => setWhatsapp(e.target.value)} 
                placeholder="+1234567890"
              />
            </div>
          </div>
        </div>

        <div className="input-group mb-8">
          <label>What products do you sell?</label>
          <input 
            type="text" 
            className="input" 
            value={productsSold} 
            onChange={e => setProductsSold(e.target.value)} 
            placeholder="Cakes, Brownies, Cookies"
          />
        </div>

        <div className="input-group mb-8">
          <label>Business Goal</label>
          <select 
            className="input" 
            value={businessGoal} 
            onChange={e => setBusinessGoal(e.target.value)}
          >
            <option value="Hobby">Just a Hobby</option>
            <option value="Side Income">Side Income</option>
            <option value="Full-Time">Full-Time Business</option>
          </select>
        </div>

        <button type="submit" className="btn btn-primary w-full" disabled={isSaving}>
          <Save size={18} />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>

      {/* Cropper Modal */}
      {imageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="font-bold text-slate-800">Position & Crop</h3>
              <button className="text-slate-400 hover:text-slate-700" onClick={() => setImageSrc('')}>
                <X size={20} />
              </button>
            </div>
            
            <div className="relative w-full shrink-0 bg-slate-900" style={{ height: '350px' }}>
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={true}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            
            <div className="p-6 bg-white shrink-0">
              <div className="mb-6 flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">Zoom</label>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button className="btn btn-secondary px-6" onClick={() => setImageSrc('')}>Cancel</button>
                <button className="btn btn-primary px-6" onClick={applyCrop}>Apply Logo</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
