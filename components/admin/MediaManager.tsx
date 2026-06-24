'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  Search, 
  Upload, 
  Image as ImageIcon, 
  Check, 
  Play, 
  Trash2, 
  Copy, 
  Zap, 
  CheckCircle2, 
  Loader2, 
  Edit, 
  SlidersHorizontal, 
  Plus,
  Download,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Archive,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Undo,
  Sliders,
  Eye,
  Save
} from '@/components/common/Icons';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { logDbError } from '@/lib/utils/dbErrorHandler';
import JSZip from 'jszip';
import { useAdminTab } from '@/lib/hooks/useAdminTab';

interface MediaManagerProps {
  mode: 'library' | 'selector';
  onSelect?: (urls: string[]) => void;
  multiple?: boolean;
  onClose?: () => void;
}

interface MediaItem {
  id: string;
  original_filename: string;
  seo_filename: string;
  file_url: string;
  alt_text: string;
  title: string;
  description: string;
  caption: string;
  ai_generated: boolean;
  ai_enabled: boolean;
  bucket: string;
  created_at: string;
  file_size?: number;
  mime_type?: string;
}

interface UploadTask {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'failed' | 'cancelled';
  error?: string;
}

type MainTab = 'library' | 'cleaner';

// ─── URL Normalizer for accurate matching ───────────────────────────────────
// Strips query params, decodes URI, and extracts the storage path segment
const normalizeUrl = (url: string): string => {
  try {
    const u = new URL(url);
    return decodeURIComponent(u.pathname).toLowerCase();
  } catch {
    return decodeURIComponent(url).toLowerCase();
  }
};

