'use client';

import React, { useEffect, useState } from 'react';
import { getCategories } from '@/lib/services/categories';
import { getMetaCategoryMappings, upsertMetaCategoryMapping } from '@/lib/services/metaCategory';
import { Category, MetaCategoryMapping } from '@/lib/types';
import { Loader2, Save, Globe } from '@/components/common/Icons';
import { toast } from 'sonner';

const PRESETS = [
  'Apparel & Accessories > Clothing',
  'Apparel & Accessories > Clothing > Kids\' Clothing',
  'Apparel & Accessories > Clothing > Baby & Toddler Clothing',
  'Apparel & Accessories > Clothing > Activewear',
  'Apparel & Accessories > Clothing > Dresses',
  'Apparel & Accessories > Clothing > Outerwear',
  'Apparel & Accessories > Shoes',
  'Apparel & Accessories > Handbags, Wallets & Cases',
  'Apparel & Accessories > Jewelry',
  'Apparel & Accessories > Clothing Accessories',
  'Home & Garden',
];

export default function MetaSyncTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [cats, maps] = await Promise.all([
          getCategories(),
          getMetaCategoryMappings()
        ]);
        
        setCategories(cats);
        
        const initialMaps: Record<string, string> = {};
        const initialCustoms: Record<string, string> = {};
        
        cats.forEach(cat => {
          const matched = maps.find(m => m.storeCategoryId === cat.id);
          if (matched) {
            initialMaps[cat.id] = matched.metaCategory;
            if (!PRESETS.includes(matched.metaCategory)) {
              initialCustoms[cat.id] = matched.metaCategory;
            }
          } else {
            initialMaps[cat.id] = PRESETS[0]; // default fallback
          }
        });
        
        setMappings(initialMaps);
        setCustomInputs(initialCustoms);
      } catch (err) {
        toast.error('Failed to load category mappings');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleSelectChange = (categoryId: string, value: string) => {
    setMappings(prev => ({ ...prev, [categoryId]: value }));
  };

  const handleCustomInputChange = (categoryId: string, value: string) => {
    setCustomInputs(prev => ({ ...prev, [categoryId]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const promises = Object.entries(mappings).map(([catId, val]) => {
        const finalValue = val === 'custom' ? (customInputs[catId] || '').trim() : val;
        if (val === 'custom' && !finalValue) {
          throw new Error('Custom mapping value cannot be empty');
        }
        return upsertMetaCategoryMapping(catId, finalValue || 'Apparel & Accessories > Clothing');
      });

      await Promise.all(promises);
      toast.success('Meta category mappings saved successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save mappings');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin text-[#1a1a2e] dark:text-[#e94560]" />
        <span className="ml-2 font-semibold text-sm">Loading mappings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Meta Catalog Category Mapping</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Map your store categories to Meta's official category taxonomy (Google Product Category path) to sync products correctly.
            </p>
          </div>
        </div>

        {categories.length === 0 ? (
          <div className="py-6 text-center text-sm text-gray-500">
            No categories available to map. Add categories first.
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            {categories.filter(c => c.slug !== 'shop').map(category => {
              const currentVal = mappings[category.id] || '';
              const isCustom = currentVal === 'custom' || (!PRESETS.includes(currentVal) && currentVal !== '');
              const selectValue = isCustom ? 'custom' : currentVal;

              return (
                <div key={category.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center pb-4 border-b border-gray-100 dark:border-gray-800 last:border-0 last:pb-0">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">{category.name}</h4>
                    <span className="text-[10px] text-gray-400 font-semibold">Slug: {category.slug}</span>
                  </div>
                  <div className="space-y-2">
                    <select
                      value={selectValue}
                      onChange={(e) => handleSelectChange(category.id, e.target.value)}
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-3 py-2 text-xs font-bold text-gray-900 dark:text-white focus:border-[#1a1a2e] dark:focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all cursor-pointer"
                    >
                      {PRESETS.map((preset) => (
                        <option key={preset} value={preset}>
                          {preset}
                        </option>
                      ))}
                      <option value="custom">Custom Meta Category Path...</option>
                    </select>

                    {selectValue === 'custom' && (
                      <input
                        type="text"
                        placeholder="e.g. Apparel & Accessories > Clothing > Swimwear"
                        value={customInputs[category.id] || ''}
                        onChange={(e) => handleCustomInputChange(category.id, e.target.value)}
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-3 py-2 text-xs font-medium text-gray-900 dark:text-white focus:border-[#1a1a2e] dark:focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
                      />
                    )}
                  </div>
                </div>
              );
            })}

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 justify-center rounded-xl bg-[#1a1a2e] hover:bg-[#e94560] disabled:bg-[#1a1a2e]/50 text-white px-5 py-2.5 text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Mappings</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
