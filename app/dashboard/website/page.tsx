'use client';

import { useState, useContext } from 'react';
import { BusinessContext } from '../layout';
import toast from 'react-hot-toast';
import { Link2, ExternalLink, Copy, Edit2, CheckCircle2, Globe } from 'lucide-react';

export default function WebsiteSettings() {
  const { business, setBusiness } = useContext(BusinessContext);
  const [isEditing, setIsEditing] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!business) return null;

  const currentUrl = business.websiteUrl;
  const showForm = isEditing || !currentUrl;

  const handleEdit = () => {
    setWebsiteUrl(currentUrl || '');
    setIsEditing(true);
  };

  const handleCopy = () => {
    if (currentUrl) {
      navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Link copied to clipboard');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const token = localStorage.getItem('token');
    
    // Normalize URL if they didn't include http/https
    let finalUrl = websiteUrl.trim();
    if (finalUrl && !/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    try {
      const res = await fetch('http://localhost:3001/api/business', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...business, websiteUrl: finalUrl })
      });

      if (!res.ok) throw new Error('Failed to update website link');
      
      const updatedBusiness = await res.json();
      setBusiness(updatedBusiness);
      toast.success('Website link saved successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      toast.error('Failed to save website link');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-primary/10 p-3 rounded-xl text-primary">
          <Globe size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">My Website</h1>
          <p className="text-muted">Manage your external storefront or ordering link</p>
        </div>
      </div>

      {showForm ? (
        <div className="card shadow-sm border border-slate-200 dark:border-slate-800">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h3 className="text-lg font-bold mb-2">
                {!currentUrl ? 'Add your ordering link' : 'Update your link'}
              </h3>
              <p className="text-muted text-sm mb-6">
                Connect your existing website, Instagram, or Linktree where customers can place orders. 
                We'll use this link to direct customers from your marketing materials.
              </p>
              
              <div className="input-group max-w-lg">
                <label>Website URL</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Link2 className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    className="input pl-10"
                    placeholder="e.g. instagram.com/mybakery or mybakery.com"
                    value={isEditing ? websiteUrl : (websiteUrl || currentUrl || '')}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Link'}
              </button>
              
              {currentUrl && (
                <button 
                  type="button" 
                  className="btn btn-ghost"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      ) : (
        <div className="card overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="bg-slate-50 dark:bg-slate-900/50 -mx-6 -mt-6 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center mb-6">
            <h3 className="font-bold flex items-center gap-2">
              <CheckCircle2 className="text-green-500" size={18} />
              Active Website Link
            </h3>
            <button 
              onClick={handleEdit}
              className="btn btn-ghost btn-sm text-muted hover:text-foreground"
            >
              <Edit2 size={14} className="mr-1" /> Edit
            </button>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-primary/5 dark:bg-primary/10 rounded-2xl border border-primary/20">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              {/* Fallback QR code icon placeholder since we are keeping it simple for now */}
              <div className="w-24 h-24 bg-slate-100 dark:bg-slate-900 flex items-center justify-center rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700">
                <Globe className="text-slate-400" size={32} />
              </div>
            </div>
            
            <div className="flex-1 text-center sm:text-left">
              <p className="text-sm font-medium text-primary mb-1">Your current link:</p>
              <a 
                href={currentUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-lg font-bold hover:underline break-all"
              >
                {currentUrl}
              </a>
              
              <div className="flex justify-center sm:justify-start gap-3 mt-4">
                <a 
                  href={currentUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  <ExternalLink size={16} /> Visit Page
                </a>
                <button 
                  onClick={handleCopy}
                  className="btn btn-outline bg-white dark:bg-slate-900"
                >
                  {copied ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />} 
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
