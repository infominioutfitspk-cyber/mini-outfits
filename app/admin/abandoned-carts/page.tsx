'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { 
  Search, 
  ExternalLink, 
  X, 
  Copy, 
  Check, 
  Calendar, 
  MapPin, 
  User as UserIcon, 
  ShoppingBag, 
  Phone, 
  ChevronLeft, 
  ChevronRight, 
  Package,
  Clock,
  Trash2,
  RefreshCw,
  TrendingUp,
  Users,
  DollarSign,
  ShoppingCart,
  CheckCircle2,
  Mail,
  XCircle
} from '@/components/common/Icons';

interface AbandonedCart {
  id: string;
  sessionId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerCity?: string;
  customerApartment?: string;
  customerPostalCode?: string;
  items: any[];
  subtotal: number;
  currency: string;
  emailSent: boolean;
  emailSentAt?: string;
  orderPlaced: boolean;
  orderId?: string;
  recoveredAt?: string;
  lastActivity: string;
  createdAt: string;
  updatedAt: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'Just now';
}

function formatPrice(n: number): string {
  return `Rs. ${n.toLocaleString()}`;
}

export default function AbandonedCartsPage() {
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedCartId, setSelectedCartId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchCarts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/abandoned-carts');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setCarts(data.carts || []);
    } catch (err) {
      toast.error('Failed to load abandoned carts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCarts();

    const supabase = createClient();
    const mapRealtimeCart = (row: any): AbandonedCart => ({
      id: row.id,
      sessionId: row.session_id,
      customerName: row.customer_name ?? undefined,
      customerEmail: row.customer_email ?? undefined,
      customerPhone: row.customer_phone ?? undefined,
      customerAddress: row.customer_address ?? undefined,
      customerCity: row.customer_city ?? undefined,
      customerApartment: row.customer_apartment ?? undefined,
      customerPostalCode: row.customer_postal_code ?? undefined,
      items: row.items ?? [],
      subtotal: row.subtotal ? parseFloat(row.subtotal.toString()) : 0,
      currency: row.currency || 'PKR',
      emailSent: row.email_sent ?? false,
      emailSentAt: row.email_sent_at || undefined,
      orderPlaced: row.order_placed ?? false,
      orderId: row.order_id || undefined,
      recoveredAt: row.recovered_at || undefined,
      lastActivity: row.last_activity,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });

    const channel = supabase
      .channel('abandoned-carts-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'abandoned_carts' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newCart = mapRealtimeCart(payload.new);
            setCarts(prev => {
              if (prev.some(c => c.id === newCart.id)) return prev;
              return [newCart, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedCart = mapRealtimeCart(payload.new);
            setCarts(prev => prev.map(c => c.id === updatedCart.id ? updatedCart : c));
          } else if (payload.eventType === 'DELETE') {
            setCarts(prev => prev.filter(c => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCarts]);

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Are you sure you want to delete this cart?')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/abandoned-carts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setCarts(prev => prev.filter(c => c.id !== id));
      if (selectedCartId === id) setSelectedCartId(null);
      toast.success('Cart removed successfully');
    } catch {
      toast.error('Failed to delete cart');
    } finally {
      setDeleting(null);
    }
  };

  const selectedCart = carts.find(c => c.id === selectedCartId);

  const filteredCarts = carts.filter(c => {
    // Exclude recovered carts completely from active abandoned list
    if (c.orderPlaced) return false;

    // 1. Status Filter
    let matchesStatus = true;
    if (statusFilter === 'pending') matchesStatus = !c.emailSent;
    else if (statusFilter === 'emailed') matchesStatus = c.emailSent;

    // 2. Search Filter
    const matchesSearch = 
      (c.customerName && c.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.customerPhone && c.customerPhone.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.customerEmail && c.customerEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.sessionId && c.sessionId.toLowerCase().includes(searchQuery.toLowerCase()));

    // 3. Date Filter
    const activityDate = new Date(c.lastActivity);
    const activityTime = activityDate.getTime();
    const now = new Date();
    
    const getStartOfDay = (d: Date) => {
      const copy = new Date(d);
      copy.setHours(0, 0, 0, 0);
      return copy.getTime();
    };
    
    const getEndOfDay = (d: Date) => {
      const copy = new Date(d);
      copy.setHours(23, 59, 59, 999);
      return copy.getTime();
    };
    
    let matchesDate = true;
    if (dateFilter === 'today') {
      const start = getStartOfDay(now);
      const end = getEndOfDay(now);
      matchesDate = activityTime >= start && activityTime <= end;
    } else if (dateFilter === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const start = getStartOfDay(yesterday);
      const end = getEndOfDay(yesterday);
      matchesDate = activityTime >= start && activityTime <= end;
    } else if (dateFilter === 'last7') {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      matchesDate = activityTime >= getStartOfDay(sevenDaysAgo) && activityTime <= getEndOfDay(now);
    } else if (dateFilter === 'last30') {
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      matchesDate = activityTime >= getStartOfDay(thirtyDaysAgo) && activityTime <= getEndOfDay(now);
    } else if (dateFilter === 'custom') {
      const start = customStartDate ? getStartOfDay(new Date(customStartDate)) : 0;
      const end = customEndDate ? getEndOfDay(new Date(customEndDate)) : Infinity;
      matchesDate = activityTime >= start && activityTime <= end;
    }

    return matchesStatus && matchesSearch && matchesDate;
  });

  // Date-filtered active carts for stats
  const dateFilteredCarts = carts.filter(c => {
    if (c.orderPlaced) return false;
    const activityTime = new Date(c.lastActivity).getTime();
    const now = new Date();
    const getStartOfDay = (d: Date) => { const cp = new Date(d); cp.setHours(0,0,0,0); return cp.getTime(); };
    const getEndOfDay = (d: Date) => { const cp = new Date(d); cp.setHours(23,59,59,999); return cp.getTime(); };
    let matchesDate = true;
    if (dateFilter === 'today') { const s=getStartOfDay(now), e=getEndOfDay(now); matchesDate = activityTime>=s && activityTime<=e; }
    else if (dateFilter === 'yesterday') { const y=new Date(now); y.setDate(y.getDate()-1); const s=getStartOfDay(y), e=getEndOfDay(y); matchesDate = activityTime>=s && activityTime<=e; }
    else if (dateFilter === 'last7') { const d=new Date(now); d.setDate(d.getDate()-7); matchesDate = activityTime>=getStartOfDay(d) && activityTime<=getEndOfDay(now); }
    else if (dateFilter === 'last30') { const d=new Date(now); d.setDate(d.getDate()-30); matchesDate = activityTime>=getStartOfDay(d) && activityTime<=getEndOfDay(now); }
    else if (dateFilter === 'custom') { const s=customStartDate?getStartOfDay(new Date(customStartDate)):0; const e=customEndDate?getEndOfDay(new Date(customEndDate)):Infinity; matchesDate = activityTime>=s && activityTime<=e; }
    return matchesDate;
  });

  const selectedCartIndex = selectedCart ? filteredCarts.findIndex(c => c.id === selectedCart.id) : -1;

  const handlePrevCart = () => {
    if (selectedCartIndex > 0) {
      setSelectedCartId(filteredCarts[selectedCartIndex - 1].id);
    }
  };

  const stats = {
    total: dateFilteredCarts.length + carts.filter(c => c.orderPlaced).length,
    pending: dateFilteredCarts.filter(c => !c.emailSent).length,
    emailed: dateFilteredCarts.filter(c => c.emailSent).length,
    recovered: carts.filter(c => c.orderPlaced).length,
    totalValue: dateFilteredCarts.reduce((s, c) => s + c.subtotal, 0) + carts.filter(c => c.orderPlaced).reduce((s, c) => s + c.subtotal, 0),
    recoveredValue: carts.filter(c => c.orderPlaced).reduce((s, c) => s + c.subtotal, 0),
  };

  const handleNextCart = () => {
    if (selectedCartIndex >= 0 && selectedCartIndex < filteredCarts.length - 1) {
      setSelectedCartId(filteredCarts[selectedCartIndex + 1].id);
    }
  };

  const handleCopyDetails = (cart: AbandonedCart) => {
    const itemsText = cart.items.map(item => {
      const variantParts = [];
      if (item.selectedVariant?.color) variantParts.push(item.selectedVariant.color);
      if (item.selectedVariant?.size) variantParts.push(item.selectedVariant.size);
      const variantStr = variantParts.length ? ` (${variantParts.join(', ')})` : '';
      return `• ${item.product.name}${variantStr} x${item.quantity} = ${formatPrice(item.price * item.quantity)}`;
    }).join('\n');

    const addressParts = [
      cart.customerAddress,
      cart.customerApartment,
      cart.customerCity,
      cart.customerPostalCode
    ].filter(Boolean).join(', ');

    const fullText = [
      `Abandoned Cart: ${cart.id}`,
      `Customer: ${cart.customerName || 'Anonymous Shopper'}`,
      `Phone: ${cart.customerPhone || 'N/A'}`,
      `Email: ${cart.customerEmail || 'N/A'}`,
      `Address: ${addressParts || 'N/A'}`,
      `Last Activity: ${new Date(cart.lastActivity).toLocaleString()}`,
      `Status: ${cart.orderPlaced ? 'RECOVERED' : cart.emailSent ? 'EMAIL SENT' : 'PENDING'}`,
      `\nItems:\n${itemsText}`,
      `\nTotal: ${formatPrice(cart.subtotal)}`,
    ].join('\n');

    navigator.clipboard.writeText(fullText);
    setCopiedId(cart.id);
    toast.success('Cart details copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadgeStyles = (cart: AbandonedCart) => {
    if (cart.orderPlaced) {
      return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50';
    }
    if (cart.emailSent) {
      return 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50';
    }
    return 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50';
  };


  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <ShoppingCart className="h-6 w-6 text-[#e94560]" />
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Abandoned Carts</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mt-0.5">Track and recover shoppers who left items in their cart</p>
          </div>
        </div>
        <button
          onClick={fetchCarts}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#16162a] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-bold transition-all disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Carts', value: stats.total, icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/30' },
          { label: 'Pending recovery', value: stats.pending, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30' },
          { label: 'Recovered Carts', value: stats.recovered, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30' },
          { label: 'Unrecovered Value', value: formatPrice(stats.totalValue - stats.recoveredValue), icon: DollarSign, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/30' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-xs transition-colors">
              <div className={`inline-flex p-2.5 rounded-xl border ${stat.bg} mb-3`}>
                <Icon className={`h-4.5 w-4.5 ${stat.color}`} />
              </div>
              <div className="text-xl font-black text-gray-900 dark:text-white">{stat.value}</div>
              <div className="text-xs text-gray-400 dark:text-gray-500 font-bold mt-1 uppercase tracking-wider">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Recovery Rate Bar */}
      {stats.total > 0 && (
        <div className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-xs space-y-3 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <TrendingUp className="h-4.5 w-4.5 text-emerald-500" />
              Recovery Revenue Conversion Rate
            </span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
              {stats.total > 0 ? Math.round((stats.recovered / stats.total) * 100) : 0}%
            </span>
          </div>
          <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 bg-linear-to-r from-emerald-400 to-emerald-600 rounded-full transition-all"
              style={{ width: `${stats.total > 0 ? (stats.recovered / stats.total) * 100 : 0}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-gray-400 dark:text-gray-500 font-bold">
            <span>Recovered Value: {formatPrice(stats.recoveredValue)}</span>
            <span>Total Lost Value: {formatPrice(stats.totalValue)}</span>
          </div>
        </div>
      )}

      {/* Filters & Search Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by customer, phone, email or session ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#16162a] text-xs font-semibold focus:outline-none focus:border-[#e94560] text-gray-900 dark:text-white transition-colors"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Date filter */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-1 flex-1 sm:flex-initial">
              <Calendar className="h-4 w-4 text-gray-400" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-transparent border-0 text-xs font-bold focus:outline-none text-gray-900 dark:text-white cursor-pointer py-1.5"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last7">Last 7 Days</option>
                <option value="last30">Last 30 Days</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Status Tabs/Select */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#16162a] px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#e94560] text-gray-900 dark:text-white cursor-pointer transition-colors flex-1 sm:flex-initial"
            >
              <option value="all">Active Carts ({stats.total - stats.recovered})</option>
              <option value="pending">Pending ({stats.pending})</option>
              <option value="emailed">Email Sent ({stats.emailed})</option>
            </select>
          </div>
        </div>

        {/* Custom Date Inputs */}
        {dateFilter === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 p-3.5 bg-gray-50 dark:bg-white/3 rounded-2xl border border-gray-200 dark:border-gray-800 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400">Start Date:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#16162a] px-3 py-1.5 text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400">End Date:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#16162a] px-3 py-1.5 text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
              />
            </div>
            <button
              onClick={() => { setCustomStartDate(''); setCustomEndDate(''); }}
              className="text-xs text-red-500 font-bold hover:underline ml-auto"
            >
              Clear Custom Range
            </button>
          </div>
        )}
      </div>

      {/* Main Table View - desktop / Cards - mobile */}
      <div className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden transition-colors">
        {loading ? (
          <div className="p-8 space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredCarts.length === 0 ? (
          <div className="py-16 text-center">
            <ShoppingCart className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-semibold">No matching abandoned carts found</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Carts will appear here when checkout is started but not completed</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-700 dark:text-gray-300">
                  <thead className="text-xs font-bold text-gray-400 uppercase bg-gray-50/50 dark:bg-white/5 border-b border-gray-100 dark:border-gray-800">
                    <tr>
                      <th className="py-4 px-6">Cart ID / Session</th>
                      <th className="py-4 px-6">Customer Info</th>
                      <th className="py-4 px-6">Items Left in Cart</th>
                      <th className="py-4 px-6">Subtotal</th>
                      <th className="py-4 px-6">Recovery Status</th>
                      <th className="py-4 px-6">Last Activity</th>
                      <th className="py-4 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80">
                    {filteredCarts.map(cart => (
                      <tr 
                        key={cart.id} 
                        onClick={() => setSelectedCartId(cart.id)}
                        className="hover:bg-gray-50/50 dark:hover:bg-white/3 transition-all align-top cursor-pointer"
                      >
                        {/* Session/Cart ID */}
                        <td className="py-4 px-6 font-bold text-[#1a1a2e] dark:text-white max-w-[150px] truncate">
                          {cart.customerName ? `Cart of ${cart.customerName}` : cart.sessionId.replace('cs_', '')}
                        </td>

                        {/* Customer Info */}
                        <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                          <p className="font-bold text-[#1a1a2e] dark:text-white">{cart.customerName || 'Anonymous'}</p>
                          {cart.customerPhone && (
                            <a 
                              href={`https://wa.me/${cart.customerPhone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-[#10b981] hover:underline font-semibold flex items-center gap-1 mt-0.5"
                            >
                              <span>{cart.customerPhone}</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          {cart.customerEmail && (
                            <span className="text-xs text-gray-400 dark:text-gray-500 font-semibold block">{cart.customerEmail}</span>
                          )}
                        </td>

                        {/* Items left */}
                        <td className="py-4 px-6 max-w-xs">
                          <div className="space-y-1">
                            {cart.items.map((item, idx) => {
                              const variantParts = [];
                              if (item.selectedVariant?.color) variantParts.push(item.selectedVariant.color);
                              if (item.selectedVariant?.size) variantParts.push(item.selectedVariant.size);
                              const variantStr = variantParts.length ? ` (${variantParts.join(', ')})` : '';
                              return (
                                <div key={idx} className="text-xs font-semibold text-gray-600 dark:text-gray-400 line-clamp-1">
                                  • {item.product?.name || 'Product'}{variantStr} x{item.quantity}
                                </div>
                              );
                            })}
                          </div>
                        </td>

                        {/* Subtotal */}
                        <td className="py-4 px-6 font-bold text-[#1a1a2e] dark:text-white">
                          {formatPrice(cart.subtotal)}
                        </td>

                        {/* Status badge */}
                        <td className="py-4 px-6">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border ${getStatusBadgeStyles(cart)}`}>
                            {cart.orderPlaced ? 'Recovered' : cart.emailSent ? 'Email Sent' : 'Pending'}
                          </span>
                        </td>

                        {/* Last Activity */}
                        <td className="py-4 px-6 text-xs text-gray-500 dark:text-gray-400 font-medium">
                          {new Date(cart.lastActivity).toLocaleDateString()}<br />
                          <span className="text-gray-400 dark:text-gray-500 font-semibold">{timeAgo(cart.lastActivity)}</span>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleDelete(cart.id, e)}
                            disabled={deleting === cart.id}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                            title="Delete cart record"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3 p-4">
              {filteredCarts.map(cart => (
                <div
                  key={cart.id}
                  onClick={() => setSelectedCartId(cart.id)}
                  className="bg-white dark:bg-[#16162a] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-2.5 cursor-pointer transition-colors active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-[#1a1a2e] dark:text-white truncate">{cart.customerName || 'Anonymous'}</p>
                      {cart.customerPhone && <p className="text-[10px] text-[#10b981] font-semibold mt-0.5">{cart.customerPhone}</p>}
                      {cart.customerEmail && <p className="text-[10px] text-gray-400 font-semibold">{cart.customerEmail}</p>}
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-sm font-black text-[#1a1a2e] dark:text-white">{formatPrice(cart.subtotal)}</p>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase border ${getStatusBadgeStyles(cart)}`}>
                        {cart.orderPlaced ? 'Recovered' : cart.emailSent ? 'Email Sent' : 'Pending'}
                      </span>
                    </div>
                  </div>
                  <div className="text-[10px] text-gray-400 font-semibold">
                    {cart.items.length} item{cart.items.length !== 1 ? 's' : ''} in cart
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800/60">
                    <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                      <Calendar className="h-3 w-3" />
                      <span>{timeAgo(cart.lastActivity)}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(cart.id, e); }}
                      disabled={deleting === cart.id}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                      title="Delete cart"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Right Slide-over Abandoned Cart Details Drawer */}
      {selectedCart && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-xs z-45 transition-opacity animate-fade-in"
            onClick={() => setSelectedCartId(null)}
          />

          {/* Drawer Panel */}
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-4xl bg-gray-50 dark:bg-[#0f0f1e] shadow-2xl z-50 flex flex-col border-l border-gray-200 dark:border-gray-800 transition-transform duration-300 translate-x-0 overflow-hidden">
            
            {/* Header */}
            <div className="px-6 py-4 bg-white dark:bg-[#16162a] border-b border-gray-200 dark:border-gray-800/80 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedCartId(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-black text-gray-900 dark:text-white">
                      Cart Detail
                    </h2>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${getStatusBadgeStyles(selectedCart)}`}>
                      {selectedCart.orderPlaced ? 'Recovered' : selectedCart.emailSent ? 'Emailed' : 'Pending'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mt-0.5">
                    Created: {new Date(selectedCart.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Header Navigation & Action Panel */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyDetails(selectedCart)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#16162a] text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {copiedId === selectedCart.id ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Cart Info</span>
                    </>
                  )}
                </button>

                <div className="h-6 w-[1px] bg-gray-200 dark:bg-gray-800 mx-1" />

                <button
                  onClick={handlePrevCart}
                  disabled={selectedCartIndex <= 0}
                  className="p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#16162a] text-gray-550 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Previous Cart"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={handleNextCart}
                  disabled={selectedCartIndex < 0 || selectedCartIndex >= filteredCarts.length - 1}
                  className="p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#16162a] text-gray-550 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Next Cart"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 overscroll-contain">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left/Main Column - Items & Totals (2 columns) */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Items Card */}
                  <div className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800/80 flex items-center gap-2">
                      <Package className="h-4.5 w-4.5 text-gray-400" />
                      <h3 className="text-sm font-black text-gray-900 dark:text-white">
                        Items Left in Cart ({selectedCart.items.length})
                      </h3>
                    </div>
                    
                    <div className="divide-y divide-gray-100 dark:divide-gray-800/60 px-5">
                      {selectedCart.items.map((item, idx) => {
                        const variantParts = [];
                        if (item.selectedVariant?.color) variantParts.push(item.selectedVariant.color);
                        if (item.selectedVariant?.size) variantParts.push(item.selectedVariant.size);
                        const variantStr = variantParts.join(', ');
                        
                        const imgUrl = item.product?.images?.[0]?.url || '';

                        return (
                          <div key={idx} className="py-4 flex gap-4 items-start animate-fade-in">
                            {/* Product Thumbnail */}
                            <div className="h-14 w-14 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 overflow-hidden flex-shrink-0 relative">
                              {imgUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={imgUrl}
                                  alt={item.product?.name || 'Product'}
                                  className="absolute inset-0 w-full h-full object-cover"
                                />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                  <ShoppingBag className="h-6 w-6" />
                                </div>
                              )}
                            </div>

                            {/* Item details */}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                {item.product?.name || 'Product'}
                              </h4>
                              {variantStr && (
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold mt-0.5">
                                  {variantStr}
                                </p>
                              )}
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-semibold">
                                {formatPrice(item.price || item.product?.price || 0)} × {item.quantity}
                              </p>
                            </div>

                            {/* Line Total */}
                            <div className="text-right">
                              <span className="text-xs font-black text-gray-900 dark:text-white">
                                {formatPrice((item.price || item.product?.price || 0) * item.quantity)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Pricing / Value Summary */}
                  <div className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs p-5 space-y-3">
                    <h3 className="text-sm font-black text-gray-900 dark:text-white pb-2 border-b border-gray-100 dark:border-gray-800/80">
                      Cart Value Summary
                    </h3>
                    
                    <div className="space-y-2.5 text-xs font-semibold text-gray-600 dark:text-gray-400">
                      <div className="flex justify-between">
                        <span>Cart Subtotal</span>
                        <span className="text-gray-900 dark:text-white font-bold">
                          {formatPrice(selectedCart.subtotal)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Currency Context</span>
                        <span className="text-gray-900 dark:text-white font-bold">{selectedCart.currency}</span>
                      </div>
                      <div className="h-[1px] bg-gray-100 dark:bg-gray-800/80 my-1" />
                      <div className="flex justify-between text-sm font-black text-gray-900 dark:text-white">
                        <span>Total Estimated Value</span>
                        <span>{formatPrice(selectedCart.subtotal)}</span>
                      </div>
                    </div>
                  </div>

                  {/* History & Recovery Log */}
                  <div className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs p-5 space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-800/80">
                      <Clock className="h-4.5 w-4.5 text-gray-400" />
                      <h3 className="text-sm font-black text-gray-900 dark:text-white">
                        Activity & Recovery Timeline
                      </h3>
                    </div>

                    <div className="flow-root pl-2">
                      <ul className="space-y-4">
                        <li className="relative flex space-x-3 items-start">
                          <span className="h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0">
                            <ShoppingCart className="h-3 w-3" />
                          </span>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <p className="text-xs font-bold text-gray-800 dark:text-gray-200">Cart Created</p>
                            <p className="text-[10px] text-gray-400 mt-0.5 font-semibold">{new Date(selectedCart.createdAt).toLocaleString()}</p>
                          </div>
                        </li>

                        <li className="relative flex space-x-3 items-start">
                          <span className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${selectedCart.emailSent ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                            <Mail className="h-3 w-3" />
                          </span>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                              {selectedCart.emailSent ? 'Recovery Email Dispatched' : 'Recovery Email Pending'}
                            </p>
                            {selectedCart.emailSentAt && (
                              <p className="text-[10px] text-gray-400 mt-0.5 font-semibold">{new Date(selectedCart.emailSentAt).toLocaleString()}</p>
                            )}
                          </div>
                        </li>

                        <li className="relative flex space-x-3 items-start">
                          <span className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${selectedCart.orderPlaced ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                            <CheckCircle2 className="h-3 w-3" />
                          </span>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                              {selectedCart.orderPlaced ? 'Cart Recovered (Order Placed)' : 'Not Yet Recovered'}
                            </p>
                            {selectedCart.recoveredAt && (
                              <p className="text-[10px] text-gray-400 mt-0.5 font-semibold">{new Date(selectedCart.recoveredAt).toLocaleString()}</p>
                            )}
                            {selectedCart.orderId && (
                              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-bold">
                                Order ID: {selectedCart.orderId}
                              </p>
                            )}
                          </div>
                        </li>
                      </ul>
                    </div>
                  </div>

                </div>

                {/* Right Column - Customer Info & Address (1 column) */}
                <div className="space-y-6">
                  
                  {/* Action Pane */}
                  <div className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs p-5 space-y-4">
                    <h3 className="text-sm font-black text-gray-900 dark:text-white pb-3 border-b border-gray-100 dark:border-gray-800/80">
                      Record Actions
                    </h3>
                    <button
                      onClick={() => handleDelete(selectedCart.id)}
                      disabled={deleting === selectedCart.id}
                      className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer border-none"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete Cart Record</span>
                    </button>
                  </div>

                  {/* Customer & Shipping Address details */}
                  <div className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs p-5 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800/80">
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4.5 w-4.5 text-gray-400" />
                        <h3 className="text-sm font-black text-gray-900 dark:text-white">Customer Details</h3>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30">
                        Active Shopper
                      </span>
                    </div>
                    
                    <div className="space-y-4 text-xs font-semibold">
                      {/* Name */}
                      <div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Name</div>
                        <div className="text-xs font-black text-gray-900 dark:text-white mt-1">
                          {selectedCart.customerName || 'Anonymous Shopper'}
                        </div>
                      </div>
                      
                      {/* Contact & WhatsApp */}
                      {selectedCart.customerPhone && (
                        <div>
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contact Phone</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-gray-800 dark:text-gray-200 font-bold">{selectedCart.customerPhone}</span>
                            <a 
                              href={`https://wa.me/${selectedCart.customerPhone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-0.5 ml-1"
                            >
                              <span>WhatsApp</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Email */}
                      {selectedCart.customerEmail && (
                        <div>
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Email Address</div>
                          <div className="text-xs font-black text-gray-900 dark:text-white mt-1 truncate">
                            {selectedCart.customerEmail}
                          </div>
                        </div>
                      )}

                      {/* Complete Address Mapped exactly like orders tab */}
                      <div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Complete Shipping Address</div>
                        <div className="mt-1.5 p-3.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-150 dark:border-gray-800 rounded-xl text-gray-700 dark:text-gray-300 leading-relaxed font-bold break-words whitespace-pre-wrap">
                          {(() => {
                            const addressParts = [
                              selectedCart.customerAddress ? `Address: ${selectedCart.customerAddress}` : '',
                              selectedCart.customerApartment ? `Apt/Suite: ${selectedCart.customerApartment}` : '',
                              selectedCart.customerCity ? `City: ${selectedCart.customerCity}` : '',
                              selectedCart.customerPostalCode ? `Postal: ${selectedCart.customerPostalCode}` : '',
                              selectedCart.customerPhone ? `Phone: ${selectedCart.customerPhone}` : '',
                              selectedCart.customerEmail ? `Contact: ${selectedCart.customerEmail}` : '',
                            ].filter(Boolean);
                            return addressParts.length > 0 
                              ? addressParts.join('\n') 
                              : 'No address details entered by shopper yet.';
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
