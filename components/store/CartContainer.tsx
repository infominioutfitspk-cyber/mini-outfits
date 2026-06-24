'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ChevronLeft, ShoppingBag, Send, HelpCircle, Plus, Minus, Trash2,
  Shield, Truck, Tag, X, ShoppingCart, Package, CheckCircle2, ChevronRight,
  Lock, ArrowRight, Clock
} from '@/components/common/Icons';
import { StoreSettings, ShippingMethod, CartItem, PaymentMethod } from '@/lib/types';
import { useCartStore } from '@/store/cartStore';
import { formatPrice, generateWhatsAppMessage, buildWhatsAppURL } from '@/lib/utils/whatsapp';
import { createOrder } from '@/lib/services/orders';
import { trackEvent } from '@/lib/trackEvent';
import { toast } from 'sonner';
import PaymentBadges from '@/components/common/PaymentBadges';
import { validateCouponCode } from '@/lib/services/coupons';
import { useAbandonedCartTracker } from '@/lib/hooks/useAbandonedCartTracker';



interface CartContainerProps {
  settings: StoreSettings;
}

// ─── View states ──────────────────────────────────────────────────────────────
type CartView = 'cart' | 'checkout' | 'success';

export default function CartContainer({ settings }: CartContainerProps) {
  const items = useCartStore(state => state.items);
  const updateQuantity = useCartStore(state => state.updateQuantity);
  const removeItem = useCartStore(state => state.removeItem);
  const totalPrice = useCartStore(state => state.totalPrice());
  const clearCart = useCartStore(state => state.clearCart);
  const appliedCoupon = useCartStore(state => state.appliedCoupon);
  const applyCoupon = useCartStore(state => state.applyCoupon);
  const cartCreatedAt = useCartStore(state => state.cartCreatedAt);

  const [mounted, setMounted] = useState(false);
  const [timeLeftStr, setTimeLeftStr] = useState('');
  const [isTimerExpired, setIsTimerExpired] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  // Clear confirmation auto-reset timer
  useEffect(() => {
    if (!isConfirmingClear) return;
    const timer = setTimeout(() => {
      setIsConfirmingClear(false);
    }, 3000); // Reset after 3 seconds
    return () => clearTimeout(timer);
  }, [isConfirmingClear]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Cart Expiration countdown
  useEffect(() => {
    if (!mounted || settings.cart_timer_enabled === false || !cartCreatedAt || items.length === 0) return;

    const timerLimitMinutes = settings.cart_timer_minutes ?? 10;
    const limitMs = timerLimitMinutes * 60 * 1000;

    const updateCountdown = () => {
      const createdTime = new Date(cartCreatedAt).getTime();
      const now = new Date().getTime();
      const elapsed = now - createdTime;
      const remaining = limitMs - elapsed;

      if (remaining <= 0) {
        setIsTimerExpired(true);
        setTimeLeftStr('00:00');
      } else {
        setIsTimerExpired(false);
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        setTimeLeftStr(
          `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        );
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [mounted, cartCreatedAt, items.length, settings.cart_timer_minutes]);

  const router = useRouter();
  const searchParams = useSearchParams();
  const view: CartView =
    searchParams.get('step') === 'checkout' ? 'checkout' :
    searchParams.get('step') === 'success' ? 'success' :
    'cart';

  const setView = (newView: CartView) => {
    if (newView === 'checkout') {
      router.push('/cart?step=checkout');
    } else if (newView === 'success') {
      router.push('/cart?step=success');
    } else {
      router.push('/cart');
    }
  };

  // Checkout form fields
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [apartment, setApartment] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');

  // Abandoned cart tracking
  const { updateContact, markOrdered } = useAbandonedCartTracker(settings.currency || 'PKR');
  const [saveInfo, setSaveInfo] = useState(true);
  const [notes, setNotes] = useState('');
  const [placedOrder, setPlacedOrder] = useState<any>(null);

  // Discount
  const [discountCode, setDiscountCode] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-invalidate coupon if subtotal falls below minimum amount
  useEffect(() => {
    if (appliedCoupon && appliedCoupon.minCartAmount && totalPrice < appliedCoupon.minCartAmount) {
      applyCoupon(null);
      toast.error(`Coupon ${appliedCoupon.code} removed (Subtotal fell below Rs. ${appliedCoupon.minCartAmount})`);
    }
  }, [totalPrice, appliedCoupon, applyCoupon]);

  // Dynamic shipping
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(null);
  const [loadingMethods, setLoadingMethods] = useState(true);

  // Dynamic payment methods
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [loadingPayments, setLoadingPayments] = useState(true);

  // Load saved checkout info
  useEffect(() => {
    const saved = localStorage.getItem('checkout_info');
    if (saved) {
      try {
        const info = JSON.parse(saved);
        setEmailOrPhone(info.emailOrPhone || '');
        setFirstName(info.firstName || '');
        setLastName(info.lastName || '');
        setAddress(info.address || '');
        setApartment(info.apartment || '');
        setCity(info.city || '');
        setPostalCode(info.postalCode || '');
        setPhone(info.phone || '');
      } catch {}
    }
  }, []);

  // Load placed order if view is success
  // Sync contact to abandoned cart whenever checkout fields change
  useEffect(() => {
    if (view === 'checkout') {
      const email = emailOrPhone.includes('@') ? emailOrPhone.trim() : undefined;
      const phoneVal = phone.trim() || (emailOrPhone.trim() && !emailOrPhone.includes('@') ? emailOrPhone.trim() : undefined);
      const name = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
      
      updateContact({
        name: name || undefined,
        email,
        phone: phoneVal,
        address: address.trim() || undefined,
        apartment: apartment.trim() || undefined,
        city: city.trim() || undefined,
        postalCode: postalCode.trim() || undefined,
      });
    }
  }, [view, emailOrPhone, firstName, lastName, phone, address, apartment, city, postalCode, updateContact]);

  useEffect(() => {
    if (view === 'success') {
      const saved = localStorage.getItem('last_placed_order');
      if (saved) {
        try {
          setPlacedOrder(JSON.parse(saved));
        } catch {}
      }
    }
  }, [view]);

  // Track InitiateCheckout when step is checkout
  useEffect(() => {
    if (view === 'checkout' && items.length > 0) {
      trackEvent('InitiateCheckout', {
        content_ids: items.map(item => item.selectedVariant?.id || item.product.id),
        content_type: 'product',
        value: totalPrice,
        currency: settings.currency || 'PKR',
        num_items: items.reduce((sum, item) => sum + item.quantity, 0)
      });
    }
  }, [view, items, totalPrice, settings.currency]);

  // Fetch shipping and payment methods
  useEffect(() => {
    async function fetchMethods() {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        
        // 1. Fetch shipping
        try {
          const shipRes = await supabase.from('shipping_methods').select('*').eq('active', true).order('sort_order', { ascending: true });
          const shipList: ShippingMethod[] = (shipRes.data || []).map((r: any) => ({
            id: r.id, name: r.name, cost: Number(r.cost),
            estimatedDays: r.estimated_days, active: r.active, sortOrder: r.sort_order ?? 0, createdAt: r.created_at
          }));
          setShippingMethods(shipList);
          if (shipList.length > 0) setSelectedShippingId(shipList[0].id);
        } catch {
          const fallback: ShippingMethod = { id: 'fallback', name: 'Standard Delivery', cost: 200, estimatedDays: '3–5 business days', active: true, sortOrder: 0, createdAt: '' };
          setShippingMethods([fallback]);
          setSelectedShippingId('fallback');
        } finally {
          setLoadingMethods(false);
        }

        // 2. Fetch payment
        try {
          const payRes = await supabase.from('payment_methods').select('*').eq('active', true).order('sort_order', { ascending: true });
          const payList: PaymentMethod[] = (payRes.data || []).map((r: any) => ({
            id: r.id, name: r.name, code: r.code, active: r.active, instructions: r.instructions, sortOrder: r.sort_order ?? 0, createdAt: r.created_at
          }));
          setPaymentMethods(payList);
          if (payList.length > 0) setSelectedPaymentId(payList[0].id);
        } catch (err) {
          console.error('Failed to load payment methods:', err);
          const fallbackPay: PaymentMethod = { id: 'cod-fallback', name: 'Cash on Delivery', code: 'cod', active: true, sortOrder: 0, createdAt: '' };
          setPaymentMethods([fallbackPay]);
          setSelectedPaymentId('cod-fallback');
        } finally {
          setLoadingPayments(false);
        }
      } catch (e) {
        console.error('Client creation failed:', e);
        setLoadingMethods(false);
        setLoadingPayments(false);
      }
    }
    fetchMethods();
  }, []);

  // ── Price math ──────────────────────────────────────────────────────────────
  const selectedShipping = shippingMethods.find(m => m.id === selectedShippingId);
  const selectedPayment = paymentMethods.find(p => p.id === selectedPaymentId);
  const baseShippingCost = selectedShipping?.cost ?? 200;
  const subtotal = totalPrice;
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  // Free shipping check
  const freeShippingThreshold = settings.free_shipping_threshold ?? 2000;
  const qualifiesForFreeShipping = settings.free_shipping_bar_enabled !== false && subtotal >= freeShippingThreshold;
  const shippingCost = qualifiesForFreeShipping ? 0 : baseShippingCost;
  const amountToFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
  const shippingPercent = Math.min((subtotal / freeShippingThreshold) * 100, 100);

  // Volume discount check
  const volumeDiscountThreshold = settings.volume_discount_threshold ?? 3;
  const volumeDiscountPercentage = settings.volume_discount_percentage ?? 10;
  const qualifiesForVolumeDiscount = settings.volume_discounts_enabled !== false && itemCount >= volumeDiscountThreshold;
  const volumeDiscountAmount = qualifiesForVolumeDiscount
    ? Math.round((subtotal * volumeDiscountPercentage) / 100)
    : 0;
  
  // Coupon discount check
  const couponDiscountAmount = (() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discountType === 'percentage') {
      return Math.round((subtotal * appliedCoupon.value) / 100);
    } else {
      return Math.min(appliedCoupon.value, subtotal);
    }
  })();

  const discountAmount = volumeDiscountAmount + couponDiscountAmount;
  
  const finalTotal = Math.max(0, subtotal - discountAmount + shippingCost);

  const handleApplyDiscount = async (e: React.MouseEvent) => {
    e.preventDefault();
    const clean = discountCode.trim().toUpperCase();
    if (!clean) return;

    setLoading(true);
    try {
      const coupon = await validateCouponCode(clean, subtotal);
      if (coupon) {
        applyCoupon(coupon);
        setDiscountCode('');
        toast.success(`Coupon "${coupon.code}" applied successfully!`);
      } else {
        toast.error('Invalid or expired coupon code');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to validate coupon code');
    } finally {
      setLoading(false);
    }
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) { toast.error('Please enter your full name'); return; }
    if (!address.trim()) { toast.error('Please enter your shipping address'); return; }
    if (!city.trim()) { toast.error('Please enter your city'); return; }
    if (!phone.trim()) { toast.error('Please enter your phone number'); return; }
    if (paymentMethods.length > 0 && !selectedPaymentId) { toast.error('Please select a payment method'); return; }

    try {
      setLoading(true);

      const formattedAddress = [
        `Address: ${address.trim()}`,
        apartment.trim() ? `Apt/Suite: ${apartment.trim()}` : '',
        `City: ${city.trim()}`,
        postalCode.trim() ? `Postal: ${postalCode.trim()}` : '',
        `Phone: ${phone.trim()}`,
        emailOrPhone.trim() ? `Contact: ${emailOrPhone.trim()}` : '',
        notes.trim() ? `Notes: ${notes.trim()}` : '',
        `Payment Method: ${selectedPayment?.name ?? 'Cash on delivery'}`,
        volumeDiscountAmount > 0 ? `Volume Discount: -${formatPrice(volumeDiscountAmount, settings.currencySymbol)}` : '',
        couponDiscountAmount > 0 ? `Coupon Discount (${appliedCoupon?.code}): -${formatPrice(couponDiscountAmount, settings.currencySymbol)}` : ''
      ].filter(Boolean).join('\n');

      const order = await createOrder({
        customerName: `${firstName.trim()} ${lastName.trim()}`,
        customerPhone: phone.trim(),
        customerEmail: emailOrPhone.includes('@') ? emailOrPhone.trim() : undefined,
        items, subtotal, total: finalTotal, notes: formattedAddress
      });

      if (saveInfo) {
        localStorage.setItem('checkout_info', JSON.stringify({
          emailOrPhone: emailOrPhone.trim(), firstName: firstName.trim(), lastName: lastName.trim(),
          address: address.trim(), apartment: apartment.trim(), city: city.trim(),
          postalCode: postalCode.trim(), phone: phone.trim()
        }));
      } else {
        localStorage.removeItem('checkout_info');
      }

      const baseMsg = generateWhatsAppMessage(items, settings);
      const fullMsg = [
        baseMsg, '',
        '*Shipping Details:*',
        `• Name: ${firstName.trim()} ${lastName.trim()}`,
        `• Phone: ${phone.trim()}`,
        `• Address: ${address.trim()}`,
        apartment.trim() ? `• Apt/Suite: ${apartment.trim()}` : '',
        `• City: ${city.trim()}`,
        postalCode.trim() ? `• Postal: ${postalCode.trim()}` : '',
        emailOrPhone.trim() ? `• Contact: ${emailOrPhone.trim()}` : '',
        notes.trim() ? `• Notes: ${notes.trim()}` : '',
        volumeDiscountAmount > 0 ? `• Volume Discount: -${formatPrice(volumeDiscountAmount, settings.currencySymbol)}` : '',
        couponDiscountAmount > 0 ? `• Coupon Discount (${appliedCoupon?.code}): -${formatPrice(couponDiscountAmount, settings.currencySymbol)}` : '',
        `• Shipping: ${selectedShipping?.name ?? 'Standard'} (${formatPrice(shippingCost, settings.currencySymbol)})`,
        `• Payment Method: ${selectedPayment?.name ?? 'Cash on delivery'}`,
        `*Grand Total: ${formatPrice(finalTotal, settings.currencySymbol)}*`,
        '',
        `• Order No: ${order.orderNumber}`
      ].filter(Boolean).join('\n');

      // Track Purchase event (sending specific variant IDs or product IDs)
      trackEvent('Purchase', {
        transaction_id: order.orderNumber || order.id,
        value: finalTotal,
        currency: settings.currency || 'PKR',
        content_ids: items.map(item => item.selectedVariant?.id || item.product.id),
        content_type: 'product',
        num_items: items.reduce((sum, item) => sum + item.quantity, 0)
      });

      const orderData = {
        orderNumber: order.orderNumber,
        createdAt: new Date().toISOString(),
        total: finalTotal,
        items: [...items],
        customerName: `${firstName.trim()} ${lastName.trim()}`,
        phone: phone.trim(),
        address: address.trim(),
        apartment: apartment.trim(),
        city: city.trim(),
        postalCode: postalCode.trim(),
        emailOrPhone: emailOrPhone.trim(),
        shippingMethodName: selectedShipping?.name ?? 'Standard Delivery',
        shippingCost: shippingCost,
        subtotal: subtotal,
        discountAmount: discountAmount,
        paymentMethodName: selectedPayment?.name ?? 'Cash on delivery',
        paymentInstructions: selectedPayment?.instructions ?? undefined
      };

      // Save order snapshot to localStorage and React state
      localStorage.setItem('last_placed_order', JSON.stringify(orderData));
      setPlacedOrder(orderData);

      // Mark cart as ordered to suppress abandonment email
      try { await markOrdered(order.id); } catch {}

      if (typeof window !== 'undefined') {
        localStorage.removeItem('zaynahs_cart_session');
      }

      clearCart();
      router.push('/cart?step=success');
      window.open(buildWhatsAppURL(settings.whatsappNumber || '923001234567', fullMsg), '_blank');
      toast.success('Order placed! Redirecting to WhatsApp...');
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ───────────────────────────────────────────────────────────
  if (view === 'success' && placedOrder) {
    const formattedDate = new Date(placedOrder.createdAt).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });

    return (
      <div className="min-h-screen bg-white dark:bg-[#0f0f1b] text-gray-900 dark:text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-8 animate-fade-in">
          {/* Breadcrumbs */}
          <div className="flex justify-center items-center gap-1.5 text-xs text-gray-400 font-bold select-none">
            <Link href="/" className="hover:text-[#e94560] transition-colors">Home</Link>
            <span>•</span>
            <Link href="/shop" className="hover:text-[#e94560] transition-colors">Shop</Link>
            <span>•</span>
            <span className="text-gray-900 dark:text-white font-extrabold">Checkout</span>
          </div>

          {/* Heading */}
          <div className="text-center">
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Checkout</h1>
          </div>

          {/* Thank you banner */}
          <div className="border-l-4 border-emerald-500 bg-emerald-50/55 dark:bg-emerald-950/10 p-4 rounded-r-2xl">
            <h2 className="text-lg font-black text-emerald-800 dark:text-emerald-400">Thank you. Your order has been received.</h2>
          </div>

          {/* Quick info box */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-gray-50 dark:bg-[#16162a] rounded-2xl border border-gray-100 dark:border-gray-800 text-xs sm:text-sm font-semibold">
            <div className="space-y-1">
              <span className="text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider block text-[10px]">Order number:</span>
              <strong className="text-gray-900 dark:text-white font-black">{placedOrder.orderNumber}</strong>
            </div>
            <div className="space-y-1">
              <span className="text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider block text-[10px]">Date:</span>
              <strong className="text-gray-900 dark:text-white font-black">{formattedDate}</strong>
            </div>
            <div className="space-y-1">
              <span className="text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider block text-[10px]">Total:</span>
              <strong className="text-gray-900 dark:text-white font-black">{formatPrice(placedOrder.total, settings.currencySymbol)}</strong>
            </div>
            <div className="space-y-1">
              <span className="text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider block text-[10px]">Payment method:</span>
              <strong className="text-gray-900 dark:text-white font-black">{placedOrder.paymentMethodName || 'Cash on delivery'}</strong>
            </div>
          </div>

          {placedOrder.paymentInstructions ? (
            <div className="p-5 bg-emerald-50/30 dark:bg-emerald-950/10 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/20 text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line shadow-sm">
              <strong className="block text-emerald-800 dark:text-emerald-400 mb-1.5 uppercase tracking-wider text-xs">
                📋 Payment Instructions / Details:
              </strong>
              {placedOrder.paymentInstructions}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed italic">
              Pay with cash upon delivery.
            </p>
          )}

          {/* Order Details Table */}
          <div className="space-y-4">
            <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight border-b border-gray-100 dark:border-gray-800 pb-2">Order details</h3>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {/* Product list */}
              {placedOrder.items.map((item: any) => {
                const img = item.product.images.find((i: any) => i.isPrimary)?.url || item.product.images[0]?.url || '';
                const parts: string[] = [];
                if (item.selectedVariant?.color) parts.push(item.selectedVariant.color);
                if (item.selectedVariant?.size) parts.push(item.selectedVariant.size);
                if (item.selectedVariant?.material) parts.push(item.selectedVariant.material);
                if (item.selectedVariant?.customValue) parts.push(item.selectedVariant.customValue);
                const variantStr = parts.join(' · ');

                return (
                  <div key={item.id} className="flex items-center justify-between py-4 text-sm font-semibold">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0f0f1b]">
                        {img ? (
                          <Image src={img} alt={item.product.name} fill className="object-cover" unoptimized />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center"><Package className="h-4 w-4 text-gray-300" /></div>
                        )}
                      </div>
                      <div>
                        <span className="text-gray-900 dark:text-white font-bold">{item.product.name}</span>
                        {variantStr && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 block font-semibold">{variantStr}</span>
                        )}
                        {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 block font-semibold">
                            + {item.selectedModifiers.map((m: any) => m.name).join(', ')}
                          </span>
                        )}
                        <span className="text-xs text-gray-400 font-bold block mt-0.5">Qty: {item.quantity}</span>
                      </div>
                    </div>
                    <span className="text-gray-900 dark:text-white font-black">{formatPrice(item.unitPrice * item.quantity, settings.currencySymbol)}</span>
                  </div>
                );
              })}

              {/* Subtotal */}
              <div className="flex justify-between py-3.5 text-sm font-semibold">
                <span className="text-gray-500 dark:text-gray-400">Subtotal:</span>
                <span className="text-gray-900 dark:text-white font-black">{formatPrice(placedOrder.subtotal, settings.currencySymbol)}</span>
              </div>

              {/* Discounts if any */}
              {placedOrder.discountAmount > 0 && (
                <div className="flex justify-between py-3.5 text-sm font-semibold text-emerald-500">
                  <span>Discount:</span>
                  <span>-{formatPrice(placedOrder.discountAmount, settings.currencySymbol)}</span>
                </div>
              )}

              {/* Shipping */}
              <div className="flex justify-between py-3.5 text-sm font-semibold">
                <span className="text-gray-500 dark:text-gray-400">Shipping:</span>
                <span className="text-gray-900 dark:text-white font-bold">
                  {formatPrice(placedOrder.shippingCost, settings.currencySymbol)} <span className="text-xs text-gray-400 font-semibold">via {placedOrder.shippingMethodName}</span>
                </span>
              </div>

              {/* Total */}
              <div className="flex justify-between py-4 text-base font-black text-gray-900 dark:text-white">
                <span>Total:</span>
                <span className="text-[#e94560] font-black text-lg">{formatPrice(placedOrder.total, settings.currencySymbol)}</span>
              </div>

              {/* Payment Method */}
              <div className="flex justify-between py-3.5 text-sm font-semibold">
                <span className="text-gray-500 dark:text-gray-400">Payment method:</span>
                <span className="text-gray-900 dark:text-white font-bold">{placedOrder.paymentMethodName || 'Cash on delivery'}</span>
              </div>
            </div>
          </div>

          {/* Addresses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            <div className="space-y-3">
              <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight border-b border-gray-100 dark:border-gray-800 pb-2">Billing address</h3>
              <address className="text-sm font-semibold text-gray-500 dark:text-gray-400 not-italic leading-relaxed">
                {placedOrder.customerName}<br />
                {placedOrder.address}<br />
                {placedOrder.apartment && <>{placedOrder.apartment}<br /></>}
                {placedOrder.city}<br />
                {placedOrder.postalCode && <>{placedOrder.postalCode}<br /></>}
                {placedOrder.phone}<br />
                {placedOrder.emailOrPhone && <span className="lowercase">{placedOrder.emailOrPhone}</span>}
              </address>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight border-b border-gray-100 dark:border-gray-800 pb-2">Shipping address</h3>
              <address className="text-sm font-semibold text-gray-500 dark:text-gray-400 not-italic leading-relaxed">
                {placedOrder.customerName}<br />
                {placedOrder.address}<br />
                {placedOrder.apartment && <>{placedOrder.apartment}<br /></>}
                {placedOrder.city}<br />
                {placedOrder.postalCode && <>{placedOrder.postalCode}<br /></>}
                {placedOrder.phone}
              </address>
            </div>
          </div>

          {/* Action button */}
          <div className="pt-4 flex justify-center">
            <button
              onClick={() => {
                localStorage.removeItem('last_placed_order');
                setPlacedOrder(null);
                router.push('/');
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#e94560] hover:bg-[#d8344e] active:scale-95 text-white px-8 py-3.5 text-sm font-bold transition-all duration-200 shadow-lg shadow-red-500/20 cursor-pointer border-none"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Empty cart ───────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-20 text-center space-y-5">
        <div className="relative">
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm">
            <ShoppingBag className="h-12 w-12 text-gray-300 dark:text-gray-600" />
          </div>
          <div className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#e94560] text-white text-[10px] font-black">0</div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">Your cart is empty</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">Looks like you haven&apos;t added anything yet. Browse our products to get started.</p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-2xl bg-[#e94560] hover:bg-[#d8344e] active:scale-95 text-white px-6 py-3.5 text-sm font-bold transition-all duration-200 shadow-lg shadow-red-500/20"
        >
          <ShoppingCart className="h-4 w-4" />
          Shop Now
        </Link>
      </div>
    );
  }

  // ── Helper: Order summary panel (shared between views) ─────────────────────────────
  const renderOrderSummary = (compact = false) => (
    <div className={`space-y-4 ${compact ? '' : 'bg-gray-50 dark:bg-[#16162a]/30 rounded-2xl p-5 border border-gray-100 dark:border-gray-800'}`}>
      {!compact && (
        <h3 className="text-base font-black text-gray-900 dark:text-white">Order Summary</h3>
      )}

      {/* Items in summary */}
      {compact && (
        <div className="space-y-2 pb-3 border-b border-gray-200 dark:border-gray-800 max-h-52 overflow-y-auto">
          {items.map(item => (
            <CartItemCard
              key={item.id}
              item={item}
              compact
              settings={settings}
              removeItem={removeItem}
              updateQuantity={updateQuantity}
            />
          ))}
        </div>
      )}

      {/* Discount input */}
      {settings.coupon_codes_enabled !== false && (
        <div className="flex gap-2">
          {appliedCoupon ? (
            <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/20 px-3 py-2.5 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 w-full">
              <span className="flex items-center gap-1.5 truncate">
                <Tag className="w-3.5 h-3.5 shrink-0" />
                Promo: <strong className="font-extrabold">{appliedCoupon.code}</strong> ({appliedCoupon.discountType === 'percentage' ? `${appliedCoupon.value}%` : `${formatPrice(appliedCoupon.value, settings.currencySymbol)} Off`})
              </span>
              <button
                type="button"
                onClick={() => applyCoupon(null)}
                className="text-red-500 hover:text-red-600 dark:hover:text-red-400 font-extrabold text-[10px] uppercase px-2 py-1 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 cursor-pointer shrink-0 ml-2"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="flex gap-2 w-full">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Discount code"
                  value={discountCode}
                  onChange={e => setDiscountCode(e.target.value.toUpperCase())}
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#16162a] text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#e94560] focus:outline-none transition-all"
                />
              </div>
              <button
                type="button"
                onClick={handleApplyDiscount}
                disabled={!discountCode.trim()}
                className="px-4 py-2.5 rounded-xl bg-[#1a1a2e] hover:bg-[#e94560] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-all cursor-pointer active:scale-95 whitespace-nowrap"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}

      {/* Free Shipping Tracker */}
      {settings.free_shipping_bar_enabled !== false && (
        <div className="space-y-1.5 py-1">
          <div className="flex justify-between text-xs font-bold text-gray-700 dark:text-gray-300">
            {qualifiesForFreeShipping ? (
              <span className="text-emerald-500 dark:text-emerald-400 flex items-center gap-1.5">
                <Truck className="w-4 h-4" /> You've unlocked free shipping!
              </span>
            ) : (
              <span>Add {formatPrice(amountToFreeShipping, settings.currencySymbol)} for free shipping</span>
            )}
            <span>{formatPrice(freeShippingThreshold, settings.currencySymbol)}</span>
          </div>
          <div className="h-2 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${qualifiesForFreeShipping ? 'bg-emerald-500' : 'bg-[#e94560]'}`}
              style={{ width: `${shippingPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Volume Discount Hint */}
      {!qualifiesForVolumeDiscount && settings.volume_discounts_enabled !== false && (
        <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 dark:bg-amber-500/10 px-2.5 py-1.5 rounded-lg w-full text-center flex items-center justify-center gap-1 border border-amber-500/20 select-none">
          <span>💡 Buy {volumeDiscountThreshold} items to get {volumeDiscountPercentage}% off!</span>
        </div>
      )}

      {/* Price breakdown */}
      <div className="space-y-2.5 text-sm font-semibold">
        <div className="flex justify-between text-gray-500 dark:text-gray-400">
          <span>Subtotal · {itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
          <span className="text-gray-900 dark:text-white font-bold">{formatPrice(subtotal, settings.currencySymbol)}</span>
        </div>

        {volumeDiscountAmount > 0 && (
          <div className="flex justify-between text-emerald-500 font-bold">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Volume Discount ({volumeDiscountPercentage}% off)
            </span>
            <span>−{formatPrice(volumeDiscountAmount, settings.currencySymbol)}</span>
          </div>
        )}

        {couponDiscountAmount > 0 && (
          <div className="flex justify-between text-emerald-500 font-bold">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Promo Discount ({appliedCoupon?.code})
            </span>
            <span>−{formatPrice(couponDiscountAmount, settings.currencySymbol)}</span>
          </div>
        )}

        <div className="flex justify-between text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Truck className="h-3.5 w-3.5" />
            Shipping
          </span>
          <span className="text-gray-900 dark:text-white font-bold">{loadingMethods ? '...' : formatPrice(shippingCost, settings.currencySymbol)}</span>
        </div>

        <div className="flex justify-between pt-3 border-t border-gray-200 dark:border-gray-800 text-base font-black text-gray-900 dark:text-white">
          <span>Total</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-semibold text-gray-400">{settings.currency || 'PKR'}</span>
            <span className="text-xl text-[#e94560] font-black">{formatPrice(finalTotal, settings.currencySymbol)}</span>
          </div>
        </div>
      </div>

      {/* Trust badges — from settings.safeCheckoutMethods (single source of truth) */}
      {settings.enableTrustBadges && settings.safeCheckoutMethods && settings.safeCheckoutMethods.length > 0 && (
        <div className="pt-3 border-t border-gray-200 dark:border-gray-800 space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400">
            <Shield className="h-3 w-3" />
            {settings.safeCheckoutText || 'Guaranteed Safe Checkout'}
          </div>
          <PaymentBadges methods={settings.safeCheckoutMethods} className="flex flex-wrap gap-1.5" />
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // CART VIEW — show items, edit qty, proceed to checkout
  // ═══════════════════════════════════════════════════════════════════════════
  if (view === 'cart') {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0f0f1b] text-gray-900 dark:text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
            {/* Top Row on Mobile: Back Link (Left) & Clear Button (Right) */}
            <div className="flex items-center justify-between w-full sm:w-auto">
              <Link
                href="/"
                className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-[#e94560] transition-colors whitespace-nowrap min-h-[44px] px-2 -ml-2 select-none"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Continue Shopping</span>
                <span className="sm:hidden">Back</span>
              </Link>
              
              <div className="sm:hidden">
                <button
                  type="button"
                  onClick={() => {
                    if (isConfirmingClear) {
                      clearCart();
                      toast.success('Cart cleared');
                      setIsConfirmingClear(false);
                    } else {
                      setIsConfirmingClear(true);
                    }
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all duration-200 min-h-[44px] select-none cursor-pointer border ${
                    isConfirmingClear
                      ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/20 scale-105 active:scale-95'
                      : 'bg-transparent border-gray-200 dark:border-gray-800 text-gray-400 hover:text-[#e94560] hover:border-[#e94560]/30 dark:hover:border-[#e94560]/30 active:scale-95'
                  }`}
                >
                  <Trash2 className={`h-3.5 w-3.5 transition-transform ${isConfirmingClear ? 'animate-bounce text-white' : ''}`} />
                  <span>{isConfirmingClear ? 'Tap to Confirm' : 'Clear'}</span>
                </button>
              </div>
            </div>

            {/* Bottom Row on Mobile / Center on Desktop: Title and Expiry Timer */}
            <div className="flex flex-wrap items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-[#e94560]" />
                <h1 className="text-xl sm:text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                  Cart <span className="text-gray-400 font-semibold text-sm">({itemCount})</span>
                </h1>
              </div>

              {/* Cart Expiry Timer Indicator */}
              {settings.cart_timer_enabled !== false && cartCreatedAt && timeLeftStr && (
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                  isTimerExpired
                    ? 'text-rose-500 bg-rose-500/10 dark:text-rose-400/90'
                    : 'text-amber-600 bg-amber-500/10 dark:text-amber-400/90'
                }`}>
                  <Clock className="w-3.5 h-3.5 shrink-0 animate-pulse" />
                  <span>
                    {isTimerExpired ? "Reservation expired!" : `Reserved for ${timeLeftStr}`}
                  </span>
                </div>
              )}
            </div>

            {/* Desktop Clear Button (Hidden on Mobile) */}
            <div className="hidden sm:block">
              <button
                type="button"
                onClick={() => {
                  if (isConfirmingClear) {
                    clearCart();
                    toast.success('Cart cleared');
                    setIsConfirmingClear(false);
                  } else {
                    setIsConfirmingClear(true);
                  }
                }}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all duration-200 min-h-[44px] select-none cursor-pointer border ${
                  isConfirmingClear
                    ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/20 scale-105 active:scale-95'
                    : 'bg-transparent border-gray-200 dark:border-gray-800 text-gray-400 hover:text-[#e94560] hover:border-[#e94560]/30 dark:hover:border-[#e94560]/30 active:scale-95'
                }`}
              >
                <Trash2 className={`h-3.5 w-3.5 transition-transform ${isConfirmingClear ? 'animate-bounce text-white' : ''}`} />
                <span>{isConfirmingClear ? 'Confirm Clear?' : 'Clear'}</span>
              </button>
            </div>
          </div>

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">

            {/* LEFT: Item list */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm space-y-1">
                {items.map(item => (
                  <CartItemCard
                    key={item.id}
                    item={item}
                    compact={false}
                    settings={settings}
                    removeItem={removeItem}
                    updateQuantity={updateQuantity}
                  />
                ))}
              </div>

              {/* Shipping method selector in cart view */}
              <div className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <Truck className="h-4 w-4 text-[#e94560]" />
                  Choose Shipping
                </h3>
                {loadingMethods ? (
                  <div className="animate-pulse h-10 bg-gray-100 dark:bg-gray-800 rounded-xl" />
                ) : shippingMethods.length === 0 ? (
                  <p className="text-sm text-gray-400">Contact us for shipping options.</p>
                ) : (
                  <div className="grid gap-2">
                    {shippingMethods.map(method => {
                      const sel = selectedShippingId === method.id;
                      return (
                        <label
                          key={method.id}
                          className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all ${sel
                            ? 'border-[#e94560] bg-red-50/30 dark:bg-red-900/10'
                            : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="shipping"
                              checked={sel}
                              onChange={() => setSelectedShippingId(method.id)}
                              className="accent-[#e94560] h-4 w-4"
                            />
                            <div>
                              <div className="text-sm font-bold text-gray-800 dark:text-gray-200">{method.name}</div>
                              {method.estimatedDays && (
                                <div className="text-xs text-gray-400 font-semibold">{method.estimatedDays}</div>
                              )}
                            </div>
                          </div>
                          <span className={`text-sm font-black ${sel ? 'text-[#e94560]' : 'text-gray-600 dark:text-gray-300'}`}>
                            {formatPrice(method.cost, settings.currencySymbol)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: Order summary */}
            <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
              {renderOrderSummary(false)}

              {/* Proceed to checkout button */}
              <button
                type="button"
                onClick={() => setView('checkout')}
                className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#1a1a2e] dark:bg-white text-white dark:text-[#1a1a2e] hover:bg-[#e94560] dark:hover:bg-[#e94560] dark:hover:text-white active:scale-98 px-5 py-4.5 text-base font-black transition-all duration-200 shadow-xl shadow-gray-900/10 dark:shadow-white/5 cursor-pointer group"
              >
                <Lock className="h-5 w-5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity" />
                <span>Secure Checkout</span>
                <ArrowRight className="h-5 w-5 shrink-0 group-hover:translate-x-1 transition-transform" />
              </button>

              <p className="text-center text-xs text-gray-400 font-semibold">
                🔒 Secure WhatsApp checkout · No account required
              </p>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHECKOUT VIEW — address form + submit
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-white dark:bg-[#0f0f1b] text-gray-900 dark:text-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleOrderSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">

          {/* LEFT: Checkout form */}
          <div className="lg:col-span-7 space-y-6">

            {/* Back to cart */}
            <button
              type="button"
              onClick={() => setView('cart')}
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-[#e94560] transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Cart
            </button>

            {/* Progress */}
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="text-gray-400">Cart</span>
              <ChevronRight className="h-3 w-3 text-gray-300" />
              <span className="text-[#e94560] font-black">Checkout</span>
              <ChevronRight className="h-3 w-3 text-gray-300" />
              <span className="text-gray-400">WhatsApp Confirm</span>
            </div>

            {/* Contact */}
            <div className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm space-y-4">
              <h2 className="text-base font-black text-gray-900 dark:text-white">Contact</h2>
              <input
                type="text"
                placeholder="Email or phone number"
                value={emailOrPhone}
                onChange={e => setEmailOrPhone(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-3 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
              />
            </div>

            {/* Delivery */}
            <div className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm space-y-4">
              <h2 className="text-base font-black text-gray-900 dark:text-white">Delivery Address</h2>

              {/* Country (locked) */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">Country / Region</label>
                <div className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0f0f1b] px-4 py-3 text-sm font-semibold text-gray-500 dark:text-gray-400">
                  🇵🇰 Pakistan
                </div>
              </div>

              {/* Name grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">First Name<span className="text-red-500 ml-0.5">*</span></label>
                  <input
                    type="text" required placeholder="Ali"
                    value={firstName} onChange={e => setFirstName(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-3 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">Last Name<span className="text-red-500 ml-0.5">*</span></label>
                  <input
                    type="text" required placeholder="Hassan"
                    value={lastName} onChange={e => setLastName(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-3 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">Address<span className="text-red-500 ml-0.5">*</span></label>
                <input
                  type="text" required placeholder="Street address, house number"
                  value={address} onChange={e => setAddress(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-3 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
                />
              </div>

              {/* Address Line 2 */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">Address Line 2<span className="text-gray-500 ml-1 font-normal normal-case text-[9px]">(Optional)</span></label>
                <input
                  type="text" placeholder="Apartment, suite, floor"
                  value={apartment} onChange={e => setApartment(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-3 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
                />
              </div>

              {/* City + Postal */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">City<span className="text-red-500 ml-0.5">*</span></label>
                  <input
                    type="text" required placeholder="Karachi"
                    value={city} onChange={e => setCity(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-3 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">Postal Code<span className="text-gray-500 ml-1 font-normal normal-case text-[9px]">(Optional)</span></label>
                  <input
                    type="text" placeholder="75500"
                    value={postalCode} onChange={e => setPostalCode(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-3 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">
                  WhatsApp / Phone<span className="text-red-500 ml-0.5">*</span>
                </label>
                <div className="relative">
                  <input
                    type="tel" required placeholder="0300 1234567"
                    value={phone} onChange={e => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-3 pr-10 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-help" title="We'll send your order confirmation here">
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Order notes */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">Order Notes<span className="text-gray-500 ml-1 font-normal normal-case text-[9px]">(Optional)</span></label>
                <textarea
                  rows={2}
                  placeholder="Special instructions, colour preference, delivery timing..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/50 px-4 py-3 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none transition-all resize-none"
                />
              </div>

              {/* Save info */}
              <label className="flex items-center gap-2.5 text-xs font-semibold text-gray-600 dark:text-gray-400 select-none cursor-pointer">
                <input
                  type="checkbox" checked={saveInfo} onChange={e => setSaveInfo(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 accent-[#e94560]"
                />
                <span>Save this info for next time</span>
              </label>
            </div>

            {/* Shipping Method */}
            <div className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm space-y-3">
              <h2 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Truck className="h-4 w-4 text-[#e94560]" />
                Shipping Method
              </h2>
              {loadingMethods ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-12 rounded-xl bg-gray-100 dark:bg-gray-800" />
                  <div className="h-12 rounded-xl bg-gray-100 dark:bg-gray-800 opacity-60" />
                </div>
              ) : shippingMethods.length === 0 ? (
                <p className="text-sm text-gray-500">No shipping methods available. Contact via WhatsApp.</p>
              ) : (
                <div className="space-y-2">
                  {shippingMethods.map(method => {
                    const sel = selectedShippingId === method.id;
                    return (
                      <label key={method.id} className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all ${sel ? 'border-[#e94560] bg-red-50/30 dark:bg-red-900/10' : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'}`}>
                        <div className="flex items-center gap-3">
                          <input type="radio" name="shippingCheckout" checked={sel} onChange={() => setSelectedShippingId(method.id)} className="accent-[#e94560] h-4 w-4" />
                          <div>
                            <div className="text-sm font-bold text-gray-800 dark:text-gray-200">{method.name}</div>
                            {method.estimatedDays && <div className="text-xs text-gray-400">{method.estimatedDays}</div>}
                          </div>
                        </div>
                        <span className={`text-sm font-black ${sel ? 'text-[#e94560]' : 'text-gray-600 dark:text-gray-300'}`}>
                          {formatPrice(method.cost, settings.currencySymbol)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Payment Method Selector */}
            <div className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm space-y-3">
              <h2 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Lock className="h-4 w-4 text-[#e94560]" />
                Payment Method
              </h2>
              {loadingPayments ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-12 rounded-xl bg-gray-100 dark:bg-gray-800" />
                </div>
              ) : paymentMethods.length === 0 ? (
                <p className="text-sm text-gray-500">No payment methods available.</p>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    {paymentMethods.map(method => {
                      const sel = selectedPaymentId === method.id;
                      return (
                        <div key={method.id} className="space-y-2">
                          <label className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all ${sel ? 'border-[#e94560] bg-red-50/30 dark:bg-red-900/10' : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'}`}>
                            <div className="flex items-center gap-3">
                              <input type="radio" name="paymentCheckout" checked={sel} onChange={() => setSelectedPaymentId(method.id)} className="accent-[#e94560] h-4 w-4" />
                              <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{method.name}</span>
                            </div>
                            <span className="text-xs font-semibold px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md text-gray-600 dark:text-gray-400 uppercase">
                              {method.code}
                            </span>
                          </label>
                          
                          {/* Show instructions below if selected and has instructions */}
                          {sel && method.instructions && (
                            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800/80 text-xs text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line shadow-inner animate-fade-in">
                              <span className="font-extrabold block text-gray-800 dark:text-gray-200 mb-1.5 uppercase tracking-wider text-[10px]">
                                📋 Payment Instructions:
                              </span>
                              {method.instructions}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT: Summary + Submit */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
            {renderOrderSummary(true)}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#e94560] hover:bg-[#d8344e] disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-5 py-4.5 text-base font-black transition-all duration-200 shadow-lg shadow-red-500/20 cursor-pointer active:scale-98"
            >
              {loading ? (
                <><div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />Processing...</>
              ) : (
                <><Send className="h-5 w-5" />Confirm Order via WhatsApp</>
              )}
            </button>

            <p className="text-center text-xs text-gray-400 font-semibold">
              🔒 Your information is safe · We only use it to process your order
            </p>
          </div>

        </form>
      </div>
    </div>
  );
}

// ── Standalone CartItemCard to prevent recreation & blinking on parent render ──
interface CartItemCardProps {
  item: CartItem;
  compact?: boolean;
  settings: StoreSettings;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
}

function CartItemCard({ item, compact = false, settings, removeItem, updateQuantity }: CartItemCardProps) {
  const img = item.product.images.find((i: any) => i.isPrimary)?.url || item.product.images[0]?.url || '';
  const parts: string[] = [];
  if (item.selectedVariant?.color) parts.push(item.selectedVariant.color);
  if (item.selectedVariant?.size) parts.push(item.selectedVariant.size);
  if (item.selectedVariant?.material) parts.push(item.selectedVariant.material);
  if (item.selectedVariant?.customValue) parts.push(item.selectedVariant.customValue);
  const variantStr = parts.join(' · ');

  return (
    <div className="flex items-start gap-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      {/* Image Container with Badge */}
      <div className="relative flex-shrink-0">
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0f0f1b] relative h-16 w-16 shadow-sm">
          {img ? (
            <Image src={img} alt={item.product.name} fill sizes="80px" className="object-cover" unoptimized />
          ) : (
            <div className="flex h-full w-full items-center justify-center"><Package className="h-6 w-6 text-gray-300" /></div>
          )}
        </div>
        {compact && (
          <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-gray-800/90 dark:bg-gray-100/90 backdrop-blur-sm text-[10px] font-bold text-white dark:text-black ring-2 ring-white dark:ring-[#16162a] z-10 shadow-sm">
            {item.quantity}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-center min-h-[4rem]">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-bold text-gray-900 dark:text-white line-clamp-2 text-sm leading-tight">
            {item.product.name}
          </h3>
          {compact && (
            <p className="text-sm font-black text-gray-900 dark:text-white shrink-0">
              {formatPrice(item.unitPrice * item.quantity, settings.currencySymbol)}
            </p>
          )}
        </div>

        {(variantStr || item.selectedModifiers?.length > 0) && (
          <div className="mt-1 space-y-0.5">
            {variantStr && (
              <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">{variantStr}</p>
            )}
            {item.selectedModifiers?.length > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                + {item.selectedModifiers.map((m: any) => m.name).join(', ')}
              </p>
            )}
          </div>
        )}

        {!compact && (
          <div className="flex items-center justify-between mt-3">
            {/* Qty stepper */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center bg-gray-50 dark:bg-[#0f0f1b] border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    if (item.quantity <= 1) { removeItem(item.id); toast.success('Item removed'); }
                    else updateQuantity(item.id, item.quantity - 1);
                  }}
                  className="flex h-8 w-8 items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer text-gray-500 dark:text-gray-400 active:scale-95"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-8 text-center text-sm font-bold text-gray-900 dark:text-white select-none">{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="flex h-8 w-8 items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer text-gray-500 dark:text-gray-400 active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => { removeItem(item.id); toast.success(`${item.product.name} removed`); }}
                className="ml-2 flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all cursor-pointer active:scale-95"
                title="Remove item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {/* Line price */}
            <span className="text-base font-black text-gray-900 dark:text-white">
              {formatPrice(item.unitPrice * item.quantity, settings.currencySymbol)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
