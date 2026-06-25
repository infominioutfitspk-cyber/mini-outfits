'use client';

import React, { useState, useMemo } from 'react';
import { HomepageSection, Category, Product } from '@/lib/types';
import { ChevronUp, ChevronDown, GripVertical, Trash2, Search, X } from '@/components/common/Icons';
import Image from 'next/image';

interface ProductGridSettingsProps {
  section: HomepageSection;
  categories: Category[];
  products?: Product[];
  onUpdateSection: (updates: Partial<HomepageSection>) => void;
}

export default function ProductGridSettings({
  section,
  categories,
  products = [],
  onUpdateSection
}: ProductGridSettingsProps) {
  const settings = section.settings || {};

  const handleSettingsChange = (key: string, value: any) => {
    onUpdateSection({
      settings: { ...settings, [key]: value }
    });
  };

  const sortMethod = settings.sortMethod || (settings.source === 'featured' ? 'featured' : settings.source && settings.source !== 'all' ? 'category' : 'all');
  const manualProductIds: string[] = settings.manualProductIds || [];

  const [pickerSearch, setPickerSearch] = useState('');

  const filteredPickerProducts = useMemo(() => {
    if (!pickerSearch.trim()) return [];
    const q = pickerSearch.toLowerCase();
    return products
      .filter(p =>
        !manualProductIds.includes(p.id) &&
        (p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q)))
      )
      .slice(0, 10);
  }, [pickerSearch, products, manualProductIds]);

  const manualProducts = useMemo(() => {
    return manualProductIds
      .map(id => products.find(p => p.id === id))
      .filter((p): p is Product => !!p);
  }, [manualProductIds, products]);

  const addProduct = (productId: string) => {
    handleSettingsChange('manualProductIds', [...manualProductIds, productId]);
    setPickerSearch('');
  };

  const removeProduct = (productId: string) => {
    handleSettingsChange('manualProductIds', manualProductIds.filter(id => id !== productId));
  };

  const moveProduct = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= manualProductIds.length) return;
    const copy = [...manualProductIds];
    const [removed] = copy.splice(index, 1);
    copy.splice(newIndex, 0, removed);
    handleSettingsChange('manualProductIds', copy);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
          Product Source
        </label>
        <select
          value={settings.source || 'all'}
          onChange={e => handleSettingsChange('source', e.target.value)}
          className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#e94560] text-gray-900 dark:text-white"
        >
          <option value="all">All Products</option>
          <option value="featured">Featured Products Only</option>
          {categories.filter(cat => cat.slug !== 'shop' && cat.id !== '00000000-0000-4000-8000-000000000099').map(cat => (
            <option key={cat.id} value={cat.id}>
              Category: {cat.name}
            </option>
          ))}
        </select>
      </div>

      <hr className="border-gray-200 dark:border-gray-800" />

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
          Sort Method
        </label>
        <select
          value={sortMethod}
          onChange={e => {
            handleSettingsChange('sortMethod', e.target.value);
            if (e.target.value === 'manual' && !settings.manualProductIds) {
              handleSettingsChange('manualProductIds', []);
            }
          }}
          className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#e94560] text-gray-900 dark:text-white"
        >
          <option value="all">Default (as fetched)</option>
          <option value="manual">Manual Pick &amp; Sort</option>
          <option value="featured">Featured Only</option>
          <option value="recent">Recent Added</option>
          <option value="category">Selected Category Order</option>
        </select>
      </div>

      {sortMethod === 'manual' && (
        <div className="space-y-3 p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Type product name or SKU to add..."
              value={pickerSearch}
              onChange={e => setPickerSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#0f0f1b] border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:outline-none focus:border-[#e94560] text-gray-900 dark:text-white"
            />
            {pickerSearch && (
              <button onClick={() => setPickerSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {pickerSearch && filteredPickerProducts.length > 0 && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-[#0f0f1b] divide-y divide-gray-100 dark:divide-gray-800 max-h-40 overflow-y-auto">
              {filteredPickerProducts.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addProduct(p.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/5 text-left transition-colors cursor-pointer"
                >
                  <div className="relative h-7 w-7 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {p.images?.[0] && (
                      <Image src={p.images[0].url} alt={p.name} fill className="object-cover" sizes="28px" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">{p.name}</div>
                    {p.sku && <div className="text-[10px] text-gray-400">{p.sku}</div>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {pickerSearch && filteredPickerProducts.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-2">No products found</p>
          )}

          {manualProducts.length > 0 && (
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {manualProducts.map((p, idx) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 p-2 bg-white dark:bg-[#0f0f1b] rounded-xl border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveProduct(idx, 'up')}
                      disabled={idx === 0}
                      className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-white disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronUp className="h-2.5 w-2.5" />
                    </button>
                    <span className="p-0.5 text-gray-400 cursor-grab select-none">
                      <GripVertical className="h-3 w-3" />
                    </span>
                    <button
                      type="button"
                      onClick={() => moveProduct(idx, 'down')}
                      disabled={idx === manualProducts.length - 1}
                      className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-white disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronDown className="h-2.5 w-2.5" />
                    </button>
                  </div>
                  <div className="relative h-8 w-8 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {p.images?.[0] && (
                      <Image src={p.images[0].url} alt={p.name} fill className="object-cover" sizes="32px" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">{p.name}</div>
                    <div className="text-[10px] text-gray-400">{p.sku || 'No SKU'}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeProduct(p.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex justify-between">
          <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
            Product Limit
          </label>
          <span className="text-xs font-bold text-[#e94560]">
            {settings.limit || 8}
          </span>
        </div>
        <input
          type="range"
          min="2"
          max="24"
          step="2"
          value={settings.limit || 8}
          onChange={e => handleSettingsChange('limit', parseInt(e.target.value))}
          className="w-full accent-[#e94560]"
        />
      </div>
      <hr className="border-gray-200 dark:border-gray-800" />

      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
          Upper View All Button Text
        </label>
        <input
          type="text"
          value={settings.viewAllText || ''}
          onChange={e => handleSettingsChange('viewAllText', e.target.value)}
          placeholder="View All"
          className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#e94560] text-gray-900 dark:text-white"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
          Upper View All Custom Link
        </label>
        <input
          type="text"
          value={settings.viewAllUrl || ''}
          onChange={e => handleSettingsChange('viewAllUrl', e.target.value)}
          placeholder="e.g. /shop?category=co-ord-sets"
          className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#e94560] text-gray-900 dark:text-white"
        />
        <p className="text-[10px] text-gray-400 leading-normal">
          If left blank, it will automatically link to the selected category page.
        </p>
      </div>

      <hr className="border-gray-200 dark:border-gray-800" />

      <div className="space-y-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Bottom Grid Actions</p>

        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300">Enable Bottom View All Button</label>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={settings.bottomEnableViewAll === true}
              onChange={e => handleSettingsChange('bottomEnableViewAll', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#e94560]" />
          </label>
        </div>

        {settings.bottomEnableViewAll === true && (
          <div className="space-y-2 pl-2 border-l-2 border-[#e94560]/30">
            <input
              type="text"
              value={settings.bottomViewAllText || ''}
              onChange={e => handleSettingsChange('bottomViewAllText', e.target.value)}
              placeholder="Grid View All"
              className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#e94560] text-gray-900 dark:text-white"
            />
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400">Bg Color</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={settings.bottomViewAllBgColor || '#FFD147'}
                  onChange={e => handleSettingsChange('bottomViewAllBgColor', e.target.value)}
                  className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => handleSettingsChange('bottomViewAllBgColor', '')}
                  className="text-[9px] text-gray-400 hover:text-[#e94560] font-bold uppercase tracking-wider cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400">Text Color</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={settings.bottomViewAllTextColor || '#0f172a'}
                  onChange={e => handleSettingsChange('bottomViewAllTextColor', e.target.value)}
                  className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => handleSettingsChange('bottomViewAllTextColor', '')}
                  className="text-[9px] text-gray-400 hover:text-[#e94560] font-bold uppercase tracking-wider cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300">Enable Bottom Load More Button</label>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={settings.bottomEnableLoadMore === true}
              onChange={e => handleSettingsChange('bottomEnableLoadMore', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#e94560]" />
          </label>
        </div>

        {settings.bottomEnableLoadMore === true && (
          <div className="space-y-2 pl-2 border-l-2 border-[#e94560]/30">
            <input
              type="text"
              value={settings.bottomLoadMoreText || ''}
              onChange={e => handleSettingsChange('bottomLoadMoreText', e.target.value)}
              placeholder="Load More"
              className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#e94560] text-gray-900 dark:text-white"
            />
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400">Bg Color</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={settings.bottomLoadMoreBgColor || '#f1f5f9'}
                  onChange={e => handleSettingsChange('bottomLoadMoreBgColor', e.target.value)}
                  className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => handleSettingsChange('bottomLoadMoreBgColor', '')}
                  className="text-[9px] text-gray-400 hover:text-[#e94560] font-bold uppercase tracking-wider cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400">Text Color</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={settings.bottomLoadMoreTextColor || '#1e293b'}
                  onChange={e => handleSettingsChange('bottomLoadMoreTextColor', e.target.value)}
                  className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => handleSettingsChange('bottomLoadMoreTextColor', '')}
                  className="text-[9px] text-gray-400 hover:text-[#e94560] font-bold uppercase tracking-wider cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
