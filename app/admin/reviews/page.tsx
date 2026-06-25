'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { getAllReviews, approveReview, deleteReview, hideShowReview } from '@/lib/services/reviews';
import { getAllSocialProofs, deleteSocialProof, restoreSocialProof } from '@/lib/services/socialProof';
import { Review, SocialProof } from '@/lib/types';
import StarRating from '@/components/store/StarRating';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Check, Trash2, MessageSquare, Eye, EyeOff, Plus, Image, Edit } from '@/components/common/Icons';
import { toast } from 'sonner';
import { useAdminTab } from '@/lib/hooks/useAdminTab';
import { getClientSiteUrl } from '@/lib/site-url';
import ReviewDetailSheet from '@/components/admin/ReviewDetailSheet';
import PostReviewModal from '@/components/admin/PostReviewModal';

type ReviewWithProduct = Review & { productName?: string; productImage?: string; productSlug?: string };

function AdminReviewsPageInner() {
  const [reviews, setReviews] = useState<ReviewWithProduct[]>([]);
  const [socialProofs, setSocialProofs] = useState<SocialProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useAdminTab<'all' | 'pending' | 'approved' | 'custom'>('all');
  const [selectedReview, setSelectedReview] = useState<ReviewWithProduct | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [editProof, setEditProof] = useState<SocialProof | null>(null);

  const handleOpenReview = (review: ReviewWithProduct) => setSelectedReview(review);

  const refreshReviews = async () => {
    try {
      setLoading(true);
      const [data, proofs] = await Promise.all([
        getAllReviews(),
        getAllSocialProofs()
      ]);
      setReviews(data);
      setSocialProofs(proofs);
    } catch (err) {
      console.error('Failed to load data:', err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [data, proofs] = await Promise.all([
          getAllReviews(),
          getAllSocialProofs()
        ]);
        if (active) {
          setReviews(data);
          setSocialProofs(proofs);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
        if (active) {
          toast.error('Failed to load data');
          setLoading(false);
        }
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const handleToggleApprove = async (id: string, currentApproved: boolean) => {
    try {
      await approveReview(id, !currentApproved);
      toast.success(!currentApproved ? 'Review approved' : 'Review unapproved');
      refreshReviews();
    } catch (err) {
      toast.error('Failed to update review');
    }
  };

  const handleToggleHide = async (id: string, currentHidden: boolean) => {
    try {
      await hideShowReview(id, !currentHidden);
      toast.success(!currentHidden ? 'Review hidden' : 'Review visible');
      refreshReviews();
    } catch (err) {
      toast.error('Failed to toggle review');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Move this review to Trash?')) return;
    try {
      await deleteReview(id);
      toast.success('Review moved to Trash');
      refreshReviews();
    } catch (err) {
      toast.error('Failed to delete review');
    }
  };

  const handleDeleteProof = async (id: string) => {
    if (!confirm('Delete this social proof entry?')) return;
    try {
      await deleteSocialProof(id);
      toast.success('Social proof deleted');
      refreshReviews();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const filteredReviews = reviews.filter(review => {
    if (activeTab === 'pending') return !review.approved;
    if (activeTab === 'approved') return review.approved;
    if (activeTab === 'custom') return false;
    return true;
  });

  const formatDate = (dateStr: string) => {
    try { return formatDistanceToNow(parseISO(dateStr), { addSuffix: true }); }
    catch { return 'recently'; }
  };

  const countByTab = (tab: string) => {
    if (tab === 'custom') return socialProofs.length;
    return reviews.filter(r => {
      if (tab === 'pending') return !r.approved;
      if (tab === 'approved') return r.approved;
      return true;
    }).length;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Product Reviews</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Moderate customer ratings, feedback & social proof</p>
        </div>
        <button
          onClick={() => { setEditProof(null); setShowPostModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1a1a2e] hover:bg-[#e94560] text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Post Customer Content
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 gap-1.5 overflow-x-auto">
        {(['all', 'pending', 'approved', 'custom'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === tab
                ? 'border-[#e94560] text-[#e94560]'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab === 'custom' ? (
              <>
                <Image className="w-3.5 h-3.5" />
                Custom Posts
              </>
            ) : (
              tab.charAt(0).toUpperCase() + tab.slice(1)
            )}
            <span className="text-xs bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
              {countByTab(tab)}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : activeTab === 'custom' ? (
        /* ── Custom Posts (Social Proof) Tab ── */
        socialProofs.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center space-y-3">
            <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-full text-gray-400">
              <Image className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">No custom posts yet</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Upload WhatsApp screenshots or social proof using the &quot;Post Customer Content&quot; button.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {socialProofs.map((proof) => (
              <div
                key={proof.id}
                className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="relative w-full aspect-[4/3] bg-gray-100 dark:bg-gray-800">
                  <img src={proof.imageUrl} alt={proof.caption || 'Social proof'} className="w-full h-full object-contain" />
                </div>
                <div className="p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      {proof.sourceType}
                    </span>
                    <span className="text-[10px] text-gray-400">{formatDate(proof.createdAt)}</span>
                  </div>
                  {proof.caption && (
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-2">{proof.caption}</p>
                  )}
                  {proof.linkedProducts && proof.linkedProducts.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {proof.linkedProducts.map((p) => (
                        <span key={p.id} className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 truncate max-w-[140px]">
                          {p.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-800">
                    <button
                      onClick={() => { setEditProof(proof); setShowPostModal(true); }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-all cursor-pointer"
                    >
                      <Edit className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteProof(proof.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : filteredReviews.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center space-y-3">
          <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-full text-gray-400">
            <MessageSquare className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No reviews found</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">There are no reviews in this category.</p>
        </div>
      ) : (
        /* ── Standard Reviews Table ── */
        <>
          {/* Desktop view Table */}
          <div className="hidden md:block overflow-hidden bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors duration-200">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-gray-500 dark:text-gray-400">
                <thead className="bg-gray-50 dark:bg-white/5 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Rating</th>
                    <th className="px-6 py-4">Comment</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">{filteredReviews.map((review) => (
                    <tr key={review.id} className="cursor-pointer hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors" onClick={() => handleOpenReview(review)}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {review.productImage ? (
                            <img src={review.productImage} alt={review.productName || 'Product'} className="w-12 h-12 rounded-md object-cover border border-gray-100 dark:border-gray-700 flex-shrink-0" />
                          ) : (
                            <div className="w-12 h-12 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 text-[10px] font-bold flex-shrink-0">No<br />Img</div>
                          )}
                          <span className="font-bold text-gray-900 dark:text-white line-clamp-2 max-w-[200px] text-sm leading-snug">
                            {review.productName || 'Unknown Product'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-800 dark:text-gray-200">{review.customerName}</div>
                        {review.customerPhone && <div className="text-xs text-gray-400 dark:text-gray-500">{review.customerPhone}</div>}
                        {review.customerEmail && <div className="text-xs text-gray-400 dark:text-gray-500">{review.customerEmail}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <StarRating rating={review.rating} showText={true} starSize={14} />
                      </td>
                      <td className="px-6 py-4 max-w-xs truncate" title={review.comment}>
                        {review.comment || <span className="text-gray-300 dark:text-gray-700 italic">No comment</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full ${
                          !review.approved
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                            : review.hidden
                            ? 'bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-400'
                            : 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400'
                        }`}>
                          {!review.approved ? 'Pending' : review.hidden ? 'Hidden' : 'Approved'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-medium">
                        {formatDate(review.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggleApprove(review.id, review.approved); }}
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition-all cursor-pointer ${
                              review.approved
                                ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600'
                                : 'bg-gray-100 dark:bg-white/5 text-gray-400 hover:bg-green-50 dark:hover:bg-green-500/10 hover:text-green-600'
                            }`}
                            title={review.approved ? "Unapprove Review" : "Approve Review"}
                          >
                            <Check className="h-4.5 w-4.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggleHide(review.id, review.hidden ?? false); }}
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition-all cursor-pointer ${
                              review.hidden
                                ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-green-50 dark:hover:bg-green-500/10 hover:text-green-600'
                                : 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-600'
                            }`}
                            title={review.hidden ? "Show Review" : "Hide Review"}
                          >
                            {review.hidden ? <Eye className="h-4.5 w-4.5" /> : <EyeOff className="h-4.5 w-4.5" />}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(review.id); }}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white dark:hover:bg-red-500 dark:hover:text-white transition-all cursor-pointer"
                            title="Delete Review"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card list */}
          <div className="md:hidden space-y-4">
            {filteredReviews.map((review) => (
              <div
                key={review.id}
                className="cursor-pointer bg-white dark:bg-[#16162a] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-3 transition-colors duration-200 hover:bg-gray-50/50 dark:hover:bg-white/5"
                onClick={() => handleOpenReview(review)}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {review.productImage ? (
                      <img src={review.productImage} alt={review.productName || 'Product'} className="w-12 h-12 rounded-md object-cover border border-gray-100 dark:border-gray-700 flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 text-[10px] font-bold flex-shrink-0">No<br />Img</div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 dark:text-white text-sm truncate">{review.productName || 'Unknown Product'}</h3>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        by <span className="font-semibold text-gray-700 dark:text-gray-300">{review.customerName}</span>
                        {review.customerPhone && ` (${review.customerPhone})`}
                        {review.customerEmail && <div className="text-xs text-gray-400 dark:text-gray-500">{review.customerEmail}</div>}
                      </div>
                    </div>
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
                </div>
                <div className="flex items-center justify-between">
                  <StarRating rating={review.rating} showText={false} starSize={12} />
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">{formatDate(review.createdAt)}</span>
                </div>
                {review.comment && (
                  <p className="text-xs text-gray-650 dark:text-gray-300 italic bg-gray-50 dark:bg-[#0f0f1b]/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800/20">&ldquo;{review.comment}&rdquo;</p>
                )}
                <div className="flex justify-end gap-2 pt-1.5 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleApprove(review.id, review.approved); }}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      review.approved
                        ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600'
                        : 'bg-gray-100 dark:bg-white/5 text-gray-400 hover:bg-green-50 dark:hover:bg-green-500/10 hover:text-green-600'
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>{review.approved ? 'Approved' : 'Approve'}</span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleHide(review.id, review.hidden ?? false); }}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      review.hidden
                        ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-green-50 dark:hover:bg-green-500/10 hover:text-green-600'
                        : 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-600'
                    }`}
                  >
                    {review.hidden ? <><Eye className="h-3.5 w-3.5" /><span>Show</span></> : <><EyeOff className="h-3.5 w-3.5" /><span>Hide</span></>}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(review.id); }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white dark:hover:bg-red-500 dark:hover:text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {selectedReview && (
        <ReviewDetailSheet
          review={selectedReview}
          onClose={() => setSelectedReview(null)}
          onApprove={(id, approved) => handleToggleApprove(id, approved)}
          onHide={(id, hidden) => handleToggleHide(id, hidden)}
          onDelete={(id) => handleDelete(id)}
          storeUrl={getClientSiteUrl()}
        />
      )}

      {showPostModal && (
        <PostReviewModal
          isOpen={showPostModal}
          onClose={() => { setShowPostModal(false); setEditProof(null); }}
          onSuccess={() => refreshReviews()}
          editProof={editProof}
        />
      )}
    </div>
  );
}

export default function AdminReviewsPage() {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse bg-gray-100 dark:bg-gray-800 rounded-2xl" />}>
      <AdminReviewsPageInner />
    </Suspense>
  );
}
