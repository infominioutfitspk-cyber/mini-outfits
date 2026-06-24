'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash2, X, Image as ImageIcon, Zap, Loader2, FolderOpen } from '@/components/common/Icons';
import { Category } from '@/lib/types';
import { createCategory, updateCategory, deleteCategory } from '@/lib/services/categories';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import MediaSelectorModal from './MediaSelectorModal';
import RichTextEditor from './RichTextEditor';
import { getClientSiteUrl } from '@/lib/site-url';

interface CategoryManagerProps {
  initialCategories: Category[];
  aiEnabled?: boolean;
  storeUrl?: string;
}

export default function CategoryManager({ initialCategories, aiEnabled, storeUrl }: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  
  // Modal states
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [active, setActive] = useState(true);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  // Always show AI button — guides user to settings if not configured
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);

  React.useEffect(() => {
    const fetchAiSettings = async () => {
      try {
        const res = await fetch('/api/ai-check');
        const data = await res.json();
        setAiConfigured(data.ai_enabled === true);
      } catch (err) {
        console.error('Failed to load AI settings:', err);
        setAiConfigured(false);
      }
    };
    fetchAiSettings();
  }, []);

  const handleAICopywrite = async () => {
    if (!name.trim()) {
      return toast.error('Please enter a Category Name first before generating AI description.');
    }
    try {
      setIsAiGenerating(true);
      toast.info('AI is drafting professional category copy...');

      const payload = {
        entity_type: 'category',
        entity_id: editId || 'new',
        entity_data: {
          name: name.trim(),
          description: description.trim() || undefined,
          slug: slug.trim()
        }
      };

      const response = await fetch('/api/seo/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) throw new Error(resData.error || 'AI generation failed');

      if (resData.skipped) {
        toast.warning(resData.message || 'AI keys not configured');
      } else {
        const data = resData.data;
        if (data.long_description) {
          setDescription(data.long_description);
        }
        toast.success('AI description generated successfully!');
      }
    } catch (err: any) {
      toast.error(err.message || 'AI generation failed');
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Auto-fill slug
  React.useEffect(() => {
    if (!editId && name) {
      const timer = setTimeout(() => {
        setSlug(
          name
            .toLowerCase()
            .replace(/[^a-z0-9 -]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
        );
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [name, editId]);

  const handleOpenNew = () => {
    setEditId(null);
    setName('');
    setSlug('');
    setDescription('');
    setImageUrl('');
    setSortOrder('0');
    setActive(true);
    setIsOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditId(cat.id);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || '');
    setImageUrl(cat.imageUrl || '');
    setSortOrder(cat.sortOrder.toString());
    setActive(cat.active);
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to move this category to Trash?')) return;
    try {
      await deleteCategory(id);
      setCategories(prev => prev.filter(c => c.id !== id));
      toast.success('Category moved to Trash successfully');
    } catch (err) {
      toast.error('Failed to move category to Trash');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Category Name is required');
    if (!slug.trim()) return toast.error('Category Slug is required');

    const payload = {
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      sortOrder: parseInt(sortOrder) || 0,
      active
    };

    try {
      let savedCategory: Category;
      if (editId) {
        savedCategory = await updateCategory(editId, payload);
        setCategories(prev => prev.map(c => c.id === editId ? savedCategory : c));
        toast.success('Category updated successfully');
      } else {
        savedCategory = await createCategory(payload);
        setCategories(prev => [...prev, savedCategory]);
        toast.success('Category created successfully');
      }
      setIsOpen(false);

      // Fetch settings to check auto_content_seo
      const supabase = createClient();
      const { data: aiSettings } = await supabase
        .from('ai_settings')
        .select('auto_content_seo')
        .eq('id', '00000000-0000-4000-8000-000000000002')
        .single();
      
      const isAutoSeoOn = aiSettings?.auto_content_seo ?? true;
      const categoryIdToOptimize = savedCategory.id;
      const categorySlugToOptimize = savedCategory.slug;

      // Asynchronously trigger SEO optimization or IndexNow ping in the background
      (async () => {
        try {
          if (isAutoSeoOn) {
            toast.info('Generating AI SEO content and pinging IndexNow...');
            const optRes = await fetch('/api/seo/optimize', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                entity_type: 'category',
                entity_id: categoryIdToOptimize
              })
            });
            const resData = await optRes.json();
            if (optRes.ok && resData.success) {
              toast.success('AI SEO optimization complete & IndexNow notified for category!');
            } else {
              console.warn('Auto SEO optimization failed on save for category:', resData?.error);
              toast.warning(`SEO auto-generation skipped: ${resData?.error || 'AI not configured'}`);
            }
          } else {
            // Just trigger IndexNow
            const siteUrl = storeUrl || getClientSiteUrl();
            const pageUrl = `${siteUrl}/shop?category=${categorySlugToOptimize}`;
            const pingRes = await fetch('/api/indexnow', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                urls: [pageUrl]
              })
            });
            if (pingRes.ok) {
              toast.success('IndexNow notified of updated category!');
            }
          }
        } catch (bgErr) {
          console.error('Error running background SEO tasks:', bgErr);
        }
      })();

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to save category';
      toast.error(errMsg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header action */}
      <div className="flex justify-end">
        <button
          onClick={handleOpenNew}
          className="flex items-center gap-1.5 rounded-xl bg-[#1a1a2e] hover:bg-[#e94560] text-white px-5 py-2.5 text-sm font-bold shadow-sm transition-all cursor-pointer"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Add Category</span>
        </button>
      </div>

      {/* Grid listing */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map(cat => (
          <div key={cat.id} className="bg-white dark:bg-[#16162a] p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between space-y-4 text-gray-900 dark:text-white transition-colors">
            <Link href={`/admin/categories/${cat.id}`} className="group block flex-1">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-gray-950 dark:text-white text-base group-hover:text-[#e94560] transition-colors">{cat.name}</h3>
                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md ${
                  cat.active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-505'
                }`}>
                  {cat.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-semibold mt-1">Slug: {cat.slug}</p>
              {cat.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2.5 line-clamp-2" dangerouslySetInnerHTML={{ __html: cat.description }}></p>
              )}
            </Link>

            <div className="flex gap-2.5 pt-3 border-t border-gray-150 dark:border-gray-800 justify-end items-center">
              <Link
                href={`/admin/categories/${cat.id}`}
                className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/20 px-3 py-2 rounded-lg cursor-pointer"
              >
                <FolderOpen className="h-3.5 w-3.5" />
                <span>Products</span>
              </Link>
              <button
                onClick={() => handleOpenEdit(cat)}
                className="flex items-center gap-1 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-[#1a1a2e] dark:hover:text-white bg-gray-50 dark:bg-white/5 px-3 py-2 rounded-lg cursor-pointer"
              >
                <Edit className="h-3.5 w-3.5" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => handleDelete(cat.id)}
                className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/10 px-3 py-2 rounded-lg cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Slide / Inline Modal overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          {/* Centered spacious max-w-3xl modal on all screens, keeping the backdrop menu visible */}
          <div className="bg-white dark:bg-[#16162a] w-full max-w-3xl max-h-[90vh] rounded-2xl border border-gray-250 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col animate-scale-in text-gray-900 dark:text-white overscroll-contain">
            
            {/* Sticky Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-150 dark:border-gray-800 shrink-0 bg-white dark:bg-[#16162a] sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-extrabold tracking-tight text-gray-900 dark:text-white">
                  {editId ? 'Edit Category' : 'Create New Category'}
                </h3>
                {name.trim() !== '' && (
                  <button
                    type="button"
                    onClick={aiConfigured ? handleAICopywrite : () => { toast.info('AI is not enabled. Go to Admin → Settings → AI Copywriter to enable it.', { duration: 5000 }); }}
                    disabled={isAiGenerating}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98] ${
                      aiConfigured
                        ? 'bg-purple-600 bg-linear-to-r from-purple-600 to-indigo-600 hover:bg-purple-700 hover:from-purple-700 hover:to-indigo-700'
                        : 'bg-gray-400 hover:bg-gray-500'
                    }`}
                    title={aiConfigured ? 'Generate AI copy' : 'Enable AI in Settings → AI Copywriter'}
                  >
                    {isAiGenerating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5 fill-current" />
                    )}
                    <span>AI Generate Copy</span>
                  </button>
                )}
              </div>
              <button 
                type="button"
                onClick={() => setIsOpen(false)} 
                className="text-gray-400 hover:text-gray-650 dark:hover:text-white cursor-pointer p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Category Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-250 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 px-4 py-2.5 text-sm font-medium focus:border-[#e94560] focus:bg-white focus:outline-none transition-all dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Category Slug *</label>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-255 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 px-4 py-2.5 text-sm font-medium focus:border-[#e94560] focus:bg-white focus:outline-none transition-all dark:text-white"
                  />
                  {slug && (
                    <p className="mt-1 text-[10px] text-gray-550 dark:text-gray-400 font-bold">
                      Preview Path:{' '}
                      <a
                        href={`/shop?category=${slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#e94560] font-mono underline hover:text-[#e94560]/80 transition-colors cursor-pointer"
                      >
                        /shop?category={slug}
                      </a>
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Category Image</label>
                  <div className="flex items-center gap-4 p-4 rounded-xl border border-dashed border-gray-250 dark:border-gray-850 bg-gray-50/20 dark:bg-[#0f0f1b]/20">
                    {imageUrl ? (
                      <div className="flex flex-col items-center gap-1.5 shrink-0">
                        <div className="relative h-14 w-14 border border-gray-200 dark:border-gray-850 rounded-lg overflow-hidden bg-white dark:bg-[#0f0f1b] flex items-center justify-center p-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={imageUrl} alt="Category Image Preview" className="h-full w-full object-cover" />
                        </div>
                        <button
                          type="button"
                          onClick={() => setImageUrl('')}
                          className="flex items-center gap-1 text-[10px] font-bold text-red-500 hover:text-red-600 transition-colors cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100 dark:bg-white/5 text-gray-400 shrink-0">
                        <Plus className="h-6 w-6" />
                      </div>
                    )}

                    <div className="flex-1 flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsMediaModalOpen(true)}
                        className="relative self-start flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-lg cursor-pointer transition-colors"
                      >
                        <ImageIcon className="h-4 w-4" />
                        Select Media
                      </button>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">Select or upload WebP &lt; 50 KB</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Sort Order</label>
                    <input
                      type="number"
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-gray-250 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 px-4 py-2.5 text-sm font-medium focus:border-[#e94560] focus:bg-white focus:outline-none transition-all dark:text-white"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <input
                      type="checkbox"
                      id="cat-active"
                      checked={active}
                      onChange={(e) => setActive(e.target.checked)}
                      className="rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] h-4 w-4 cursor-pointer"
                    />
                    <label htmlFor="cat-active" className="text-sm font-bold text-gray-700 dark:text-gray-300 cursor-pointer">
                      Active (Show to customers)
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Description</label>
                  {name.trim() !== '' && (
                    <button
                      type="button"
                      onClick={aiConfigured ? handleAICopywrite : () => { toast.info('AI is not enabled. Go to Admin → Settings → AI Copywriter to enable it.', { duration: 5000 }); }}
                      disabled={isAiGenerating}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98] ${
                        aiConfigured
                          ? 'bg-purple-600 bg-linear-to-r from-purple-600 to-indigo-600 hover:bg-purple-700 hover:from-purple-700 hover:to-indigo-700'
                          : 'bg-gray-400 hover:bg-gray-500'
                      }`}
                      title={aiConfigured ? 'Generate AI copy' : 'Enable AI in Settings → AI Copywriter'}
                    >
                      {isAiGenerating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Zap className="w-3.5 h-3.5 fill-current" />
                      )}
                      <span>AI Generate Copy</span>
                    </button>
                  )}
                </div>
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="Describe your category..."
                  minHeight="180px"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4 border-t border-gray-150 dark:border-gray-800 bg-white dark:bg-[#16162a]">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 text-center border border-gray-250 dark:border-gray-700 text-gray-700 dark:text-gray-350 bg-white dark:bg-transparent rounded-xl py-3 text-sm font-bold cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 text-center bg-[#1a1a2e] dark:bg-[#e94560] hover:opacity-90 text-white rounded-xl py-3 text-sm font-bold shadow-md cursor-pointer transition-all active:scale-[0.98]"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <MediaSelectorModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onSelect={(urls) => {
          if (urls.length > 0) {
            setImageUrl(urls[0]);
          }
        }}
        multiple={false}
      />
    </div>
  );
}
