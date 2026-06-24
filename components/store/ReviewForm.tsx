'use client';

import React, { useState } from 'react';
import { submitReview } from '@/lib/services/reviews';
import StarRating from './StarRating';
import { toast } from 'sonner';
import { Send } from '@/components/common/Icons';

interface ReviewFormProps {
  productId: string;
  onReviewSubmitted?: () => void;
}

export default function ReviewForm({ productId, onReviewSubmitted }: ReviewFormProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (rating < 1 || rating > 5) {
      toast.error('Please select a star rating');
      return;
    }

    if (!customerPhone.trim() && !customerEmail.trim()) {
      toast.error('Please provide a phone number or email so we can contact you if needed');
      return;
    }

    try {
      setSubmitting(true);
      await submitReview({
        productId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        rating,
        comment: comment.trim() || undefined
      });

      toast.success('Review submitted! It will appear after approval.');
      
      // Reset form
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setRating(5);
      setComment('');

      if (onReviewSubmitted) {
        onReviewSubmitted();
      }
    } catch (err) {
      console.error('Failed to submit review:', err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="text-gray-900 dark:text-white space-y-4 transition-colors duration-200"
    >

      {/* Interactive Rating */}
      <div className="space-y-1">
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Your Rating</label>
        <StarRating
          rating={rating}
          interactive={true}
          onChange={setRating}
          starSize={28}
          showText={false}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Name */}
        <div className="md:col-span-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
            Your Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Enter your name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
            Phone Number <span className="text-red-500">*</span>
            <span className="text-gray-400 font-normal normal-case ml-1">(Email or Phone)</span>
          </label>
          <input
            type="tel"
            placeholder="e.g. 03001234567"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">
            Email Address <span className="text-red-500">*</span>
            <span className="text-gray-400 font-normal normal-case ml-1">(Email or Phone)</span>
          </label>
          <input
            type="email"
            placeholder="e.g. you@example.com"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Comment */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Your Review</label>
        <textarea
          placeholder="What did you like or dislike about this product?"
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all resize-none"
        />
      </div>

      {/* Privacy Notice */}
      <p className="text-xs text-gray-400">
        Your contact details will only be used to follow up on your review if needed. We will not share them or use them for marketing.
      </p>

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting || !customerName.trim()}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a1a2e] hover:bg-[#e94560] active:scale-98 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-5 py-3 text-sm font-bold transition-all duration-200 shadow-md cursor-pointer"
      >
        <Send className="h-4 w-4" />
        <span>{submitting ? 'Submitting...' : 'Submit Review'}</span>
      </button>
    </form>
  );
}
