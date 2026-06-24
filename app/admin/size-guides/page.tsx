'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Trash2, Plus, Save, Ruler, ChevronDown, Edit2, Download, Upload
} from '@/components/common/Icons';
import { SizeGuide } from '@/lib/types';
import {
  getSizeGuides,
  createSizeGuide,
  updateSizeGuide,
  deleteSizeGuide
} from '@/lib/services/sizeGuides';
import { toast } from 'sonner';

export default function SizeGuidesPage() {
  const [guides, setGuides] = useState<SizeGuide[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit / Create Form states
  const [editingGuide, setEditingGuide] = useState<SizeGuide | null>(null);
  const [newName, setNewName] = useState('');
  const [newColumns, setNewColumns] = useState('Size, Chest, Length, Shoulder');
  const [newRows, setNewRows] = useState<Record<string, string>[]>([
    { 'Size': 'S', 'Chest': '38', 'Length': '26', 'Shoulder': '17' },
    { 'Size': 'M', 'Chest': '40', 'Length': '27', 'Shoulder': '18' },
    { 'Size': 'L', 'Chest': '42', 'Length': '28', 'Shoulder': '19' }
  ]);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedGuideIds, setSelectedGuideIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getSizeGuides();
      setGuides(data);
    } catch {
      toast.error('Failed to load size guides');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!newName.trim()) return toast.error('Guide name required');
    const cols = newColumns.split(',').map(s => s.trim()).filter(Boolean);
    if (cols.length === 0) return toast.error('At least one column required');
    const sanitizedRows = newRows.map(row => {
      const sanitized: Record<string, string> = {};
      cols.forEach(col => { sanitized[col] = row[col] || ''; });
      return sanitized;
    });
    try {
      setSaving(true);
      if (editingGuide) {
        const updated = await updateSizeGuide(editingGuide.id, {
          name: newName.trim(),
          chart_data: sanitizedRows
        });
        setGuides(prev => prev.map(g => g.id === editingGuide.id ? updated : g));
        setEditingGuide(null);
        toast.success('Size guide updated successfully!');
      } else {
        const created = await createSizeGuide({
          name: newName.trim(),
          chart_data: sanitizedRows
        });
        setGuides(prev => [...prev, created]);
        toast.success('Size guide saved!');
      }
      setNewName('');
      setNewColumns('Size, Chest, Length, Shoulder');
      setNewRows([
        { 'Size': 'S', 'Chest': '38', 'Length': '26', 'Shoulder': '17' },
        { 'Size': 'M', 'Chest': '40', 'Length': '27', 'Shoulder': '18' },
        { 'Size': 'L', 'Chest': '42', 'Length': '28', 'Shoulder': '19' }
      ]);
    } catch {
      toast.error(editingGuide ? 'Failed to update guide' : 'Failed to save guide');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this size guide preset?')) return;
    try {
      await deleteSizeGuide(id);
      setGuides(prev => prev.filter(g => g.id !== id));
      if (editingGuide?.id === id) {
        setEditingGuide(null);
        setNewName('');
        setNewColumns('Size, Chest, Length, Shoulder');
        setNewRows([]);
      }
      toast.success('Size guide deleted');
    } catch {
      toast.error('Failed to delete size guide');
    }
  };

  const handleExportJSON = () => {
    try {
      const toExport = selectedGuideIds.size > 0
        ? guides.filter(g => selectedGuideIds.has(g.id))
        : guides;
      if (toExport.length === 0) return toast.error('No size guides to export');
      const exportData = toExport.map(g => ({
        name: g.name,
        chart_data: g.chart_data,
        imageUrl: g.imageUrl
      }));
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `size-guides-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setSelectedGuideIds(new Set());
      toast.success('Size Guides exported successfully.');
    } catch {
      toast.error('Failed to export size guides');
    }
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!Array.isArray(json)) return toast.error('Invalid format. Must be a JSON array.');
        let imported = 0, updated = 0;
        const newGuides = [...guides];
        for (const item of json) {
          if (!item.name || !Array.isArray(item.chart_data)) continue;
          const existing = newGuides.find(g => g.name.toLowerCase() === item.name.toLowerCase());
          if (existing) {
            const updatedGuide = await updateSizeGuide(existing.id, {
              name: item.name,
              chart_data: item.chart_data,
              imageUrl: item.imageUrl || undefined
            });
            const idx = newGuides.findIndex(g => g.id === existing.id);
            if (idx !== -1) newGuides[idx] = updatedGuide;
            updated++;
          } else {
            const created = await createSizeGuide({
              name: item.name,
              chart_data: item.chart_data,
              imageUrl: item.imageUrl || undefined
            });
            newGuides.push(created);
            imported++;
          }
        }
        setGuides(newGuides);
        toast.success(`Import complete: ${imported} created, ${updated} updated.`);
      } catch {
        toast.error('Failed to parse and import JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-8 max-w-4xl pb-12">
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Size Guides</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Create reusable size chart presets and instantly link them to products.
        </p>
      </div>

      {/* Create / Edit Custom Preset */}
      <div className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {editingGuide ? `Edit Guide: ${editingGuide.name}` : 'Create Size Guide Preset'}
        </h2>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Preset Name</label>
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="e.g. Women's Kurtas Sizing"
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0f0f1b] px-4 py-2.5 text-sm focus:outline-none focus:border-[#e94560]"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Table Columns (Comma-separated)</label>
          <input
            type="text"
            value={newColumns}
            onChange={e => {
              const val = e.target.value;
              setNewColumns(val);
              const cols = val.split(',').map(s => s.trim()).filter(Boolean);
              setNewRows(prev => prev.map(row => {
                const updated = { ...row };
                cols.forEach(col => { if (updated[col] === undefined) updated[col] = ''; });
                return updated;
              }));
            }}
            placeholder="Size, Chest, Length, Shoulder"
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0f0f1b] px-4 py-2.5 text-sm focus:outline-none focus:border-[#e94560]"
          />
        </div>

        {/* Sizing Rows Table */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Sizing Rows</label>
          <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-[#0f0f1b]">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left border-collapse min-w-[300px]">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-gray-800">
                    {newColumns.split(',').map(s => s.trim()).filter(Boolean).map((col, i) => (
                      <th key={i} className="px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{col}</th>
                    ))}
                    <th className="px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right w-16">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {newRows.map((row, ri) => {
                    const activeCols = newColumns.split(',').map(s => s.trim()).filter(Boolean);
                    return (
                      <tr key={ri} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/30">
                        {activeCols.map((col, ci) => (
                          <td key={ci} className="px-2 py-2">
                            <input
                              type="text"
                              value={row[col] || ''}
                              onChange={(e) => {
                                const updated = [...newRows];
                                updated[ri] = { ...updated[ri], [col]: e.target.value };
                                setNewRows(updated);
                              }}
                              placeholder="-"
                              className="w-full min-h-[44px] px-2 py-1.5 text-xs border border-transparent hover:border-gray-200 focus:border-[#e94560] dark:focus:border-[#e94560] bg-transparent rounded-lg font-semibold focus:outline-none transition-colors"
                            />
                          </td>
                        ))}
                        <td className="px-4 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => setNewRows(prev => prev.filter((_, idx) => idx !== ri))}
                            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {newRows.length === 0 && (
                    <tr>
                      <td colSpan={newColumns.split(',').filter(Boolean).length + 1} className="text-center py-6 text-xs italic text-gray-400">
                        No sizing rows added. Click below to add your first row!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-3 bg-gray-50/50 dark:bg-white/5 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => {
                  const cols = newColumns.split(',').map(s => s.trim()).filter(Boolean);
                  const newRow: Record<string, string> = {};
                  cols.forEach(col => { newRow[col] = ''; });
                  setNewRows(prev => [...prev, newRow]);
                }}
                className="flex items-center gap-1.5 text-[#e94560] hover:text-[#e94560]/90 text-xs font-bold py-1.5 px-3 rounded-lg hover:bg-gray-100/50 dark:hover:bg-white/5 transition-all cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Sizing Row</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#e94560] text-white text-sm font-bold hover:bg-[#d8344e] transition-colors cursor-pointer disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : editingGuide ? 'Update Guide' : 'Save Guide'}
          </button>
          {editingGuide && (
            <button
              type="button"
              onClick={() => {
                setEditingGuide(null);
                setNewName('');
                setNewColumns('Size, Chest, Length, Shoulder');
                setNewRows([
                  { 'Size': 'S', 'Chest': '38', 'Length': '26', 'Shoulder': '17' },
                  { 'Size': 'M', 'Chest': '40', 'Length': '27', 'Shoulder': '18' },
                  { 'Size': 'L', 'Chest': '42', 'Length': '28', 'Shoulder': '19' }
                ]);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </div>

      {/* Saved Presets */}
      <div className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Saved Presets ({guides.length})
            </h2>
            {guides.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (selectedGuideIds.size === guides.length) {
                    setSelectedGuideIds(new Set());
                  } else {
                    setSelectedGuideIds(new Set(guides.map(g => g.id)));
                  }
                }}
                className="text-[10px] text-gray-500 dark:text-gray-400 hover:text-[#e94560] font-bold uppercase tracking-wider cursor-pointer"
              >
                {selectedGuideIds.size === guides.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
            {selectedGuideIds.size > 0 && (
              <span className="text-[10px] text-gray-400 font-semibold">{selectedGuideIds.size} selected</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-transparent border border-gray-200 dark:border-gray-800 hover:border-gray-350 dark:hover:border-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold uppercase rounded-xl transition-all cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              Export JSON
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-transparent border border-gray-200 dark:border-gray-800 hover:border-gray-350 dark:hover:border-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold uppercase rounded-xl transition-all cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" />
              Import JSON
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportJSON}
              accept=".json"
              className="hidden"
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : guides.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No presets yet. Import or create one above.</p>
        ) : (
          <div className="space-y-2">
            {guides.map(guide => {
              const isExpanded = expandedId === guide.id;
              const cols = guide.chart_data.length > 0 ? Object.keys(guide.chart_data[0]) : [];
              return (
                <div key={guide.id} className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
                  <div
                    className="flex items-center gap-3 p-3.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#0f0f1b] transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : guide.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedGuideIds.has(guide.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        setSelectedGuideIds(prev => {
                          const next = new Set(prev);
                          if (next.has(guide.id)) next.delete(guide.id);
                          else next.add(guide.id);
                          return next;
                        });
                      }}
                      onClick={e => e.stopPropagation()}
                      className="h-4 w-4 rounded border-gray-300 dark:border-gray-700 text-[#e94560] focus:ring-[#e94560] cursor-pointer flex-shrink-0"
                    />
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1a1a2e] dark:bg-[#e94560] flex-shrink-0">
                      <Ruler className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{guide.name}</p>
                      <p className="text-xs text-gray-400">{guide.chart_data.length} rows · {cols.length} columns</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setEditingGuide(guide);
                          setNewName(guide.name);
                          const colHeaders = guide.chart_data.length > 0 ? Object.keys(guide.chart_data[0]) : ['Size', 'Chest', 'Length', 'Shoulder'];
                          setNewColumns(colHeaders.join(', '));
                          setNewRows(guide.chart_data);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="p-1.5 text-blue-400 hover:text-blue-600 cursor-pointer"
                        title="Edit guide"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); handleDelete(guide.id); }}
                        className="p-1.5 text-red-400 hover:text-red-600 cursor-pointer"
                        title="Delete guide"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#0f0f1b]">
                      <div className="overflow-x-auto scrollbar-thin">
                        <table className="w-full text-left border-collapse min-w-[200px]">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                              {cols.map((col, i) => (
                                <th key={i} className="px-3 py-2 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {guide.chart_data.map((row, ri) => (
                              <tr key={ri} className="border-b border-gray-100 dark:border-gray-800">
                                {cols.map((col, ci) => (
                                  <td key={ci} className="px-3 py-2 text-xs font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap">
                                    {row[col] || '-'}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {guide.imageUrl && (
                        <div className="mt-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={guide.imageUrl} alt={guide.name} className="max-h-32 rounded-lg object-contain" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
