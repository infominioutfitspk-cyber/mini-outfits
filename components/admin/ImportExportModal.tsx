'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Product } from '@/lib/types';
import { exportProducts, importProductsStream } from '@/lib/services/importExport';
import { toast } from 'sonner';
import { formatPrice } from '@/lib/utils/whatsapp';
import {
  X,
  Search,
  Download,
  Upload,
  FileDown,
  FileUp,
  PackageOpen,
  Loader2,
  Check
} from '@/components/common/Icons';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onImportComplete: () => void;
}

interface ImportProgressLog {
  productName: string;
  status: 'skipped' | 'overwritten' | 'imported' | 'error';
  message?: string;
  error?: string;
}

export default function ImportExportModal({
  isOpen,
  onClose,
  products,
  onImportComplete
}: ImportExportModalProps) {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');

  // --- Export Tab State ---
  const [exportSearch, setExportSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  // --- Import Tab State ---
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMeta, setImportMeta] = useState<{
    version: string;
    storeName: string;
    productCount: number;
    exportedAt: string;
  } | null>(null);
  const [conflictStrategy, setConflictStrategy] = useState<'skip' | 'overwrite' | 'rename'>('skip');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [importLogs, setImportLogs] = useState<ImportProgressLog[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive unique categories from products list
  const categories = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach(p => {
      if (p.category) {
        map.set(p.category.slug, p.category.name);
      }
    });
    return Array.from(map.entries()).map(([slug, name]) => ({ slug, name }));
  }, [products]);

  // Filtered products for export list
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch =
        p.name.toLowerCase().includes(exportSearch.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(exportSearch.toLowerCase()));
      const matchesCategory =
        selectedCategory === 'all' || (p.category && p.category.slug === selectedCategory);
      return matchesSearch && matchesCategory;
    });
  }, [products, exportSearch, selectedCategory]);

  const allFilteredSelected = useMemo(() => {
    if (filteredProducts.length === 0) return false;
    return filteredProducts.every(p => selectedIds.has(p.id));
  }, [filteredProducts, selectedIds]);

  // Handlers
  const handleToggleSelectProduct = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAllFiltered = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredProducts.forEach(p => next.delete(p.id));
      } else {
        filteredProducts.forEach(p => next.add(p.id));
      }
      return next;
    });
  };

  const handleExport = async () => {
    if (selectedIds.size === 0) {
      toast.error('Please select at least one product to export.');
      return;
    }

    setIsExporting(true);
    const idArray = Array.from(selectedIds);
    const toastId = toast.loading(`Preparing export bundle for ${idArray.length} product(s)...`);

    try {
      const bundle = await exportProducts(idArray);
      const dataStr = JSON.stringify(bundle, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      const storePrefix = bundle.storeName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const timestamp = new Date().toISOString().split('T')[0];
      
      link.href = url;
      link.download = `${storePrefix}-products-${timestamp}.zaynah-export.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Products exported successfully!', { id: toastId });
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Export failed', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('Please select a valid Zaynah export JSON file.');
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.version !== '1.0' || !Array.isArray(data.products)) {
        throw new Error('Unsupported or invalid export file format.');
      }

      setImportFile(file);
      setImportMeta({
        version: data.version,
        storeName: data.storeName || 'Unknown Store',
        productCount: data.products.length,
        exportedAt: data.exportedAt ? new Date(data.exportedAt).toLocaleDateString() : 'Unknown'
      });
      setImportLogs([]);
      setImportProgress(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to read export file');
      setImportFile(null);
      setImportMeta(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('Only .json files are supported.');
      return;
    }

    // Trigger file reader logic directly
    const input = fileInputRef.current;
    if (input) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      const event = new Event('change', { bubbles: true });
      input.dispatchEvent(event);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;

    setIsImporting(true);
    setImportLogs([]);
    setImportProgress({ current: 0, total: importMeta?.productCount || 0 });
    const toastId = toast.loading('Initializing product import...');

    try {
      await importProductsStream(importFile, conflictStrategy, (progress) => {
        if (progress.type === 'start') {
          setImportProgress({ current: 0, total: progress.total });
        } else {
          setImportProgress(prev => {
            if (!prev) return null;
            return { ...prev, current: prev.current + 1 };
          });
          setImportLogs(prev => [...prev, progress]);
        }
      });

      toast.success('Import process completed!', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Import failed midway', { id: toastId });
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportClose = () => {
    if (importLogs.length > 0) {
      onImportComplete();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-6 overflow-y-auto">
      <div 
        className="relative flex flex-col bg-white dark:bg-[#121224] w-full max-w-4xl h-[90vh] md:h-[85vh] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800/80 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-150 dark:border-gray-800/80 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <PackageOpen className="w-6 h-6 text-[#e94560]" />
              Import / Export Products
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Transfer products fully configured with images, variants, modifiers, and categories.
            </p>
          </div>
          <button 
            onClick={isImporting ? handleImportClose : onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500 dark:text-gray-400"
            disabled={isExporting || isImporting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-gray-150 dark:border-gray-800/80 bg-gray-50/50 dark:bg-gray-900/30">
          <button
            onClick={() => !isImporting && setActiveTab('export')}
            className={`flex items-center gap-2 px-6 py-3.5 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'export'
                ? 'border-[#e94560] text-[#e94560] dark:text-[#e94560]'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
            disabled={isExporting || isImporting}
          >
            <FileDown className="w-4 h-4" />
            Export Catalog
          </button>
          <button
            onClick={() => !isImporting && setActiveTab('import')}
            className={`flex items-center gap-2 px-6 py-3.5 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'import'
                ? 'border-[#e94560] text-[#e94560] dark:text-[#e94560]'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
            disabled={isExporting || isImporting}
          >
            <FileUp className="w-4 h-4" />
            Import Catalog
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'export' ? (
            <div className="flex flex-col h-full gap-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name or SKU..."
                    value={exportSearch}
                    onChange={e => setExportSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#e94560] dark:text-white"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="sm:w-48 px-3 py-2 text-sm bg-gray-50 dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#e94560] dark:text-white"
                >
                  <option value="all">All Categories</option>
                  {categories.filter(cat => cat.slug !== 'shop').map(cat => (
                    <option key={cat.slug} value={cat.slug}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product Checklist */}
              <div className="flex-1 border border-gray-150 dark:border-gray-800 rounded-xl overflow-hidden flex flex-col bg-gray-50/20 dark:bg-[#14142a]/30">
                <div className="flex items-center px-4 py-2.5 bg-gray-50 dark:bg-gray-800/40 border-b border-gray-150 dark:border-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={handleToggleSelectAllFiltered}
                    className="w-4.5 h-4.5 rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] cursor-pointer mr-4"
                  />
                  <span className="flex-1">Product Details</span>
                  <span className="w-24 text-right">Price</span>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">No products found matching criteria.</p>
                    </div>
                  ) : (
                    filteredProducts.map(p => {
                      const isSelected = selectedIds.has(p.id);
                      const primaryImage = p.images?.find(img => img.isPrimary) || p.images?.[0];
                      return (
                        <div 
                          key={p.id}
                          onClick={() => handleToggleSelectProduct(p.id)}
                          className={`flex items-center px-4 py-3 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-all ${
                            isSelected ? 'bg-gray-50/30 dark:bg-gray-800/10' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // toggled by row click
                            className="w-4.5 h-4.5 rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] cursor-pointer mr-4"
                          />
                          
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {primaryImage?.url ? (
                              <img
                                src={primaryImage.url}
                                alt={p.name}
                                className="w-10 h-10 object-cover rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-100"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-xs font-semibold text-gray-400">
                                None
                              </div>
                            )}
                            <div className="min-w-0">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                {p.name}
                              </h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1.5 mt-0.5">
                                {p.category ? (
                                  <span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300">
                                    {p.category.name}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">No Category</span>
                                )}
                                {p.sku && <span>• SKU: {p.sku}</span>}
                                <span>• {p.variants?.length ? `${p.variants.length} Variants` : 'No variants'}</span>
                              </p>
                            </div>
                          </div>

                          <span className="w-24 text-right text-sm font-bold text-gray-900 dark:text-white">
                            {formatPrice(p.price)}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Summary and Buttons */}
              <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800/80 pt-4">
                <span className="text-sm text-gray-600 dark:text-gray-400 font-semibold">
                  {selectedIds.size} of {products.length} product(s) selected
                </span>
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExport}
                    disabled={selectedIds.size === 0 || isExporting}
                    className="flex items-center gap-2 bg-[#e94560] hover:bg-[#d63d56] text-white font-semibold text-sm rounded-xl px-5 py-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Export Selected ({selectedIds.size})
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // --- Import Tab ---
            <div className="flex flex-col h-full gap-4">
              {!importFile ? (
                // Drag and Drop Zone
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-[#e94560] dark:hover:border-[#e94560] transition-colors rounded-2xl flex flex-col items-center justify-center p-8 text-center cursor-pointer bg-gray-50/50 dark:bg-gray-900/10"
                >
                  <Upload className="w-12 h-12 text-gray-400 mb-4" />
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Drag and drop your export JSON here
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
                    Select a previously downloaded <code className="text-[#e94560] font-mono">*.zaynah-export.json</code> file to import products and catalog content.
                  </p>
                  <button className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold text-xs rounded-xl transition-colors">
                    Browse Files
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".json"
                    className="hidden"
                  />
                </div>
              ) : (
                // File Overview and Import Form
                <div className="flex-1 flex flex-col gap-6">
                  {/* File Metadata Overview */}
                  <div className="bg-gray-50 dark:bg-[#16162a] border border-gray-150 dark:border-gray-800/80 p-5 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-red-50 dark:bg-red-950/30 text-[#e94560] rounded-xl">
                        <PackageOpen className="w-8 h-8" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                          {importFile.name}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span>Products: <strong className="text-gray-800 dark:text-white">{importMeta?.productCount}</strong></span>
                          <span>•</span>
                          <span>Source: <strong className="text-gray-800 dark:text-white">{importMeta?.storeName}</strong></span>
                          <span>•</span>
                          <span>Exported: <strong className="text-gray-800 dark:text-white">{importMeta?.exportedAt}</strong></span>
                        </p>
                      </div>
                    </div>
                    {!isImporting && (
                      <button
                        onClick={() => {
                          setImportFile(null);
                          setImportMeta(null);
                        }}
                        className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors"
                      >
                        Remove file
                      </button>
                    )}
                  </div>

                  {/* Settings / Options */}
                  {!isImporting && importLogs.length === 0 && (
                    <div className="flex flex-col gap-4 bg-gray-50/20 dark:bg-[#14142a]/10 border border-gray-150 dark:border-gray-800/80 p-5 rounded-2xl">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">Import Configuration</h4>
                      <div className="grid gap-2">
                        <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                          Conflict Strategy (If product slug already exists):
                        </label>
                        <select
                          value={conflictStrategy}
                          onChange={e => setConflictStrategy(e.target.value as any)}
                          className="px-3 py-2 text-sm bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#e94560] dark:text-white w-full max-w-sm"
                        >
                          <option value="skip">Skip existing products</option>
                          <option value="overwrite">Overwrite existing products (Replace variations/images)</option>
                          <option value="rename">Import as copies (Rename conflicts)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Progress logs & streaming outputs */}
                  {(isImporting || importLogs.length > 0) && (
                    <div className="flex-1 flex flex-col border border-gray-150 dark:border-gray-800 rounded-2xl overflow-hidden bg-gray-50/10 dark:bg-gray-900/10">
                      {/* Progress header & bar */}
                      {importProgress && (
                        <div className="p-4 bg-gray-50 dark:bg-gray-800/40 border-b border-gray-150 dark:border-gray-800">
                          <div className="flex items-center justify-between text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                            <span>Importing Products</span>
                            <span>
                              {importProgress.current} / {importProgress.total} ({Math.round((importProgress.current / importProgress.total) * 100)}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-[#e94560] h-full transition-all duration-300"
                              style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Logs scrolling panel */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs max-h-56">
                        {importLogs.map((log, index) => (
                          <div 
                            key={index}
                            className={`flex items-start gap-2 p-2 rounded-lg ${
                              log.status === 'error'
                                ? 'bg-red-50/50 dark:bg-red-950/10 text-red-600 dark:text-red-400'
                                : log.status === 'skipped'
                                ? 'bg-amber-50/50 dark:bg-amber-950/10 text-amber-600 dark:text-amber-400'
                                : 'bg-green-50/50 dark:bg-green-950/10 text-green-600 dark:text-green-400'
                            }`}
                          >
                            <span className="font-semibold uppercase text-[10px] tracking-wide px-1.5 py-0.5 rounded border border-current">
                              {log.status}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold truncate">{log.productName}</p>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                                {log.status === 'error' ? log.error : log.message}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions footer */}
                  <div className="flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800/80 pt-4">
                    {importLogs.length > 0 && !isImporting ? (
                      <button
                        onClick={handleImportClose}
                        className="bg-[#e94560] hover:bg-[#d63d56] text-white font-semibold text-sm rounded-xl px-6 py-2 transition-all"
                      >
                        Done
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={onClose}
                          className="px-4 py-2 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                          disabled={isImporting}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleImport}
                          disabled={isImporting}
                          className="flex items-center gap-2 bg-[#e94560] hover:bg-[#d63d56] text-white font-semibold text-sm rounded-xl px-5 py-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isImporting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Importing...
                            </>
                          ) : (
                            <>
                              <FileUp className="w-4 h-4" />
                              Start Import
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
