'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Trash2, Plus, Save, Tag, Palette, Ruler, Package, ChevronDown, Edit2, Download, Upload
} from '@/components/common/Icons';
import { VariantPreset, VariantPresetValue } from '@/lib/types';
import {
  getVariantPresets,
  createVariantPreset,
  deleteVariantPreset,
  updateVariantPreset
} from '@/lib/services/variantPresets';
import { toast } from 'sonner';

const standardColorMap: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
  red: '#e94560',
  blue: '#1a1a2e',
  navy: '#1a1a2e',
  grey: '#9ca3af',
  gray: '#9ca3af',
  green: '#10b981',
  yellow: '#f59e0b',
  orange: '#f97316',
  purple: '#a855f7',
  pink: '#ec4899',
  beige: '#f5f5dc',
  brown: '#a52a2a',
  gold: '#ffd700',
  silver: '#c0c0c0',
  cream: '#fffdd0'
};

const ATTR_ICONS = { color: Palette, size: Ruler, material: Package, custom: Tag };
const ATTR_LABELS = { color: 'Color', size: 'Size', material: 'Material', custom: 'Custom' };

export default function VariantPresetsPage() {
  const [presets, setPresets] = useState<VariantPreset[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit / Create Form states
  const [editingPreset, setEditingPreset] = useState<VariantPreset | null>(null);
  const [newName, setNewName] = useState('');
  const [newAttr, setNewAttr] = useState<VariantPreset['attribute']>('size');
  const [newInput, setNewInput] = useState('');
  const [newValues, setNewValues] = useState<VariantPresetValue[]>([]);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedPresetIds, setSelectedPresetIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getVariantPresets();
      setPresets(data);
    } catch {
      toast.error('Failed to load presets');
    } finally {
      setLoading(false);
    }
  };

  const addValue = () => {
    const raw = newInput.trim().replace(/,$/, '');
    if (!raw) return;
    const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
    parts.forEach(label => {
      if (!newValues.find(v => v.label === label)) {
        const lowerLabel = label.toLowerCase();
        const hex = newAttr === 'color' ? (standardColorMap[lowerLabel] || '#888888') : undefined;
        setNewValues(prev => [...prev, { label, hex }]);
      }
    });
    setNewInput('');
  };

  const handleSave = async () => {
    if (!newName.trim()) return toast.error('Preset name required');
    if (newValues.length === 0) return toast.error('Add at least one value');
    try {
      setSaving(true);
      if (editingPreset) {
        const updated = await updateVariantPreset(editingPreset.id, {
          name: newName.trim(),
          attribute: newAttr,
          values: newValues
        });
        setPresets(prev => prev.map(p => p.id === editingPreset.id ? updated : p));
        setEditingPreset(null);
        toast.success('Preset updated successfully!');
      } else {
        const created = await createVariantPreset({ name: newName.trim(), attribute: newAttr, values: newValues });
        setPresets(prev => [...prev, created]);
        toast.success('Preset saved!');
      }
      setNewName('');
      setNewValues([]);
      setNewInput('');
    } catch {
      toast.error(editingPreset ? 'Failed to update preset' : 'Failed to save preset');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this preset?')) return;
    try {
      await deleteVariantPreset(id);
      setPresets(prev => prev.filter(p => p.id !== id));
      if (editingPreset?.id === id) {
        setEditingPreset(null);
        setNewName('');
        setNewValues([]);
        setNewInput('');
      }
      toast.success('Preset deleted');
    } catch {
      toast.error('Failed to delete preset');
    }
  };

  const handleExportJSON = () => {
    try {
      const toExport = selectedPresetIds.size > 0
        ? presets.filter(p => selectedPresetIds.has(p.id))
        : presets;
      if (toExport.length === 0) return toast.error('No presets to export');
      const exportData = toExport.map(p => ({
        name: p.name,
        attribute: p.attribute,
        values: p.values
      }));
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `variant-presets-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setSelectedPresetIds(new Set());
      
      toast.success('Variant Presets exported successfully.');
    } catch {
      toast.error('Failed to export presets');
    }
  };

  // Import presets from a JSON file and save to DB
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!Array.isArray(json)) {
          return toast.error('Invalid file format. Presets must be a JSON array.');
        }

        let importedCount = 0;
        let updatedCount = 0;
        const newPresets = [...presets];

        for (const item of json) {
          if (!item.name || !item.attribute || !Array.isArray(item.values)) {
            continue; // Skip invalid presets
          }

          const validAttrs = ['color', 'size', 'material', 'custom'];
          if (!validAttrs.includes(item.attribute)) continue;

          // Check if name already exists
          const existing = newPresets.find(p => p.name.toLowerCase() === item.name.toLowerCase());
          if (existing) {
            // Update existing in DB
            const updated = await updateVariantPreset(existing.id, {
              name: item.name,
              attribute: item.attribute,
              values: item.values
            });
            const idx = newPresets.findIndex(p => p.id === existing.id);
            if (idx !== -1) {
              newPresets[idx] = updated;
            }
            updatedCount++;
          } else {
            // Create new in DB
            const created = await createVariantPreset({
              name: item.name,
              attribute: item.attribute,
              values: item.values
            });
            newPresets.push(created);
            importedCount++;
          }
        }

        setPresets(newPresets);
        toast.success(`Import completed: ${importedCount} new created, ${updatedCount} updated.`);
      } catch (err) {
        toast.error('Failed to parse and import JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const AttrIcon = ATTR_ICONS[newAttr];

  return (
    <div className="space-y-8 max-w-4xl pb-12">
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Variant Presets</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Save reusable variant sets (sizes, colors, materials) and instantly import them when creating products.
        </p>
      </div>

      {/* Create / Edit Custom Preset */}
      <div className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {editingPreset ? `Edit Preset: ${editingPreset.name}` : 'Create Custom Preset'}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Preset Name</label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. My Shop Sizes"
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0f0f1b] px-4 py-2.5 text-sm focus:outline-none focus:border-[#e94560]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Attribute Type</label>
            <select
              value={newAttr}
              onChange={e => {
                setNewAttr(e.target.value as VariantPreset['attribute']);
                setNewValues([]);
              }}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0f0f1b] px-4 py-2.5 text-sm focus:outline-none focus:border-[#e94560]"
            >
              {(['color','size','material','custom'] as const).map(a => (
                <option key={a} value={a}>{ATTR_LABELS[a]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Values</label>
          <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
            {newValues.map((v, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-[#0f0f1b] border border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-800 dark:text-gray-200 shadow-sm">
                {newAttr === 'color' && (
                  <input
                    type="color"
                    value={v.hex || '#888888'}
                    onChange={(e) => {
                      setNewValues(prev => prev.map((item, idx) => 
                        idx === i ? { ...item, hex: e.target.value } : item
                      ));
                    }}
                    className="h-5 w-5 rounded cursor-pointer border-0 p-0 bg-transparent flex-shrink-0"
                    title="Select color"
                  />
                )}
                <span>{v.label}</span>
                <button type="button" onClick={() => setNewValues(prev => prev.filter((_, j) => j !== i))} className="ml-1.5 text-gray-400 hover:text-red-500 font-bold cursor-pointer">×</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type value(s), press Enter or comma to add"
              value={newInput}
              onChange={e => setNewInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  addValue();
                }
              }}
              className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0f0f1b] px-4 py-2.5 text-sm focus:outline-none focus:border-[#e94560]"
            />
            <button
              type="button"
              onClick={addValue}
              className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-bold hover:bg-[#1a1a2e] hover:text-white transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
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
            {saving ? 'Saving…' : editingPreset ? 'Update Preset' : 'Save Preset'}
          </button>
          {editingPreset && (
            <button
              type="button"
              onClick={() => {
                setEditingPreset(null);
                setNewName('');
                setNewAttr('size');
                setNewValues([]);
                setNewInput('');
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
              Saved Presets ({presets.length})
            </h2>
            {presets.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (selectedPresetIds.size === presets.length) {
                    setSelectedPresetIds(new Set());
                  } else {
                    setSelectedPresetIds(new Set(presets.map(p => p.id)));
                  }
                }}
                className="text-[10px] text-gray-500 dark:text-gray-400 hover:text-[#e94560] font-bold uppercase tracking-wider cursor-pointer"
              >
                {selectedPresetIds.size === presets.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
            {selectedPresetIds.size > 0 && (
              <span className="text-[10px] text-gray-400 font-semibold">
                {selectedPresetIds.size} selected
              </span>
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
            {[1,2,3].map(i => (
              <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : presets.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No presets yet. Import or create one above.</p>
        ) : (
          <div className="space-y-2">
            {presets.map(preset => {
              const Icon = ATTR_ICONS[preset.attribute] || Tag;
              const isExpanded = expandedId === preset.id;
              return (
                <div key={preset.id} className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
                  <div
                    className="flex items-center gap-3 p-3.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#0f0f1b] transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : preset.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPresetIds.has(preset.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        setSelectedPresetIds(prev => {
                          const next = new Set(prev);
                          if (next.has(preset.id)) next.delete(preset.id);
                          else next.add(preset.id);
                          return next;
                        });
                      }}
                      onClick={e => e.stopPropagation()}
                      className="h-4 w-4 rounded border-gray-300 dark:border-gray-700 text-[#e94560] focus:ring-[#e94560] cursor-pointer flex-shrink-0"
                    />
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1a1a2e] dark:bg-[#e94560] flex-shrink-0">
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{preset.name}</p>
                      <p className="text-xs text-gray-400">{ATTR_LABELS[preset.attribute]} · {preset.values.length} values</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setEditingPreset(preset);
                          setNewName(preset.name);
                          setNewAttr(preset.attribute);
                          setNewValues(preset.values);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="p-1.5 text-blue-400 hover:text-blue-600 cursor-pointer"
                        title="Edit preset"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); handleDelete(preset.id); }}
                        className="p-1.5 text-red-400 hover:text-red-600 cursor-pointer"
                        title="Delete preset"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#0f0f1b]">
                      <div className="flex flex-wrap gap-1.5">
                        {preset.values.map((v, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#16162a] text-xs font-semibold text-gray-800 dark:text-gray-200"
                          >
                            {preset.attribute === 'color' && v.hex && (
                              <span className="h-3 w-3 rounded-full border border-gray-200 flex-shrink-0" style={{ background: v.hex }} />
                            )}
                            {v.label}
                          </div>
                        ))}
                      </div>
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