export default function MediaManager({ mode, onSelect, multiple = false, onClose }: MediaManagerProps) {
  const [mainTab, setMainTab] = useAdminTab<MainTab>('library');

  // ─── Library State ──────────────────────────────────────────────────────
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [deletedBytes, setDeletedBytes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [aiFilter, setAiFilter] = useState<'all' | 'generated' | 'pending'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'size-desc' | 'size-asc'>('newest');
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'video'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'last_7' | 'last_30'>('all');

  // ─── Pagination State ───────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // ─── Usage Cross-Reference State ────────────────────────────────────────
  const [usedNormUrls, setUsedNormUrls] = useState<Set<string>>(new Set());
  const [sectionsData, setSectionsData] = useState<any[]>([]);
  const [usageLoading, setUsageLoading] = useState(true);
  const [onlyUnused, setOnlyUnused] = useState(false);

  // ─── Library Selection State ─────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedLibraryUrls, setSelectedLibraryUrls] = useState<Set<string>>(new Set());

  // ─── Cleaner Selection State (separate from library) ────────────────────
  const [cleanerUsedSelected, setCleanerUsedSelected] = useState<Set<string>>(new Set());
  const [cleanerUnusedSelected, setCleanerUnusedSelected] = useState<Set<string>>(new Set());
  const [cleanerSearch, setCleanerSearch] = useState('');
  const [cleanerTypeFilter, setCleanerTypeFilter] = useState<'all' | 'image' | 'video'>('all');
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // ─── Upload Queue State ──────────────────────────────────────────────────
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Vision AI Settings ──────────────────────────────────────────────────
  const [globalAi, setGlobalAi] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [bulkGenerating, setBulkGenerating] = useState(false);

  // ─── Edit Metadata Modal State ───────────────────────────────────────────
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [pendingVideoUpload, setPendingVideoUpload] = useState<{ task: UploadTask; file: File } | null>(null);

  // ─── Image Preview & Light Editor State ────────────────────────────────
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [blur, setBlur] = useState(0);
  const [grayscale, setGrayscale] = useState(0);
  const [sepia, setSepia] = useState(0);
  const [invert, setInvert] = useState(0);
  const [isSavingEdits, setIsSavingEdits] = useState(false);

  // ════════════════════════════════════════════════════════════════════════
  // 1. DATA LOADING
  // ════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    fetchMedia();
    loadUsageCrossReferences();
    if (mode === 'library') {
      fetchAiSettings();
    }
  }, [search, aiFilter, sortBy, typeFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, aiFilter, sortBy, typeFilter, dateFilter, onlyUnused, mainTab]);

  const fetchAiSettings = async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('ai_settings')
        .select('auto_media_ai')
        .eq('id', '00000000-0000-4000-8000-000000000002')
        .single();
      if (data) setGlobalAi(data.auto_media_ai);
    } catch (err) {
      console.warn('[Media Manager] Could not load global AI settings:', err);
    }
  };

  const loadUsageCrossReferences = async () => {
    try {
      setUsageLoading(true);
      const supabase = createClient();
      const [cats, variants, sizeGuides, settings, sections, productImgs] = await Promise.all([
        supabase.from('categories').select('image_url'),
        supabase.from('product_variants').select('image_url'),
        supabase.from('size_guides').select('image_url'),
        supabase.from('store_settings').select('logo_url, favicon_url, banner_url, exit_intent_image_url').single(),
        supabase.from('homepage_sections').select('settings, content_data'),
        supabase.from('product_images').select('url'),
      ]);

      const rawUrls: string[] = [];
      cats.data?.forEach(c => c.image_url && rawUrls.push(c.image_url));
      variants.data?.forEach(v => v.image_url && rawUrls.push(v.image_url));
      sizeGuides.data?.forEach(sg => sg.image_url && rawUrls.push(sg.image_url));
      productImgs.data?.forEach(pi => pi.url && rawUrls.push(pi.url));
      if (settings.data) {
        const s = settings.data;
        if (s.logo_url) rawUrls.push(s.logo_url);
        if (s.favicon_url) rawUrls.push(s.favicon_url);
        if (s.banner_url) rawUrls.push(s.banner_url);
        if (s.exit_intent_image_url) rawUrls.push(s.exit_intent_image_url);
      }

      // Normalize all used URLs for accurate matching
      const normalizedSet = new Set(rawUrls.map(normalizeUrl));

      setUsedNormUrls(normalizedSet);
      setSectionsData(sections.data || []);
    } catch (err) {
      console.error('[Media Manager] Failed to load usage references:', err);
    } finally {
      setUsageLoading(false);
    }
  };

  const fetchMedia = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      let query = supabase.from('media_library').select('*').is('deleted_at', null);

      if (search.trim()) {
        query = query.ilike('original_filename', `%${search}%`);
      }
      if (aiFilter === 'generated') {
        query = query.eq('ai_generated', true);
      } else if (aiFilter === 'pending') {
        query = query.eq('ai_generated', false);
      }
      if (typeFilter === 'image') {
        query = query.like('mime_type', 'image/%');
      } else if (typeFilter === 'video') {
        query = query.like('mime_type', 'video/%');
      }
      if (sortBy === 'newest') query = query.order('created_at', { ascending: false });
      else if (sortBy === 'oldest') query = query.order('created_at', { ascending: true });
      else if (sortBy === 'size-desc') query = query.order('file_size', { ascending: false });
      else if (sortBy === 'size-asc') query = query.order('file_size', { ascending: true });

      const { data, error } = await query;
      if (error) throw error;
      setMedia(data || []);

      // Also fetch total size of soft-deleted media for accurate storage
      const { data: deletedData } = await supabase
        .from('media_library')
        .select('file_size')
        .not('deleted_at', 'is', null);
      const totalDeletedBytes = (deletedData || []).reduce((sum, item) => sum + (item.file_size || 0), 0);
      setDeletedBytes(totalDeletedBytes);
    } catch (err: any) {
      console.error('[Media Manager] Load error:', err);
      toast.error('Failed to load media files');
    } finally {
      setLoading(false);
    }
  };

  // ════════════════════════════════════════════════════════════════════════
  // 2. ACCURATE USAGE DETECTION
  // ════════════════════════════════════════════════════════════════════════

  const isMediaUsed = useCallback((item: MediaItem): boolean => {
    const normItemUrl = normalizeUrl(item.file_url);
    
    // Direct normalized URL match
    if (usedNormUrls.has(normItemUrl)) return true;

    // Filename-level match (handles CDN URL changes, transformations)
    const itemFilename = normItemUrl.split('/').pop() || '';
    for (const usedNorm of usedNormUrls) {
      const usedFilename = usedNorm.split('/').pop() || '';
      if (itemFilename && usedFilename && itemFilename === usedFilename) return true;
    }

    // Scan homepage sections JSON for URL substring match
    return sectionsData.some(sec => {
      const settingsStr = sec.settings ? JSON.stringify(sec.settings) : '';
      const contentStr = sec.content_data ? JSON.stringify(sec.content_data) : '';
      const combined = (settingsStr + contentStr).toLowerCase();
      return combined.includes(normItemUrl) || combined.includes(itemFilename);
    });
  }, [usedNormUrls, sectionsData]);

  // ════════════════════════════════════════════════════════════════════════
  // 3. COMPUTED FILTERED LISTS
  // ════════════════════════════════════════════════════════════════════════

  const applyDateFilter = (items: MediaItem[]) => {
    if (dateFilter === 'all') return items;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return items.filter(item => {
      const d = new Date(item.created_at);
      if (dateFilter === 'today') return d >= today;
      if (dateFilter === 'yesterday') {
        const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
        return d >= yesterday && d < today;
      }
      if (dateFilter === 'last_7') {
        const cutoff = new Date(today); cutoff.setDate(cutoff.getDate() - 7);
        return d >= cutoff;
      }
      if (dateFilter === 'last_30') {
        const cutoff = new Date(today); cutoff.setDate(cutoff.getDate() - 30);
        return d >= cutoff;
      }
      return true;
    });
  };

  const filteredMedia = applyDateFilter(
    media.filter(item => onlyUnused ? !isMediaUsed(item) : true)
  );

  const paginatedMedia = filteredMedia.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Cleaner lists — all media, split by usage
  const cleanerFiltered = media.filter(item => {
    if (cleanerSearch.trim() && !item.original_filename.toLowerCase().includes(cleanerSearch.toLowerCase())) return false;
    if (cleanerTypeFilter === 'image') return item.mime_type?.startsWith('image/');
    if (cleanerTypeFilter === 'video') return item.mime_type?.startsWith('video/');
    return true;
  });

  const cleanerUsed   = cleanerFiltered.filter(item => isMediaUsed(item));
  const cleanerUnused = cleanerFiltered.filter(item => !isMediaUsed(item));

  // Storage stats
  const totalCapacityBytes = 1024 * 1024 * 1024;
  const usedBytes = media.reduce((sum, item) => sum + (item.file_size || 0), 0) + deletedBytes;
  const unusedBytes = cleanerUnused.reduce((sum, item) => sum + (item.file_size || 0), 0);
  const usedPercentage = Math.min(100, (usedBytes / totalCapacityBytes) * 100);
  const isUploading = uploadTasks.some(t => t.status === 'uploading');

  // ════════════════════════════════════════════════════════════════════════
  // 4. UPLOAD LOGIC
  // ════════════════════════════════════════════════════════════════════════

  const getVideoDuration = (file: File): Promise<number> =>
    new Promise(resolve => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => { window.URL.revokeObjectURL(video.src); resolve(video.duration); };
      video.onerror = () => { window.URL.revokeObjectURL(video.src); resolve(-1); };
      video.src = URL.createObjectURL(file);
    });

  const executeActualUpload = async (taskId: string, file: File) => {
    try {
      setUploadTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'uploading', progress: 50 } : t));
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'product-images');
      const response = await fetch('/api/media/upload', { method: 'POST', body: formData });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Upload endpoint failed');
      }
      const resData = await response.json();
      setUploadTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed', progress: 100 } : t));
      toast.success(`"${file.name}" uploaded successfully!`);
      if (resData.meta?.ai_generated) toast.info(`Auto AI description added for: ${file.name}`);
      fetchMedia();
      if (mode === 'selector') {
        setSelectedLibraryUrls(prev => {
          const next = multiple ? new Set(prev) : new Set<string>();
          next.add(resData.url);
          return next;
        });
      }
    } catch (err: any) {
      setUploadTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'failed', error: err.message || 'Upload failed' } : t));
      toast.error(`"${file.name}" upload failed: ${err.message}`);
    }
  };

  const startUploadTask = async (task: UploadTask) => {
    const { file, id: taskId } = task;
    const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v|avi|mkv|ogv)$/i.test(file.name);
    if (isVideo) {
      const duration = await getVideoDuration(file);
      if (duration > 60) {
        setUploadTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'failed', error: 'Exceeds 1-minute limit' } : t));
        toast.error(`"${file.name}" is too long. Videos must be 1 minute or less.`);
        return;
      }
      const isWebm = file.name.toLowerCase().endsWith('.webm') || file.type === 'video/webm';
      if (!isWebm) {
        setPendingVideoUpload({ task, file });
        setUploadTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'failed', error: 'Waiting for format confirmation' } : t));
        return;
      }
    }
    executeActualUpload(taskId, file);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (mode === 'selector' && !multiple && files.length > 1) { toast.warning('Please select only one file.'); return; }
    setUploading(true);
    const newTasks = files.map(file => ({ id: `task_${Date.now()}_${Math.random().toString(36).substring(2)}`, file, progress: 0, status: 'uploading' as const }));
    setUploadTasks(prev => [...prev, ...newTasks]);
    newTasks.forEach(task => startUploadTask(task));
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (e.target) e.target.value = '';
  };

  const handleCancelUpload = (taskId: string) => setUploadTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'cancelled' as const } : t));
  const handleRetryUpload = (taskId: string) => {
    const task = uploadTasks.find(t => t.id === taskId);
    if (task) startUploadTask(task);
  };

  // ════════════════════════════════════════════════════════════════════════
  // 5. LIBRARY SELECTION
  // ════════════════════════════════════════════════════════════════════════

  const toggleSelect = (item: MediaItem) => {
    if (mode === 'selector') {
      setSelectedLibraryUrls(prev => {
        const next = new Set(prev);
        if (next.has(item.file_url)) next.delete(item.file_url);
        else { if (!multiple) next.clear(); next.add(item.file_url); }
        return next;
      });
    } else {
      setSelectedIds(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredMedia.length) setSelectedIds([]);
    else setSelectedIds(filteredMedia.map(m => m.id));
  };

  const handleConfirmSelection = () => {
    if (selectedLibraryUrls.size === 0) { toast.warning('Please select at least one item.'); return; }
    if (onSelect) onSelect(Array.from(selectedLibraryUrls));
    if (onClose) onClose();
  };

  // ════════════════════════════════════════════════════════════════════════
  // 6. CLEANER SELECTION — USED SECTION
  // ════════════════════════════════════════════════════════════════════════

  const toggleCleanerUsed = (item: MediaItem) => {
    setCleanerUsedSelected(prev => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
      return next;
    });
  };

  const toggleSelectAllUsed = () => {
    if (cleanerUsedSelected.size === cleanerUsed.length) setCleanerUsedSelected(new Set());
    else setCleanerUsedSelected(new Set(cleanerUsed.map(m => m.id)));
  };

  // ════════════════════════════════════════════════════════════════════════
  // 7. CLEANER SELECTION — UNUSED SECTION
  // ════════════════════════════════════════════════════════════════════════

  const toggleCleanerUnused = (item: MediaItem) => {
    setCleanerUnusedSelected(prev => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
      return next;
    });
  };

  const toggleSelectAllUnused = () => {
    if (cleanerUnusedSelected.size === cleanerUnused.length) setCleanerUnusedSelected(new Set());
    else setCleanerUnusedSelected(new Set(cleanerUnused.map(m => m.id)));
  };

  // ─── Image Preview & Light Editor Helpers ──────────────────────────────
  const handleOpenPreview = (item: MediaItem) => {
    setPreviewItem(item);
    setShowEditor(false);
    resetEditor();
  };

  const resetEditor = () => {
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setBlur(0);
    setGrayscale(0);
    setSepia(0);
    setInvert(0);
  };

  const applyQuickFilter = (filterName: string) => {
    resetEditor();
    switch (filterName) {
      case 'grayscale':
        setGrayscale(100);
        break;
      case 'sepia':
        setSepia(100);
        break;
      case 'invert':
        setInvert(100);
        break;
      case 'vintage':
        setSepia(50);
        setContrast(120);
        setBrightness(95);
        break;
      case 'cool':
        setSaturation(85);
        setContrast(95);
        setBrightness(105);
        break;
      case 'cinematic':
        setContrast(140);
        setSaturation(110);
        setBrightness(90);
        break;
      case 'moody':
        setBrightness(85);
        setContrast(130);
        setSaturation(60);
        break;
      case 'warm':
        setSepia(20);
        setSaturation(120);
        break;
      default:
        break;
    }
  };

  const saveEditedImage = async (overwrite: boolean) => {
    if (!previewItem) return;
    setIsSavingEdits(true);
    
    try {
      const toastId = toast.loading(overwrite ? 'Saving changes in-place...' : 'Saving as new copy...');
      
      // Load image first
      const img = new Image();
      img.crossOrigin = 'anonymous'; // prevent tained canvas CORS errors
      img.src = previewItem.file_url;
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Failed to load image for editing. If it is hosted on a dynamic bucket, CORS headers might prevent editing.'));
      });
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      
      // Calculate new dimensions based on rotation
      const isRotated90or270 = rotation % 180 !== 0;
      const width = isRotated90or270 ? img.height : img.width;
      const height = isRotated90or270 ? img.width : img.height;
      
      canvas.width = width;
      canvas.height = height;
      
      // Apply filters to context
      const filterString = [
        `brightness(${brightness}%)`,
        `contrast(${contrast}%)`,
        `saturate(${saturation}%)`,
        `blur(${blur}px)`,
        `grayscale(${grayscale}%)`,
        `sepia(${sepia}%)`,
        `invert(${invert}%)`
      ].join(' ');
      
      ctx.filter = filterString;
      
      // Position center and transform
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      
      const scaleX = flipH ? -1 : 1;
      const scaleY = flipV ? -1 : 1;
      ctx.scale(scaleX, scaleY);
      
      // Draw centered
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      
      // Export to blob
      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('Failed to export edited image from canvas'));
        }, 'image/webp', 0.90);
      });
      
      const supabase = createClient();
      const timestamp = Date.now();
      const bucketName = previewItem.bucket || 'product-images';
      
      if (overwrite) {
        // Extract relative file path from URL
        const pathParts = previewItem.file_url.split(`/storage/v1/object/public/${bucketName}/`);
        const filePath = pathParts[1] ? decodeURIComponent(pathParts[1]) : previewItem.seo_filename;
        
        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, blob, {
            cacheControl: 'public, max-age=31536000',
            upsert: true
          });
          
        if (uploadError) throw uploadError;
        
        // Update database record for size
        const { error: dbError } = await supabase
          .from('media_library')
          .update({
            file_size: blob.size,
            updated_at: new Date().toISOString()
          })
          .eq('id', previewItem.id);
          
        if (dbError) throw dbError;
        
        toast.dismiss(toastId);
        toast.success('Image updated successfully in-place!');
        
        setPreviewItem(null);
        fetchMedia();
      } else {
        const baseName = previewItem.original_filename.replace(/\.[^/.]+$/, '');
        const cleanBaseName = baseName
          .replace(/[^a-zA-Z0-9-_\s]/g, '')
          .trim()
          .replace(/\s+/g, '-')
          .toLowerCase();
        const newFileName = `${cleanBaseName}-edited-${timestamp}.webp`;
        
        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(newFileName, blob, {
            cacheControl: 'public, max-age=31536000',
            upsert: false
          });
          
        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(newFileName);
          
        if (!publicUrlData?.publicUrl) throw new Error('Failed to get public URL');
        
        const { error: dbError } = await supabase
          .from('media_library')
          .insert({
            original_filename: `edited-${previewItem.original_filename}`,
            seo_filename: newFileName,
            file_url: publicUrlData.publicUrl,
            alt_text: `edited ${previewItem.alt_text}`,
            title: `edited ${previewItem.title}`,
            bucket: bucketName,
            ai_generated: false,
            ai_enabled: true,
            file_size: blob.size,
            mime_type: 'image/webp'
          });
          
        if (dbError) throw dbError;
        
        toast.dismiss(toastId);
        toast.success('Image saved as a new copy!');
        
        setPreviewItem(null);
        fetchMedia();
      }
    } catch (err: any) {
      console.error('[Image Editor] Failed to save edited image:', err);
      toast.error(`Failed to save image edits: ${err.message}`);
    } finally {
      setIsSavingEdits(false);
    }
  };

  // ════════════════════════════════════════════════════════════════════════
  // 8. ZIP DOWNLOAD
  // ════════════════════════════════════════════════════════════════════════

  const downloadAsZip = async (ids: Set<string>, zipName: string) => {
    if (ids.size === 0) { toast.warning('No files selected to download.'); return; }
    const items = media.filter(m => ids.has(m.id));
    if (items.length === 0) { toast.warning('Selected files not found.'); return; }

    try {
      setIsDownloadingZip(true);
      const toastId = toast.loading(`Preparing ZIP with ${items.length} file(s)...`);

      const zip = new JSZip();
      const folder = zip.folder(zipName) ?? zip;

      await Promise.all(items.map(async (item) => {
        try {
          const response = await fetch(item.file_url, { mode: 'cors' });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const blob = await response.blob();
          const filename = item.original_filename || item.file_url.split('/').pop() || item.id;
          folder.file(filename, blob);
        } catch (err) {
          console.warn(`[ZIP] Skipped ${item.original_filename}:`, err);
        }
      }));

      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${zipName}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Downloaded ${items.length} file(s) as ${zipName}.zip`, { id: toastId });
    } catch (err: any) {
      toast.error(`ZIP download failed: ${err.message}`);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  // ════════════════════════════════════════════════════════════════════════
  // 9. DELETE OPERATIONS
  // ════════════════════════════════════════════════════════════════════════

  const handleDelete = async (id: string, url: string) => {
    if (!confirm('Are you sure you want to move this media file to Trash?')) return;
    try {
      const supabase = createClient();
      const { error: dbError } = await supabase
        .from('media_library')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (dbError) throw dbError;

      toast.success('Media file moved to Trash');
      fetchMedia();
      loadUsageCrossReferences();
      setSelectedIds(prev => prev.filter(sid => sid !== id));
      setCleanerUnusedSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
      setCleanerUsedSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
    } catch (err: any) {
      logDbError({
        file: 'components/admin/MediaManager.tsx',
        functionName: 'handleDelete',
        table: 'media_library',
        action: 'UPDATE'
      }, err);
      toast.error(`Failed to move to Trash: ${err?.message || err}`);
    }
  };

  const handleBulkDeleteUnused = async () => {
    if (cleanerUnusedSelected.size === 0) { toast.warning('No unused files selected.'); return; }
    if (!confirm(`Move ${cleanerUnusedSelected.size} unused file(s) to Trash?`)) return;
    try {
      setIsBulkDeleting(true);
      const toastId = toast.loading(`Moving ${cleanerUnusedSelected.size} file(s) to Trash...`);
      const supabase = createClient();
      const idsToDelete = Array.from(cleanerUnusedSelected);
      const { error: dbError } = await supabase
        .from('media_library')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', idsToDelete);
      if (dbError) throw dbError;

      toast.success(`${idsToDelete.length} file(s) moved to Trash.`, { id: toastId });
      setCleanerUnusedSelected(new Set());
      fetchMedia();
      loadUsageCrossReferences();
    } catch (err: any) {
      logDbError({
        file: 'components/admin/MediaManager.tsx',
        functionName: 'handleBulkDeleteUnused',
        table: 'media_library',
        action: 'UPDATE'
      }, err);
      toast.error(`Bulk move to Trash failed: ${err?.message || err}`);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) { toast.warning('No files selected.'); return; }
    if (!confirm(`Move ${selectedIds.length} file(s) to Trash?`)) return;
    try {
      setIsBulkDeleting(true);
      const toastId = toast.loading(`Moving ${selectedIds.length} file(s) to Trash...`);
      const supabase = createClient();
      const { error: dbError } = await supabase
        .from('media_library')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', selectedIds);
      if (dbError) throw dbError;

      toast.success(`${selectedIds.length} file(s) moved to Trash.`, { id: toastId });
      setSelectedIds([]);
      fetchMedia();
      loadUsageCrossReferences();
    } catch (err: any) {
      logDbError({
        file: 'components/admin/MediaManager.tsx',
        functionName: 'handleBulkDelete',
        table: 'media_library',
        action: 'UPDATE'
      }, err);
      toast.error(`Bulk move to Trash failed: ${err?.message || err}`);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleCopyUrl = (url: string) => { navigator.clipboard.writeText(url); toast.success('Image URL copied'); };

  // ════════════════════════════════════════════════════════════════════════
  // 10. VISION AI
  // ════════════════════════════════════════════════════════════════════════

  const handleGlobalAiToggle = async () => {
    const nextVal = !globalAi;
    setGlobalAi(nextVal);
    try {
      const supabase = createClient();
      await supabase.from('ai_settings').update({ auto_media_ai: nextVal }).eq('id', '00000000-0000-4000-8000-000000000002');
      toast.success(`Auto vision tags ${nextVal ? 'enabled' : 'disabled'}`);
    } catch { toast.error('Failed to save settings'); }
  };

  const handleSingleGenerate = async (item: MediaItem) => {
    try {
      setGeneratingId(item.id);
      const response = await fetch('/api/media/ai-meta', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image_url: item.file_url, media_id: item.id }) });
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed to generate meta');
      toast.success(`AI alt tags written for: ${item.original_filename}`);
      fetchMedia();
    } catch (err: any) { toast.error(err.message || 'AI metadata write failed'); }
    finally { setGeneratingId(null); }
  };

  const handleBulkGenerate = async () => {
    if (!selectedIds.length) return;
    try {
      setBulkGenerating(true);
      const itemsToGen = media.filter(m => selectedIds.includes(m.id));
      const toastId = toast.loading(`Generating metadata for ${itemsToGen.length} files...`);
      for (const item of itemsToGen) {
        try {
          await fetch('/api/media/ai-meta', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image_url: item.file_url, media_id: item.id }) });
          await new Promise(res => setTimeout(res, 600));
        } catch (e) { console.warn('[Media Bulk Vision] Skipped:', item.original_filename, e); }
      }
      toast.success('Bulk vision metadata complete!', { id: toastId });
      setSelectedIds([]);
      fetchMedia();
    } catch { toast.error('Bulk vision process failed'); }
    finally { setBulkGenerating(false); }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.from('media_library').update({ 
        alt_text: editingItem.alt_text, 
        title: editingItem.title, 
        description: editingItem.description, 
        caption: editingItem.caption, 
        ai_enabled: editingItem.ai_enabled 
      }).eq('id', editingItem.id);
      
      if (error) throw error;
      toast.success('Image details updated successfully');
      setEditingItem(null);
      fetchMedia();
    } catch (err: any) {
      logDbError({
        file: 'components/admin/MediaManager.tsx',
        functionName: 'handleUpdateItem',
        table: 'media_library',
        action: 'UPDATE'
      }, err);
      toast.error(`Failed to update image details: ${err?.message || 'Unknown error'}`);
    }
  };

  // ════════════════════════════════════════════════════════════════════════
  // 11. HELPERS
  // ════════════════════════════════════════════════════════════════════════

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // ════════════════════════════════════════════════════════════════════════
  // 12. RENDER — MEDIA CARD (reused in library + cleaner)
  // ════════════════════════════════════════════════════════════════════════

  const renderMediaCard = (
    item: MediaItem,
    isSelected: boolean,
    onToggle: () => void,
    opts: { showCheckbox?: boolean; showBadge?: boolean; showActions?: boolean } = {}
  ) => {
    const { showCheckbox = true, showBadge = true, showActions = true } = opts;
    const isGenerating = generatingId === item.id;
    const isVideo = item.mime_type?.startsWith('video/') || item.file_url.match(/\.(mp4|mov|webm)$/i);

    return (
      <div
        key={item.id}
        onClick={() => {
          if (mode === 'library') {
            handleOpenPreview(item);
          } else {
            onToggle();
          }
        }}
        className={`group relative aspect-square rounded-2xl overflow-hidden border-2 cursor-pointer flex flex-col justify-end transition-all ${
          isSelected
            ? 'border-blue-600 shadow-md ring-2 ring-blue-500/20'
            : 'border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
        }`}
      >
        {/* Checkbox */}
        {showCheckbox && (
          mode === 'selector' ? (
            isSelected && (
              <div className="absolute inset-0 bg-blue-600/10 flex items-center justify-center z-10">
                <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
                  <Check className="h-3.5 w-3.5 text-white" />
                </div>
              </div>
            )
          ) : (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggle}
              onClick={e => e.stopPropagation()}
              className="absolute top-3 left-3 h-4 w-4 text-blue-600 rounded border-gray-300 cursor-pointer z-20 accent-blue-600"
            />
          )
        )}

        {/* Media */}
        {isVideo ? (
          <>
            <video src={item.file_url} className="absolute inset-0 w-full h-full object-cover z-0" muted playsInline loop
              onMouseOver={e => { try { e.currentTarget.play(); } catch {} }}
              onMouseOut={e => { try { e.currentTarget.pause(); e.currentTarget.currentTime = 0; } catch {} }}
            />
            <div className="absolute bottom-3 left-3 z-10 bg-black/60 px-1.5 py-0.5 rounded text-white text-[8px] font-bold tracking-wider">VIDEO</div>
            <div className="absolute inset-0 flex items-center justify-center bg-black/10">
              <div className="p-1 rounded-full bg-black/50 text-white"><Play className="h-4 w-4 fill-white" /></div>
            </div>
          </>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.file_url} alt={item.alt_text} className="absolute inset-0 w-full h-full object-cover z-0" />
        )}

        {/* AI Badge */}
        {showBadge && mode === 'library' && (
          <div className="absolute top-3 right-3 z-10">
            {item.ai_generated
              ? <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500 text-white shadow-sm"><CheckCircle2 className="w-2.5 h-2.5" />AI</span>
              : <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-gray-500/80 text-white shadow-sm">None</span>
            }
          </div>
        )}

        {/* Hover Actions */}
        {showActions && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3 z-10">
            <div className="flex justify-end gap-1.5">
              <button type="button" onClick={e => { e.stopPropagation(); handleOpenPreview(item); }} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer min-h-[32px]" title="Preview & Edit Image">
                <Eye className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={e => { e.stopPropagation(); handleCopyUrl(item.file_url); }} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer min-h-[32px]" title="Copy URL">
                <Copy className="w-3.5 h-3.5" />
              </button>
              {mode === 'library' && (
                <>
                  <button type="button" onClick={e => { e.stopPropagation(); setEditingItem(item); }} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer min-h-[32px]" title="Edit metadata">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={e => { e.stopPropagation(); handleDelete(item.id, item.file_url); }} className="p-1.5 rounded-lg bg-white/10 hover:bg-red-500/80 text-white transition-all cursor-pointer min-h-[32px]" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="text-[10px] text-white font-mono line-clamp-1 w-full bg-black/40 p-1 rounded flex justify-between">
                <span className="truncate mr-1">Alt: {item.alt_text || 'None'}</span>
                <span className="flex-shrink-0 text-gray-300">{formatBytes(item.file_size)}</span>
              </div>
              {mode === 'library' && !isVideo && (
                <button type="button" onClick={e => { e.stopPropagation(); handleSingleGenerate(item); }} disabled={isGenerating}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600 disabled:bg-gray-600 text-[10px] transition-all cursor-pointer">
                  {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 fill-current" />}
                  <span>Write Vision AI</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════════════
  // 13. RENDER — CLEANER TAB
  // ════════════════════════════════════════════════════════════════════════

  const renderCleanerTab = () => {
    const totalCleanerSelected = cleanerUsedSelected.size + cleanerUnusedSelected.size;

    return (
      <div className="space-y-6">

        {/* Stats Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Files', value: media.length, color: 'text-gray-700 dark:text-gray-200', bg: 'bg-gray-50 dark:bg-gray-800/60', border: 'border-gray-200 dark:border-gray-700' },
            { label: 'In Use', value: cleanerUsed.length, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800' },
            { label: 'Unused', value: cleanerUnused.length, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800' },
            { label: 'Unused Size', value: formatBytes(unusedBytes), color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' },
          ].map(stat => (
            <div key={stat.label} className={`${stat.bg} ${stat.border} border rounded-2xl p-3 sm:p-4 text-center`}>
              <div className={`text-xl sm:text-2xl font-black ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Cleaner Search + Type Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-[#16162a] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Search filenames..." value={cleanerSearch} onChange={e => setCleanerSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50/50 dark:bg-[#1a1a30] border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white min-h-[44px]"
            />
          </div>
          <div className="flex bg-gray-100 dark:bg-gray-800/60 p-1 rounded-xl w-full sm:w-auto min-h-[44px] items-center">
            {(['all', 'image', 'video'] as const).map(type => (
              <button key={type} type="button" onClick={() => setCleanerTypeFilter(type)}
                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${cleanerTypeFilter === type ? 'bg-white dark:bg-[#16162a] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
                {type === 'all' ? 'All Types' : type === 'image' ? 'Images' : 'Videos'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button type="button" onClick={() => loadUsageCrossReferences()} disabled={usageLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer min-h-[44px] transition-all disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${usageLoading ? 'animate-spin' : ''}`} />
              {usageLoading ? 'Scanning...' : 'Re-scan'}
            </button>
          </div>
        </div>

        {/* Global action bar (shown when anything selected) */}
        {totalCleanerSelected > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-blue-600/5 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-2xl">
            <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
              {totalCleanerSelected} file{totalCleanerSelected !== 1 ? 's' : ''} selected
              {cleanerUsedSelected.size > 0 && ` (${cleanerUsedSelected.size} used`}
              {cleanerUsedSelected.size > 0 && cleanerUnusedSelected.size > 0 && ' + '}
              {cleanerUnusedSelected.size > 0 && `${cleanerUsedSelected.size > 0 ? '' : '('}${cleanerUnusedSelected.size} unused`}
              {totalCleanerSelected > 0 && ')'}
            </span>
            <div className="flex flex-wrap gap-2">
              {cleanerUsedSelected.size > 0 && (
                <button type="button" onClick={() => downloadAsZip(cleanerUsedSelected, 'used-media')} disabled={isDownloadingZip}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all min-h-[36px] disabled:opacity-60">
                  {isDownloadingZip ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  Download Used ({cleanerUsedSelected.size})
                </button>
              )}
              {cleanerUnusedSelected.size > 0 && (
                <>
                  <button type="button" onClick={() => downloadAsZip(cleanerUnusedSelected, 'unused-media')} disabled={isDownloadingZip}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-all min-h-[36px] disabled:opacity-60">
                    {isDownloadingZip ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
                    Download Unused ({cleanerUnusedSelected.size})
                  </button>
                  <button type="button" onClick={handleBulkDeleteUnused} disabled={isBulkDeleting}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all min-h-[36px] disabled:opacity-60">
                    {isBulkDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Delete Unused ({cleanerUnusedSelected.size})
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── UNUSED SECTION ─────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#16162a] border border-red-100 dark:border-red-900/40 rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between gap-3 p-4 border-b border-red-100 dark:border-red-900/40 bg-red-50/40 dark:bg-red-900/10">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-black text-red-700 dark:text-red-400">
                  Unused Media
                  <span className="ml-2 text-xs font-bold bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">{cleanerUnused.length}</span>
                </h3>
                <p className="text-xs text-red-500/70 dark:text-red-400/60">Not referenced anywhere — safe to delete</p>
              </div>
            </div>
            {/* Select All for Unused */}
            <div className="flex items-center gap-2">
              {cleanerUnused.length > 0 && (
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors min-h-[36px]">
                  <input
                    type="checkbox"
                    checked={cleanerUnusedSelected.size === cleanerUnused.length && cleanerUnused.length > 0}
                    onChange={toggleSelectAllUnused}
                    onClick={e => e.stopPropagation()}
                    className="h-4 w-4 rounded accent-red-500 cursor-pointer"
                  />
                  {cleanerUnusedSelected.size === cleanerUnused.length && cleanerUnused.length > 0 ? 'Deselect All' : 'Select All'}
                </label>
              )}
            </div>
          </div>

          <div className="p-4">
            {usageLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="aspect-square bg-gray-100 dark:bg-gray-800/80 rounded-2xl animate-pulse" />)}
              </div>
            ) : cleanerUnused.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">No unused files found!</p>
                <p className="text-xs text-gray-400 mt-1">All your media is actively referenced.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {cleanerUnused.map(item =>
                  renderMediaCard(
                    item,
                    cleanerUnusedSelected.has(item.id),
                    () => toggleCleanerUnused(item),
                    { showCheckbox: true, showBadge: false, showActions: true }
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── USED SECTION ───────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#16162a] border border-emerald-100 dark:border-emerald-900/40 rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between gap-3 p-4 border-b border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-900/10">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-sm font-black text-emerald-700 dark:text-emerald-400">
                  In-Use Media
                  <span className="ml-2 text-xs font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">{cleanerUsed.length}</span>
                </h3>
                <p className="text-xs text-emerald-500/70 dark:text-emerald-400/60">Referenced in products, categories, settings, or homepage</p>
              </div>
            </div>
            {/* Select All for Used */}
            <div className="flex items-center gap-2">
              {cleanerUsed.length > 0 && (
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors min-h-[36px]">
                  <input
                    type="checkbox"
                    checked={cleanerUsedSelected.size === cleanerUsed.length && cleanerUsed.length > 0}
                    onChange={toggleSelectAllUsed}
                    onClick={e => e.stopPropagation()}
                    className="h-4 w-4 rounded accent-emerald-500 cursor-pointer"
                  />
                  {cleanerUsedSelected.size === cleanerUsed.length && cleanerUsed.length > 0 ? 'Deselect All' : 'Select All'}
                </label>
              )}
            </div>
          </div>

          <div className="p-4">
            {usageLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="aspect-square bg-gray-100 dark:bg-gray-800/80 rounded-2xl animate-pulse" />)}
              </div>
            ) : cleanerUsed.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <p className="text-sm">No files currently in use.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {cleanerUsed.map(item =>
                  renderMediaCard(
                    item,
                    cleanerUsedSelected.has(item.id),
                    () => toggleCleanerUsed(item),
                    { showCheckbox: true, showBadge: false, showActions: true }
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════════════
  // 14. MAIN RENDER
  // ════════════════════════════════════════════════════════════════════════

  return (
    <div className={`space-y-6 w-full ${mode === 'library' ? 'p-4 md:p-6 max-w-7xl mx-auto' : 'p-6 overflow-y-auto flex-1'}`}>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      {mode === 'library' && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Media Library</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Upload files, manage metadata, and clean up unused media.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {selectedIds.length > 0 && mainTab === 'library' && (
              <>
                <button type="button" onClick={handleBulkDelete} disabled={isBulkDeleting}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 active:scale-95 disabled:bg-gray-100 dark:disabled:bg-gray-800 text-xs transition-all cursor-pointer min-h-[44px] flex-1 sm:flex-none">
                  {isBulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  <span>Delete ({selectedIds.length})</span>
                </button>
                <button type="button" onClick={handleBulkGenerate} disabled={bulkGenerating}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 active:scale-95 disabled:bg-gray-100 dark:disabled:bg-gray-800 text-xs transition-all cursor-pointer min-h-[44px] flex-1 sm:flex-none">
                {bulkGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                <span>Bulk Vision AI ({selectedIds.length})</span>
              </button>
              </>
            )}
            {mainTab === 'library' && (
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold active:scale-95 disabled:bg-gray-100 text-xs transition-all cursor-pointer min-h-[44px] flex-1 sm:flex-none">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span>Upload Media</span>
              </button>
            )}
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple accept="image/*,video/*" className="hidden" />
          </div>
        </div>
      )}

      {/* ── MAIN TABS (Library mode only) ──────────────────────────────── */}
      {mode === 'library' && (
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800/60 p-1 rounded-2xl w-full sm:w-auto sm:inline-flex">
          <button type="button" onClick={() => setMainTab('library')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer min-h-[42px] ${mainTab === 'library' ? 'bg-white dark:bg-[#16162a] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
            <ImageIcon className="w-4 h-4" />
            Library
          </button>
          <button type="button" onClick={() => setMainTab('cleaner')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer min-h-[42px] ${mainTab === 'cleaner' ? 'bg-white dark:bg-[#16162a] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
            <Archive className="w-4 h-4" />
            Cleaner Pro
            {cleanerUnused.length > 0 && (
              <span className="ml-1 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none">
                {cleanerUnused.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* ── STORAGE BAR (always visible) ───────────────────────────────── */}
      <div className="bg-white dark:bg-[#16162a] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <span className="font-bold text-gray-700 dark:text-gray-300">Storage:</span>
          <span>{formatBytes(usedBytes)} used of 1 GB ({usedPercentage.toFixed(2)}%)</span>
          {mainTab === 'cleaner' && unusedBytes > 0 && (
            <span className="text-red-500 font-semibold">· {formatBytes(unusedBytes)} reclaimable</span>
          )}
        </div>
        <div className="w-full sm:max-w-xs bg-gray-200 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
          <div className="bg-[#e94560] h-full rounded-full transition-all duration-500" style={{ width: `${usedPercentage}%` }} />
        </div>
      </div>

      {/* ── LIBRARY TAB CONTROLS ───────────────────────────────────────── */}
      {(mode === 'library' && mainTab === 'library') || mode === 'selector' ? (
        <>
          {/* Vision AI + Select All bar */}
          {mode === 'library' && (
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-[#16162a] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <div className="flex items-center justify-between w-full md:w-auto p-2 bg-gray-50/50 dark:bg-gray-900/30 rounded-xl border border-gray-100 dark:border-gray-800 min-h-[50px] px-4">
                <div className="mr-8">
                  <span className="text-sm font-bold text-gray-950 dark:text-white">Auto Vision Tagging</span>
                  <span className="text-[10px] text-gray-400 block leading-none mt-0.5">Analyze and add alt tags automatically on upload.</span>
                </div>
                <input type="checkbox" checked={globalAi} onChange={handleGlobalAiToggle}
                  className="w-10 h-6 rounded-full bg-gray-200 checked:bg-blue-600 appearance-none cursor-pointer transition-all relative after:content-[''] after:absolute after:h-5 after:w-5 after:bg-white after:rounded-full after:top-[2px] after:left-[2px] checked:after:left-[18px] after:transition-all"
                />
              </div>
              <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                {(['all', 'generated', 'pending'] as const).map(status => (
                  <button type="button" key={status} onClick={() => setAiFilter(status)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border min-h-[38px] flex-1 md:flex-none capitalize transition-all cursor-pointer ${aiFilter === status ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white dark:bg-[#16162a] border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                    {status === 'all' ? 'All' : status === 'generated' ? 'AI Tagged' : 'Pending'}
                  </button>
                ))}
                <button type="button" onClick={toggleSelectAll}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 bg-white dark:bg-[#16162a] hover:bg-gray-50 dark:hover:bg-gray-800 min-h-[38px] cursor-pointer">
                  {selectedIds.length === filteredMedia.length && filteredMedia.length > 0 ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>
          )}

          {/* Search + Sort + Filters */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-[#16162a] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="text" placeholder="Search filenames..." value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50/50 dark:bg-[#1a1a30] border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white min-h-[44px]"
                />
              </div>
              <div className="flex bg-gray-100 dark:bg-gray-800/60 p-1 rounded-xl w-full sm:w-auto min-h-[44px] items-center">
                {(['all', 'image', 'video'] as const).map(type => (
                  <button key={type} type="button" onClick={() => setTypeFilter(type)}
                    className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${typeFilter === type ? 'bg-white dark:bg-[#16162a] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}>
                    {type === 'all' ? 'All Types' : type === 'image' ? 'Images' : 'Videos'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
              {mode === 'selector' && (
                <label className="flex items-center justify-center gap-2 px-4 py-2 bg-[#1a1a2e] hover:bg-[#2e2e4e] dark:bg-gray-800 dark:hover:bg-gray-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors w-full sm:w-auto min-h-[44px]">
                  <Upload className="h-4 w-4" />
                  {isUploading ? 'Uploading...' : 'Upload Media'}
                  <input type="file" multiple={multiple} accept="image/*,video/*" onChange={handleFileUpload} className="hidden" />
                </label>
              )}
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <span className="font-bold text-gray-500 dark:text-gray-400 text-xs">Date:</span>
                <select value={dateFilter} onChange={e => setDateFilter(e.target.value as any)}
                  className="w-full sm:w-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#16162a] px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-gray-700 dark:text-gray-300 min-h-[44px] cursor-pointer">
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="last_7">Last 7 Days</option>
                  <option value="last_30">Last 30 Days</option>
                </select>
              </div>
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <SlidersHorizontal className="h-4 w-4 text-gray-400 hidden sm:block" />
                <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
                  className="w-full sm:w-44 px-3.5 py-2 text-sm bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500 min-h-[44px] cursor-pointer">
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="size-desc">Size: Big to Small</option>
                  <option value="size-asc">Size: Small to Big</option>
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none text-gray-700 dark:text-gray-300 text-xs font-bold border border-gray-200 dark:border-gray-800 rounded-xl p-2 bg-white dark:bg-[#16162a] min-h-[44px]">
                <input type="checkbox" checked={onlyUnused} onChange={e => setOnlyUnused(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-700 text-[#e94560] focus:ring-[#e94560] h-4 w-4"
                />
                <span>Unused Only</span>
              </label>
            </div>
          </div>

          {/* Upload Queue */}
          {uploadTasks.some(t => t.status !== 'completed' && t.status !== 'cancelled') && (
            <div className="bg-gray-50/40 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 p-4 rounded-2xl space-y-3">
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Upload Queue</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {uploadTasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').map(t => {
                  const taskIsVideo = t.file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v|avi|mkv|ogv)$/i.test(t.file.name);
                  return (
                    <div key={t.id} className="relative aspect-square rounded-xl overflow-hidden border border-dashed border-gray-200 dark:border-gray-800 bg-white dark:bg-[#16162a] flex flex-col items-center justify-center p-3 text-center">
                      <div className="text-gray-400 dark:text-gray-600 mb-1.5">
                        {taskIsVideo ? <Play className="h-6 w-6" /> : <ImageIcon className="h-6 w-6" />}
                      </div>
                      <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 truncate max-w-full mb-1">{t.file.name}</span>
                      {t.status === 'uploading' ? (
                        <div className="w-full flex flex-col items-center gap-1">
                          <div className="w-full bg-gray-200 dark:bg-gray-800 h-1 rounded-full overflow-hidden">
                            <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${t.progress}%` }} />
                          </div>
                          <span className="text-[8px] font-bold text-gray-500">{t.progress}%</span>
                          <button type="button" onClick={() => handleCancelUpload(t.id)} className="text-[8px] font-bold text-red-500 hover:underline cursor-pointer">Cancel</button>
                        </div>
                      ) : t.status === 'failed' ? (
                        <div className="w-full flex flex-col items-center gap-1">
                          <span className="text-[8px] font-bold text-red-500 truncate w-full" title={t.error}>{t.error || 'Failed'}</span>
                          <div className="flex gap-1.5">
                            <button type="button" onClick={() => handleRetryUpload(t.id)} className="px-1.5 py-0.5 rounded bg-blue-600 text-white text-[8px] font-bold cursor-pointer">Retry</button>
                            <button type="button" onClick={() => handleCancelUpload(t.id)} className="text-[8px] font-bold text-gray-400 cursor-pointer">Dismiss</button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Media Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => <div key={i} className="aspect-square bg-gray-100 dark:bg-gray-800/80 rounded-2xl animate-pulse" />)}
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="text-center py-16 text-gray-400 bg-white dark:bg-[#16162a] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm">
              No media files found matching the search criteria.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {paginatedMedia.map(item =>
                renderMediaCard(
                  item,
                  mode === 'selector' ? selectedLibraryUrls.has(item.file_url) : selectedIds.includes(item.id),
                  () => toggleSelect(item)
                )
              )}
            </div>
          )}

          {/* Pagination Controls */}
          {filteredMedia.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-[#16162a] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs mt-4 text-xs font-bold text-gray-700 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <span>Show per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-gray-250 dark:border-gray-800 bg-white dark:bg-[#16162a] px-2.5 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
              </div>

              {filteredMedia.length > pageSize && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="px-2">
                    Page {currentPage} of {Math.ceil(filteredMedia.length / pageSize)}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= Math.ceil(filteredMedia.length / pageSize)}
                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredMedia.length / pageSize), prev + 1))}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}

              <div className="text-gray-500 dark:text-gray-400 font-medium">
                Showing {Math.min(filteredMedia.length, (currentPage - 1) * pageSize + 1)}-{Math.min(filteredMedia.length, currentPage * pageSize)} of {filteredMedia.length} files
              </div>
            </div>
          )}

          {/* Selector Footer */}
          {mode === 'selector' && (
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 bg-gray-50/30 dark:bg-gray-900/10 rounded-b-2xl">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Cancel</button>
              <button type="button" onClick={handleConfirmSelection} disabled={selectedLibraryUrls.size === 0}
                className="px-5 py-2 rounded-xl text-sm font-bold bg-[#1a1a2e] dark:bg-[#e94560] hover:bg-[#2e2e4e] dark:hover:bg-[#d8344e] text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                Add Selected ({selectedLibraryUrls.size})
              </button>
            </div>
          )}
        </>
      ) : null}

      {/* ── CLEANER TAB ─────────────────────────────────────────────────── */}
      {mode === 'library' && mainTab === 'cleaner' && renderCleanerTab()}

      {/* ── EDIT METADATA MODAL ──────────────────────────────────────────── */}
      {mode === 'library' && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white dark:bg-[#16162a] rounded-2xl max-w-md w-full border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden will-change-transform">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-gray-900 dark:text-white">Edit Image Metadata</h3>
              <button type="button" onClick={() => setEditingItem(null)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer min-h-[36px]"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleUpdateItem} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Alt Text Tag</label>
                <input type="text" value={editingItem.alt_text} onChange={e => setEditingItem(prev => prev ? { ...prev, alt_text: e.target.value } : null)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a30] text-gray-900 dark:text-white text-sm focus:border-blue-500 focus:outline-none min-h-[44px]" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Title Tag</label>
                <input type="text" value={editingItem.title} onChange={e => setEditingItem(prev => prev ? { ...prev, title: e.target.value } : null)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a30] text-gray-900 dark:text-white text-sm focus:border-blue-500 focus:outline-none min-h-[44px]" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Long Description</label>
                <textarea value={editingItem.description} onChange={e => setEditingItem(prev => prev ? { ...prev, description: e.target.value } : null)} rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a30] text-gray-900 dark:text-white text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Short Caption</label>
                <input type="text" value={editingItem.caption} onChange={e => setEditingItem(prev => prev ? { ...prev, caption: e.target.value } : null)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a30] text-gray-900 dark:text-white text-sm focus:border-blue-500 focus:outline-none min-h-[44px]" />
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-50/50 dark:bg-gray-900/30 rounded-xl border border-gray-100 dark:border-gray-800">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Enable Vision AI Updates</span>
                <input type="checkbox" checked={editingItem.ai_enabled} onChange={e => setEditingItem(prev => prev ? { ...prev, ai_enabled: e.target.checked } : null)}
                  className="w-10 h-6 rounded-full bg-gray-200 checked:bg-blue-600 appearance-none cursor-pointer transition-all relative after:content-[''] after:absolute after:h-5 after:w-5 after:bg-white after:rounded-full after:top-[2px] after:left-[2px] checked:after:left-[18px] after:transition-all" />
              </div>
              <div className="pt-4 flex justify-end gap-2 border-t border-gray-100 dark:border-gray-800">
                <button type="button" onClick={() => setEditingItem(null)} className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold text-xs cursor-pointer min-h-[38px]">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs cursor-pointer min-h-[38px] active:scale-95">Save Details</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── IMAGE PREVIEW & LIGHT IMAGE EDITOR MODAL ───────────────────────── */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#16162a] rounded-3xl max-w-5xl w-full border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] md:max-h-[85vh] will-change-transform">
            
            {/* Left/Center: Image Viewport */}
            <div className="flex-1 bg-gray-950 flex items-center justify-center p-6 relative overflow-hidden group select-none min-h-[300px]">
              {previewItem.mime_type?.startsWith('video/') ? (
                <video src={previewItem.file_url} className="max-w-full max-h-[60vh] object-contain" controls autoPlay playsInline />
              ) : (
                <div className="relative overflow-hidden flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewItem.file_url}
                    alt={previewItem.alt_text}
                    style={{
                      transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                      filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px) grayscale(${grayscale}%) sepia(${sepia}%) invert(${invert}%)`,
                      transition: 'transform 0.2s ease, filter 0.1s ease'
                    }}
                    className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
                  />
                </div>
              )}

              {/* Top Bar for close/exit */}
              <div className="absolute top-4 left-4 z-10 flex gap-2">
                <span className="text-[10px] font-mono text-gray-400 bg-black/45 px-2.5 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm">
                  {previewItem.mime_type?.split('/')[1] || 'media'} • {formatBytes(previewItem.file_size)}
                </span>
              </div>
            </div>

            {/* Right Side: Control Panel / Editor Option Panels */}
            <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-800 flex flex-col max-h-[50vh] md:max-h-full bg-white dark:bg-[#16162a]">
              
              {/* Header */}
              <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
                <div>
                  <h3 className="font-black text-sm text-gray-900 dark:text-white uppercase tracking-wider">
                    {showEditor ? 'Edit Image' : 'Media Preview'}
                  </h3>
                  <p className="text-[10px] text-gray-500 truncate max-w-[180px]">{previewItem.original_filename}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="p-1 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer min-h-[36px]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tab Navigation / Details Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Mode Selector */}
                {!previewItem.mime_type?.startsWith('video/') && (
                  <div className="flex bg-gray-100 dark:bg-gray-800/60 p-1 rounded-xl shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowEditor(false)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${!showEditor ? 'bg-white dark:bg-[#16162a] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500'}`}
                    >
                      Details & Info
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEditor(true)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${showEditor ? 'bg-white dark:bg-[#16162a] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500'}`}
                    >
                      <Sliders className="inline w-3 h-3 mr-1" />
                      Adjust & Filters
                    </button>
                  </div>
                )}

                {!showEditor ? (
                  /* Info & Details Tab */
                  <div className="space-y-4">
                    <div className="p-3 bg-gray-50/50 dark:bg-gray-900/30 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-2 text-xs">
                      <div className="flex justify-between"><span className="text-gray-500 font-medium">Filename:</span><span className="font-mono text-gray-900 dark:text-white truncate max-w-[150px]" title={previewItem.original_filename}>{previewItem.original_filename}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500 font-medium">SEO Name:</span><span className="font-mono text-gray-900 dark:text-white truncate max-w-[150px]" title={previewItem.seo_filename}>{previewItem.seo_filename}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500 font-medium">Uploaded:</span><span className="text-gray-900 dark:text-white">{new Date(previewItem.created_at).toLocaleDateString()}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500 font-medium">Size:</span><span className="text-gray-900 dark:text-white font-mono">{formatBytes(previewItem.file_size)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500 font-medium">Mime Type:</span><span className="text-gray-900 dark:text-white">{previewItem.mime_type || 'image/webp'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500 font-medium">Usage:</span>
                        {isMediaUsed(previewItem) ? (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">In Use</span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400">Unused</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <button
                        type="button"
                        onClick={() => { handleCopyUrl(previewItem.file_url); }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 font-bold text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition-all cursor-pointer min-h-[44px]"
                      >
                        <Copy className="w-4 h-4" />
                        Copy Image URL
                      </button>
                      
                      {mode === 'library' && (
                        <button
                          type="button"
                          onClick={() => { setPreviewItem(null); setEditingItem(previewItem); }}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 font-bold text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition-all cursor-pointer min-h-[44px]"
                        >
                          <Edit className="w-4 h-4" />
                          Edit ALT & Description Tags
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Image Editor Tab */
                  <div className="space-y-5 text-xs">
                    {/* Transformations */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[10px]">Transform</h4>
                      <div className="grid grid-cols-4 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setRotation(r => (r + 90) % 360)}
                          className="flex flex-col items-center justify-center p-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl cursor-pointer"
                          title="Rotate 90° Clockwise"
                        >
                          <RotateCw className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                          <span className="text-[8px] mt-1 text-gray-500">Rotate</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFlipH(f => !f)}
                          className={`flex flex-col items-center justify-center p-2 rounded-xl cursor-pointer ${flipH ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 border border-blue-200 dark:border-blue-800' : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                          title="Flip Horizontal"
                        >
                          <FlipHorizontal className="w-4 h-4" />
                          <span className="text-[8px] mt-1 text-gray-500">Flip H</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFlipV(f => !f)}
                          className={`flex flex-col items-center justify-center p-2 rounded-xl cursor-pointer ${flipV ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 border border-blue-200 dark:border-blue-800' : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                          title="Flip Vertical"
                        >
                          <FlipVertical className="w-4 h-4" />
                          <span className="text-[8px] mt-1 text-gray-500">Flip V</span>
                        </button>
                        <button
                          type="button"
                          onClick={resetEditor}
                          className="flex flex-col items-center justify-center p-2 bg-gray-50 dark:bg-gray-800 hover:bg-red-500/10 hover:text-red-500 rounded-xl cursor-pointer"
                          title="Reset All Adjustments"
                        >
                          <Undo className="w-4 h-4" />
                          <span className="text-[8px] mt-1 text-gray-500">Reset</span>
                        </button>
                      </div>
                    </div>

                    {/* Quick Filters */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[10px]">Quick Filters</h4>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { name: 'None', key: 'none' },
                          { name: 'B&W', key: 'grayscale' },
                          { name: 'Sepia', key: 'sepia' },
                          { name: 'Invert', key: 'invert' },
                          { name: 'Vintage', key: 'vintage' },
                          { name: 'Cool Tint', key: 'cool' },
                          { name: 'Moody', key: 'moody' },
                          { name: 'Warm Sun', key: 'warm' },
                          { name: 'Cinema', key: 'cinematic' },
                        ].map(f => (
                          <button
                            key={f.key}
                            type="button"
                            onClick={() => applyQuickFilter(f.key)}
                            className="py-1 px-2 bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 rounded-lg text-[10px] font-medium transition-all text-center cursor-pointer truncate"
                          >
                            {f.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Manual Adjustments Sliders */}
                    <div className="space-y-3">
                      <h4 className="font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[10px]">Manual Adjustments</h4>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between font-semibold">
                          <span className="text-gray-600 dark:text-gray-400">Brightness</span>
                          <span className="text-blue-600 dark:text-blue-400">{brightness}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="200"
                          value={brightness}
                          onChange={e => setBrightness(Number(e.target.value))}
                          className="w-full accent-blue-600 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between font-semibold">
                          <span className="text-gray-600 dark:text-gray-400">Contrast</span>
                          <span className="text-blue-600 dark:text-blue-400">{contrast}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="200"
                          value={contrast}
                          onChange={e => setContrast(Number(e.target.value))}
                          className="w-full accent-blue-600 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between font-semibold">
                          <span className="text-gray-600 dark:text-gray-400">Saturation</span>
                          <span className="text-blue-600 dark:text-blue-400">{saturation}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="200"
                          value={saturation}
                          onChange={e => setSaturation(Number(e.target.value))}
                          className="w-full accent-blue-600 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between font-semibold">
                          <span className="text-gray-600 dark:text-gray-400">Blur</span>
                          <span className="text-blue-600 dark:text-blue-400">{blur}px</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          step="0.5"
                          value={blur}
                          onChange={e => setBlur(Number(e.target.value))}
                          className="w-full accent-blue-600 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Editor Footer / Save Operations */}
              <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/10 shrink-0 space-y-2">
                {showEditor ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => saveEditedImage(true)}
                      disabled={isSavingEdits}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] cursor-pointer min-h-[44px] transition-all disabled:opacity-50 active:scale-95"
                    >
                      {isSavingEdits ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Save In-place
                    </button>
                    <button
                      type="button"
                      onClick={() => saveEditedImage(false)}
                      disabled={isSavingEdits}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 font-bold text-[11px] hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer min-h-[44px] transition-all disabled:opacity-50 active:scale-95"
                    >
                      {isSavingEdits ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      Save As Copy
                    </button>
                  </div>
                ) : (
                  mode === 'selector' && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLibraryUrls(prev => {
                          const next = new Set(prev);
                          if (!multiple) next.clear();
                          next.add(previewItem.file_url);
                          return next;
                        });
                        setPreviewItem(null);
                        toast.success('Image selected!');
                      }}
                      className="w-full py-2.5 rounded-xl bg-[#1a1a2e] dark:bg-[#e94560] hover:bg-[#2e2e4e] dark:hover:bg-[#d8344e] text-white font-bold text-xs shadow-md transition-all cursor-pointer min-h-[44px]"
                    >
                      Select This Image
                    </button>
                  )
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── WEBM WARNING MODAL ───────────────────────────────────────────── */}
      {pendingVideoUpload && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 animate-fade-in">
          <div className="bg-white dark:bg-[#16162a] rounded-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-800 shadow-2xl space-y-4 will-change-transform">
            <div className="flex items-center gap-3 text-amber-500">
              <div className="p-2 rounded-lg bg-amber-500/10"><Play className="h-6 w-6 text-amber-500" /></div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white">WebM Format Recommended</h3>
            </div>
            <div className="space-y-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
              <p>We recommend converting <strong className="text-gray-900 dark:text-white">{pendingVideoUpload.file.name.split('.').pop()?.toUpperCase()}</strong> to <strong className="text-[#e94560]">WebM format</strong> before uploading for best performance.</p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button type="button" onClick={() => { window.open('https://www.google.com/search?q=video+to+webm+converter', '_blank'); handleCancelUpload(pendingVideoUpload.task.id); setPendingVideoUpload(null); }}
                className="w-full py-2.5 bg-[#e94560] hover:bg-[#d8344e] text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer">Convert to WebM (Recommended)</button>
              <button type="button" onClick={() => { executeActualUpload(pendingVideoUpload.task.id, pendingVideoUpload.file); setPendingVideoUpload(null); }}
                className="w-full py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#16162a] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-bold text-xs rounded-xl transition-colors cursor-pointer">Upload Original Anyway</button>
              <button type="button" onClick={() => { handleCancelUpload(pendingVideoUpload.task.id); setPendingVideoUpload(null); }}
                className="w-full py-2 text-gray-400 hover:text-gray-500 font-bold text-xs text-center transition-colors cursor-pointer">Cancel Upload</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
