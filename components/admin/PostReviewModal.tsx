'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Image, Plus, Package, Send, Check, Search } from '@/components/common/Icons';
import { submitAdminCustomReview } from '@/lib/services/reviews';
import { submitSocialProof, updateSocialProof } from '@/lib/services/socialProof';
import { getAllProductsAdmin } from '@/lib/services/products';
import { SocialProof, Product } from '@/lib/types';
import MediaSelectorModal from './MediaSelectorModal';
import { toast } from 'sonner';
import StarRating from '@/components/store/StarRating';

interface PostReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editProof?: SocialProof | null;
}

export default function PostReviewModal({ isOpen, onClose, onSuccess, editProof }: PostReviewModalProps) {
  const [mounted, setMounted] = useState(false);
  const [postType, setPostType] = useState<'review' | 'social_proof'>('social_proof');
  const [products, setProducts] = useState<Product[]>([]);
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Review fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [screenshotUrl, setScreenshotUrl] = useState('');

  // Social proof fields
  const [proofImageUrl, setProofImageUrl] = useState('');
  const [proofCaption, setProofCaption] = useState('');
  const [proofSourceType, setProofSourceType] = useState<'whatsapp' | 'instagram' | 'facebook' | 'manual'>('whatsapp');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState('');

  const isEditing = !!editProof;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!isOpen) return;
    getAllProductsAdmin().then(setProducts).catch(() => {});
    if (editProof) {
      setPostType('social_proof');
      setProofImageUrl(editProof.imageUrl);
      setProofCaption(editProof.caption || '');
      setProofSourceType(editProof.sourceType);
      setSelectedProductIds(editProof.productIds || []);
    }
  }, [isOpen, editProof]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setRating(5);
    setComment('');
    setSelectedProductId('');
    setScreenshotUrl('');
    setProofImageUrl('');
    setProofCaption('');
    setProofSourceType('whatsapp');
    setSelectedProductIds([]);
  };

  const toggleProductId = (id: string) => {
    setSelectedProductIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      toast.error('Customer name is required');
      return;
    }
    try {
      setSubmitting(true);
      await submitAdminCustomReview({
        productId: selectedProductId || null,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        rating,
        comment: comment.trim() || undefined,
        screenshotUrl: screenshotUrl || undefined
      });
      toast.success('Custom review posted successfully');
      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      toast.error('Failed to post review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitSocialProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofImageUrl) {
      toast.error('Please select or upload an image');
      return;
    }
    try {
      setSubmitting(true);
      if (isEditing && editProof) {
        await updateSocialProof(editProof.id, {
          imageUrl: proofImageUrl,
          caption: proofCaption.trim() || undefined,
          sourceType: proofSourceType,
          productIds: selectedProductIds
        });
        toast.success('Social proof updated');
      } else {
        await submitSocialProof({
          imageUrl: proofImageUrl,
          caption: proofCaption.trim() || undefined,
          sourceType: proofSourceType,
          productIds: selectedProductIds
        });
        toast.success('Social proof posted successfully');
      }
      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      toast.error('Failed to post social proof');
    } finally {
      setSubmitting(false);
    }
  };

  const mediaSelectHandler = (urls: string[]) => {
    if (urls[0]) {
      if (postType === 'review') setScreenshotUrl(urls[0]);
      else setProofImageUrl(urls[0]);
    }
    setShowMediaSelector(false);
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-fade-in overscroll-contain" onClick={onClose}>
      <div className="bg-white dark:bg-[#16162a] rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white">
              {isEditing ? 'Edit Social Proof' : 'Post Customer Content'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {isEditing ? 'Update the social proof entry' : 'Create a review or share social proof'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-white transition-all cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Type Toggle (only when not editing) */}
        {!isEditing && (
          <div className="flex border-b border-gray-100 dark:border-gray-800 px-6 pt-3 gap-4">
            <button
              onClick={() => setPostType('review')}
              className={`pb-3 text-sm font-bold transition-all cursor-pointer border-b-2 ${postType === 'review' ? 'border-[#e94560] text-[#e94560]' : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
            >
              <Package className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
              Product Review
            </button>
            <button
              onClick={() => { setPostType('social_proof'); setSelectedProductIds([]); }}
              className={`pb-3 text-sm font-bold transition-all cursor-pointer border-b-2 ${postType === 'social_proof' ? 'border-[#e94560] text-[#e94560]' : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
            >
              <Image className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
              Social Proof Wall
            </button>
          </div>
        )}

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6">
          {postType === 'review' && !isEditing ? (
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Screenshot / Image (Optional)</label>
                {screenshotUrl ? (
                  <div className="relative w-full h-32 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 mb-2">
                    <img src={screenshotUrl} alt="Review screenshot" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setScreenshotUrl('')} className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 cursor-pointer text-xs">X</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setShowMediaSelector(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 text-sm font-medium hover:border-[#e94560] hover:text-[#e94560] transition-all cursor-pointer w-full justify-center">
                    <Plus className="w-4 h-4" />
                    Upload or Select Image
                  </button>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Attach to Product (Optional)</label>
                <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white focus:border-[#e94560] focus:outline-none transition-all">
                  <option value="">General Store Review (No Product)</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Customer Name <span className="text-red-500">*</span></label>
                  <input type="text" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Muhammad Shoaib" className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#e94560] focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">WhatsApp / Phone</label>
                  <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="e.g. 03284114551" className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#e94560] focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Email Address</label>
                  <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="e.g. customer@example.com" className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#e94560] focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Rating <span className="text-red-500">*</span></label>
                  <StarRating rating={rating} interactive={true} onChange={setRating} starSize={24} showText={false} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Review Comment</label>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write the customer's review..." rows={3} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#e94560] focus:outline-none transition-all resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer">Cancel</button>
                <button type="submit" disabled={submitting || !customerName.trim()} className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#1a1a2e] hover:bg-[#e94560] disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-bold transition-all cursor-pointer">
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Posting...' : 'Post Review'}</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmitSocialProof} className="space-y-4">
              {/* Privacy lockout notice */}
              <div className="bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-xl px-4 py-3 text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2">
                <Check className="w-4 h-4 flex-shrink-0" />
                Administrative Privacy Rule: Customer PII (Name, Phone, Email) is strictly excluded from this layer.
              </div>

              {/* Image */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Screenshot / Image Source <span className="text-red-500">*</span></label>
                {proofImageUrl ? (
                  <div className="relative w-full h-40 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 mb-2">
                    <img src={proofImageUrl} alt="Social proof" className="w-full h-full object-contain bg-gray-50 dark:bg-black/20" />
                    <button type="button" onClick={() => setProofImageUrl('')} className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 cursor-pointer text-xs">X</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setShowMediaSelector(true)} className="flex items-center gap-2 px-4 py-8 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 text-sm font-medium hover:border-[#e94560] hover:text-[#e94560] transition-all cursor-pointer w-full justify-center">
                    <Plus className="w-5 h-5" />
                    Upload or Select Image from Media Library
                  </button>
                )}
              </div>

              {/* Source Type */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Source Type</label>
                <select value={proofSourceType} onChange={(e) => setProofSourceType(e.target.value as any)} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white focus:border-[#e94560] focus:outline-none transition-all">
                  <option value="whatsapp">WhatsApp</option>
                  <option value="instagram">Instagram DM</option>
                  <option value="facebook">Facebook</option>
                  <option value="manual">Manual / Other</option>
                </select>
              </div>

              {/* Caption */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Caption (Optional)</label>
                <textarea value={proofCaption} onChange={(e) => setProofCaption(e.target.value)} placeholder="Add a caption or context for this social proof..." rows={2} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#e94560] focus:outline-none transition-all resize-none" />
              </div>

              {/* Multi-product tags with search */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Tag Multiple Products (Optional)</label>
                <p className="text-[10px] text-gray-400 mb-2">Search and select all products referenced in this conversation</p>
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-[#0f0f1b]/50 overflow-hidden">
                  <div className="relative border-b border-gray-200 dark:border-gray-700">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search products by name or SKU..."
                      className="w-full pl-9 pr-3 py-2.5 text-sm font-medium bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto p-2">
                    {products.length === 0 && (
                      <p className="text-xs text-gray-400 italic text-center py-4">No products found</p>
                    )}
                    {(() => {
                      const filtered = products.filter(p => !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()));
                      if (filtered.length === 0 && productSearch) {
                        return <p className="text-xs text-gray-400 italic text-center py-4">No products match &quot;{productSearch}&quot;</p>;
                      }
                      return filtered.map((p) => (
                        <label
                          key={p.id}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all text-sm font-medium ${
                            selectedProductIds.includes(p.id)
                              ? 'bg-[#e94560]/10 dark:bg-[#e94560]/20 text-[#e94560] dark:text-[#e94560] border border-[#e94560]/30'
                              : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 border border-transparent'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedProductIds.includes(p.id)}
                            onChange={() => toggleProductId(p.id)}
                            className="w-4 h-4 rounded border-gray-300 text-[#e94560] focus:ring-[#e94560] cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="truncate">{p.name}</div>
                          </div>
                        </label>
                      ));
                    })()}
                  </div>
                </div>
                {selectedProductIds.length > 0 && (
                  <p className="text-[10px] text-gray-400 mt-1.5">
                    {selectedProductIds.length} product{selectedProductIds.length !== 1 ? 's' : ''} tagged
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer">Cancel</button>
                <button type="submit" disabled={submitting || !proofImageUrl} className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#1a1a2e] hover:bg-[#e94560] disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-bold transition-all cursor-pointer">
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Saving...' : isEditing ? 'Update Proof' : 'Post to Wall'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {showMediaSelector && (
          <MediaSelectorModal
            isOpen={showMediaSelector}
            onClose={() => setShowMediaSelector(false)}
            onSelect={mediaSelectHandler}
            multiple={false}
          />
        )}
      </div>
    </div>,
    document.body
  );
}
