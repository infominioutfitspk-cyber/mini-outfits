'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Review } from '@/lib/types';
import StarRating from '@/components/store/StarRating';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { X, Check, EyeOff, Trash2, ExternalLink, Edit, Package, Phone, Mail } from '@/components/common/Icons';
import Link from 'next/link';
import { getClientSiteUrl } from '@/lib/site-url';
import { cleanWhatsAppPhone } from '@/lib/utils/whatsapp';

const FALLBACK_IMAGE = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%23f3f4f6'/%3E%3C/svg%3E";

interface ReviewDetailSheetProps {
  review: Review & { productName?: string; productImage?: string };
  onClose: () => void;
  onApprove: (id: string, approved: boolean) => void;
  onHide: (id: string, hidden: boolean) => void;
  onDelete: (id: string) => void;
  storeUrl?: string;
  storeName?: string;
}

export default function ReviewDetailSheet({ review, onClose, onApprove, onHide, onDelete, storeUrl, storeName }: ReviewDetailSheetProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehaviorY = 'contain';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
      document.documentElement.style.overscrollBehaviorY = '';
    };
  }, [onClose]);

  const formatDate = (dateStr: string) => {
    try { return formatDistanceToNow(parseISO(dateStr), { addSuffix: true }); }
    catch { return 'recently'; }
  };

  const siteUrl = storeUrl || getClientSiteUrl();
  const productSlug = review.productName?.toLowerCase().replace(/\s+/g, '-') || '';
  const productUrl = `${siteUrl}/product/${productSlug}`;

  const mailSubject = `Regarding Your Review on ${review.productName || 'Our Product'}`;
  const mailBody = [
    `Hi ${review.customerName},`,
    '',
    `Thank you for your feedback on '${review.productName || 'Our Product'}' (${productUrl}).`,
    '',
    review.comment ? `Your Review: '${review.comment}'` : '',
    '',
    'Best regards,',
    storeName || 'Zaynahs E-Store Team'
  ].filter(Boolean).join('%0D%0A');

  const mailtoHref = `mailto:${review.customerEmail}?subject=${encodeURIComponent(mailSubject)}&body=${mailBody}`;

  const reviewId = `#ZE-REV-${review.id.slice(0, 4).toUpperCase()}`;

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
      onClick={onClose}
      onTouchMove={(e) => { if (e.target === e.currentTarget) e.preventDefault(); }}
    >
      <div
        className="relative w-full sm:max-w-md bg-white dark:bg-[#16162a] rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden max-h-[92dvh] sm:max-h-[90dvh]"
        onClick={e => e.stopPropagation()}
        onWheel={handleWheel}
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Drag handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
        </div>

        {/* Scrollable body — isolated inertia scrolling */}
        <div className="overflow-y-auto overscroll-y-contain max-h-[calc(92dvh-40px)] sm:max-h-[calc(90dvh-40px)] p-5 space-y-5">
          {/* Header */}
          <div className="pr-6">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#e94560]">
              REVIEW PROFILE PANEL &mdash; {reviewId}
            </span>
          </div>

          {/* Product Item Overview — image + info side by side */}
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Product Item Overview</h3>
            <div className="flex gap-3 bg-gray-50 dark:bg-[#0f0f1b]/50 rounded-xl p-3 border border-gray-100 dark:border-gray-800/20">
              <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-gray-800">
                {review.productImage ? (
                  <Image src={review.productImage} alt={review.productName || 'Product'} fill className="object-cover" sizes="80px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Package className="w-8 h-8" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm font-bold text-gray-900 dark:text-white leading-snug truncate">
                  {review.productName || 'Unknown Product'}
                </p>
                <div className="flex items-center gap-1.5">
                  <StarRating rating={review.rating} showText={true} starSize={12} />
                  <span className="text-[10px] text-gray-400 font-medium">{formatDate(review.createdAt)}</span>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full ${
                  !review.approved
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                    : review.hidden
                    ? 'bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-400'
                    : 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400'
                }`}>
                  {!review.approved ? 'Pending' : review.hidden ? 'Hidden' : 'Approved'}
                </span>
                {review.productName && (
                  <div className="flex gap-2 text-[10px] pt-0.5">
                    <Link
                      href={`/product/${productSlug}`}
                      target="_blank"
                      className="flex items-center gap-0.5 text-[#e94560] hover:underline"
                    >
                      <ExternalLink className="w-2.5 h-2.5" />
                      View Storefront
                    </Link>
                    <Link
                      href={`/admin/products?id=${review.productId}`}
                      className="flex items-center gap-0.5 text-[#e94560] hover:underline"
                    >
                      <Edit className="w-2.5 h-2.5" />
                      Edit Config
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Customer Account Intel */}
          <section className="space-y-2">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Customer Account Intel (Admin Privacy Lookup)</h3>
            <div className="bg-gray-50 dark:bg-[#0f0f1b]/50 rounded-xl p-3 space-y-1.5 border border-gray-100 dark:border-gray-800/20 text-sm">
              <p className="text-gray-900 dark:text-white">
                <span className="text-gray-400 font-medium">&bull; Name:</span> {review.customerName}
              </p>
              {review.customerPhone && (
                <p className="text-gray-900 dark:text-white flex items-center gap-1.5">
                  <span className="text-gray-400 font-medium">&bull; WhatsApp:</span>
                   <a
                    href={`https://wa.me/${cleanWhatsAppPhone(review.customerPhone)}?text=${encodeURIComponent(`Hi ${review.customerName},%0D%0A%0D%0AThank you for your review on ${review.productName || 'our product'}.%0D%0A%0D%0A${review.comment ? `Your feedback: '${review.comment}'%0D%0A%0D%0A` : ''}Best regards,%0D%0A${storeName || 'Zaynahs E-Store Team'}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#10b981] hover:underline font-semibold flex items-center gap-1"
                  >
                    <Phone className="w-3 h-3" />
                    {review.customerPhone}
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </p>
              )}
              {review.customerEmail && (
                <p className="text-gray-900 dark:text-white flex items-center gap-1.5">
                  <span className="text-gray-400 font-medium">&bull; Email:</span>
                  <a
                    href={mailtoHref}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#e94560] hover:underline font-semibold flex items-center gap-1 break-all"
                  >
                    <Mail className="w-3 h-3 flex-shrink-0" />
                    {review.customerEmail}
                    <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                  </a>
                </p>
              )}
              {!review.customerPhone && !review.customerEmail && (
                <p className="text-gray-400 italic">No contact details provided</p>
              )}
            </div>
          </section>

          {/* Full User Submitted Feedback */}
          <section className="space-y-2">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Full User Submitted Feedback</h3>
            <div className="bg-gray-50 dark:bg-[#0f0f1b]/50 rounded-xl p-4 border border-gray-100 dark:border-gray-800/20">
              {review.comment ? (
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  &ldquo;{review.comment}&rdquo;
                </p>
              ) : (
                <p className="text-sm text-gray-400 italic">No written review provided</p>
              )}
            </div>
          </section>

          {/* Moderation Flow Actions */}
          <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100 dark:border-gray-800 sticky bottom-0 bg-white dark:bg-[#16162a] pb-1">
            <button
              onClick={() => { onApprove(review.id, !review.approved); onClose(); }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                review.approved
                  ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white dark:hover:bg-red-500'
                  : 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-600 hover:text-white dark:hover:bg-green-500'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{review.approved ? 'Unapprove Entry' : 'Approve Entry'}</span>
            </button>
            <button
              onClick={() => { onHide(review.id, !(review.hidden ?? false)); onClose(); }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                review.hidden
                  ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-600 hover:text-white dark:hover:bg-green-500'
                  : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-600 hover:text-white dark:hover:bg-amber-500'
              }`}
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>{review.hidden ? 'Show Feed' : 'Hide Feed'}</span>
            </button>
            <button
              onClick={() => { if (confirm('Are you sure you want to move this review to Trash?')) { onDelete(review.id); onClose(); } }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white dark:hover:bg-red-500 text-xs font-bold transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Dump to Trash</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
