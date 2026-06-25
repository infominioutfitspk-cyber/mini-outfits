'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  ClipboardList,
  Clock,
  Save,
  RefreshCw,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Trash2
} from '@/components/common/Icons';
import { Order, StoreSettings, StatusLogItem } from '@/lib/types';
import { updateOrderStatus, updateOrderDetails } from '@/lib/services/orders';
import { formatPrice, cleanWhatsAppPhone } from '@/lib/utils/whatsapp';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface OrderLogProps {
  initialOrders: Order[];
  settings: StoreSettings;
}

export default function OrderLog({ initialOrders, settings }: OrderLogProps) {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync initialOrders if props change
  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success('Orders refreshed');
    }, 1000);
  };
  // Realtime subscription for orders

  const orderStats = {
    total: orders.length,
    pending: orders.filter(o => ['pending', 'placed'].includes(o.status)).length,
    completed: orders.filter(o => o.status === 'delivered').length,
    revenue: orders.filter(o => o.status !== 'cancelled' && o.status !== 'refunded').reduce((sum, o) => sum + o.total, 0),
  };

  useEffect(() => {
    const supabase = createClient();
    
    const mapOrderRow = (row: any): Order => ({
      id: row.id,
      orderNumber: row.order_number,
      customerName: row.customer_name || undefined,
      customerPhone: row.customer_phone || undefined,
      customerId: row.customer_id || undefined,
      items: (row.items || []) as any[],
      subtotal: row.subtotal ? parseFloat(row.subtotal.toString()) : 0,
      total: row.total ? parseFloat(row.total.toString()) : 0,
      status: row.status as Order['status'],
      notes: row.notes || undefined,
      staffNotes: row.staff_notes || undefined,
      statusLogs: (row.status_logs || []) as StatusLogItem[],
      reviewEmailPending: row.review_email_pending ?? false,
      deliveredAt: row.delivered_at || undefined,
      trackingNumber: row.tracking_number || undefined,
      courierName: row.courier_name || undefined,
      trackingUrl: row.tracking_url || undefined,
      cancelReason: row.cancel_reason || undefined,
      refundAmount: row.refund_amount ? parseFloat(row.refund_amount.toString()) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });

    const channel = supabase
      .channel('orders-log-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newOrder = mapOrderRow(payload.new);
            setOrders(prev => {
              if (prev.some(o => o.id === newOrder.id)) return prev;
              return [newOrder, ...prev];
            });
            toast.info(`New Order received: ${newOrder.orderNumber}`);
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = mapOrderRow(payload.new);
            setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
          } else if (payload.eventType === 'DELETE') {
            setOrders(prev => prev.filter(o => o.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [staffNoteInput, setStaffNoteInput] = useState('');

  // Status and details edit states
  const [editStatus, setEditStatus] = useState<Order['status']>('pending');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [courierName, setCourierName] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [refundAmount, setRefundAmount] = useState('');

  const selectedOrder = orders.find(o => o.id === selectedOrderId);

  // Sync edit states when selected order changes
  useEffect(() => {
    if (selectedOrder) {
      setStaffNoteInput(selectedOrder.staffNotes || '');
      setEditStatus(selectedOrder.status);
      setTrackingNumber(selectedOrder.trackingNumber || '');
      setCourierName(selectedOrder.courierName || '');
      setTrackingUrl(selectedOrder.trackingUrl || '');
      setCancelReason(selectedOrder.cancelReason || '');
      setRefundAmount(selectedOrder.refundAmount?.toString() || '');
    } else {
      setStaffNoteInput('');
    }
  }, [selectedOrderId, selectedOrder]);

  const handleStatusChange = async (id: string, status: Order['status']) => {
    try {
      const updated = await updateOrderStatus(id, status);
      setOrders(prev => prev.map(o => o.id === id ? updated : o));
      toast.success(`Order ${updated.orderNumber} status updated to ${status}`);
    } catch (err) {
      toast.error('Failed to update order status');
    }
  };

  const handleSaveStatusAndDetails = async () => {
    if (!selectedOrder) return;
    try {
      // 1. Prepare status logs if status changed
      const oldStatus = selectedOrder.status;
      let updatedLogs = [...(selectedOrder.statusLogs || [])] as StatusLogItem[];
      
      if (oldStatus !== editStatus) {
        const logEntry: StatusLogItem = {
          id: Math.random().toString(36).substring(2, 9),
          type: 'status_change',
          message: `Order status changed from ${oldStatus.toUpperCase()} to ${editStatus.toUpperCase()}`,
          status: editStatus,
          createdAt: new Date().toISOString()
        };
        updatedLogs.push(logEntry);
      }

      // 2. Call updateOrderDetails with all status fields
      const updated = await updateOrderDetails(selectedOrder.id, {
        status: editStatus,
        statusLogs: updatedLogs,
        trackingNumber: ['shipped', 'out_for_delivery'].includes(editStatus) ? trackingNumber : undefined,
        courierName: ['shipped', 'out_for_delivery'].includes(editStatus) ? courierName : undefined,
        trackingUrl: ['shipped', 'out_for_delivery'].includes(editStatus) ? trackingUrl : undefined,
        cancelReason: editStatus === 'cancelled' ? cancelReason : undefined,
        refundAmount: editStatus === 'refunded' ? (parseFloat(refundAmount) || 0) : undefined,
        deliveredAt: editStatus === 'delivered' ? new Date().toISOString() : undefined,
      });

      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? updated : o));
      toast.success(`Order ${updated.orderNumber} details updated successfully!`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update order details');
    }
  };

  const handleMoveToTrash = async (id: string) => {
    if (!confirm('Are you sure you want to move this order to Trash?')) return;
    try {
      const { deleteOrder } = await import('@/lib/services/orders');
      await deleteOrder(id);
      setOrders(prev => prev.filter(o => o.id !== id));
      setSelectedOrderId(null);
      toast.success('Order moved to Trash');
    } catch (err) {
      toast.error('Failed to move order to Trash');
    }
  };

  const handleSaveStaffNote = async (id: string, notesText: string) => {
    try {
      const order = orders.find(o => o.id === id);
      if (!order) return;

      const logEntry: StatusLogItem = {
        id: Math.random().toString(36).substring(2, 9),
        type: 'staff_note',
        message: notesText.trim() ? 'Staff note added/updated' : 'Staff note cleared',
        notes: notesText,
        createdAt: new Date().toISOString()
      };
      
      const updatedLogs = [...(order.statusLogs || []), logEntry];
      const updated = await updateOrderDetails(id, {
        staffNotes: notesText,
        statusLogs: updatedLogs
      });
      
      setOrders(prev => prev.map(o => o.id === id ? updated : o));
      toast.success('Staff note saved successfully');
    } catch (err) {
      toast.error('Failed to save staff note');
    }
  };

  const filteredOrders = orders.filter(o => {
    // 1. Status Filter
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    
    // 2. Search Filter
    const matchesSearch = 
      (o.orderNumber && o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.customerName && o.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.customerPhone && o.customerPhone.toLowerCase().includes(searchQuery.toLowerCase()));

    // 3. Date Filter
    const orderDate = new Date(o.createdAt);
    const orderTime = orderDate.getTime();
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
      matchesDate = orderTime >= start && orderTime <= end;
    } else if (dateFilter === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const start = getStartOfDay(yesterday);
      const end = getEndOfDay(yesterday);
      matchesDate = orderTime >= start && orderTime <= end;
    } else if (dateFilter === 'tomorrow') {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const start = getStartOfDay(tomorrow);
      const end = getEndOfDay(tomorrow);
      matchesDate = orderTime >= start && orderTime <= end;
    } else if (dateFilter === 'last7') {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      matchesDate = orderTime >= getStartOfDay(sevenDaysAgo) && orderTime <= getEndOfDay(now);
    } else if (dateFilter === 'last30') {
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      matchesDate = orderTime >= getStartOfDay(thirtyDaysAgo) && orderTime <= getEndOfDay(now);
    } else if (dateFilter === 'custom') {
      const start = customStartDate ? getStartOfDay(new Date(customStartDate)) : 0;
      const end = customEndDate ? getEndOfDay(new Date(customEndDate)) : Infinity;
      matchesDate = orderTime >= start && orderTime <= end;
    }

    return matchesStatus && matchesSearch && matchesDate;
  });

  const selectedOrderIndex = selectedOrder ? filteredOrders.findIndex(o => o.id === selectedOrder.id) : -1;

  const handlePrevOrder = () => {
    if (selectedOrderIndex > 0) {
      setSelectedOrderId(filteredOrders[selectedOrderIndex - 1].id);
    }
  };

  const handleNextOrder = () => {
    if (selectedOrderIndex >= 0 && selectedOrderIndex < filteredOrders.length - 1) {
      setSelectedOrderId(filteredOrders[selectedOrderIndex + 1].id);
    }
  };

  const handleCopyDetails = (order: Order) => {
    const itemsText = order.items.map(item => {
      const variantParts = [];
      if (item.selectedVariant?.color) variantParts.push(item.selectedVariant.color);
      if (item.selectedVariant?.size) variantParts.push(item.selectedVariant.size);
      const variantStr = variantParts.length ? ` (${variantParts.join(', ')})` : '';
      return `• ${item.product.name}${variantStr} x${item.quantity} = ${formatPrice(item.total, settings.currencySymbol)}`;
    }).join('\n');

    const fullText = [
      `Order: ${order.orderNumber}`,
      `Customer: ${order.customerName || 'N/A'}`,
      `Phone: ${order.customerPhone || 'N/A'}`,
       `Date: ${new Date(order.createdAt).toLocaleString('en-GB')}`,
      `Status: ${order.status.toUpperCase()}`,
      `\nItems:\n${itemsText}`,
      `\nTotal: ${formatPrice(order.total, settings.currencySymbol)}`,
      order.notes ? `\nNotes/Address: ${order.notes}` : ''
    ].join('\n');

    navigator.clipboard.writeText(fullText);
    setCopiedId(order.id);
    toast.success('Order details copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadgeStyles = (status: Order['status']) => {
    switch (status) {
      case 'delivered':
        return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50';
      case 'pending':
        return 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50';
      case 'cancelled':
        return 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50';
      case 'shipped':
        return 'bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900/50';
      default:
        return 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50';
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <ClipboardList className="h-6 w-6 text-[#e94560]" />
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">WhatsApp Order Log</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mt-0.5">Track and update orders clicked by customers on WhatsApp</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#16162a] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-bold transition-all disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', value: orderStats.total, icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/30' },
          { label: 'Pending Orders', value: orderStats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30' },
          { label: 'Completed Orders', value: orderStats.completed, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30' },
          { label: 'Total Revenue', value: formatPrice(orderStats.revenue, settings.currencySymbol), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30' },
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

      {/* Fulfillment Rate Bar */}
      {orderStats.total > 0 && (
        <div className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-xs space-y-3 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <TrendingUp className="h-4.5 w-4.5 text-emerald-500" />
              Order Fulfillment Conversion Rate
            </span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
              {Math.round((orderStats.completed / orderStats.total) * 100)}%
            </span>
          </div>
          <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 bg-linear-to-r from-emerald-400 to-emerald-600 rounded-full transition-all"
              style={{ width: `${Math.round((orderStats.completed / orderStats.total) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-gray-400 dark:text-gray-550 font-bold">
            <span>Fulfilled Value: {formatPrice(orders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0), settings.currencySymbol)}</span>
            <span>Total Revenue (Active): {formatPrice(orderStats.revenue, settings.currencySymbol)}</span>
          </div>
        </div>
      )}

      {/* Search & Filter Header (Shopify jesa) */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by order no, customer or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#16162a] text-xs font-semibold focus:outline-none focus:border-[#e94560] text-gray-900 dark:text-white transition-colors"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Shopify-like Date Range Filter */}
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
                <option value="tomorrow">Tomorrow</option>
                <option value="last7">Last 7 Days</option>
                <option value="last30">Last 30 Days</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#16162a] px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#e94560] text-gray-900 dark:text-white cursor-pointer transition-colors flex-1 sm:flex-initial"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Custom date range inputs */}
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

      {/* Orders Table - desktop / Cards - mobile */}
      {filteredOrders.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-500">
          No orders logged in database matching criteria.
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden transition-colors">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-700 dark:text-gray-300">
                <thead className="text-xs font-bold text-gray-400 uppercase bg-gray-50/50 dark:bg-white/5 border-b border-gray-100 dark:border-gray-800">
                  <tr>
                    <th className="py-3 px-4 md:py-4 md:px-6">Order</th>
                    <th className="py-3 px-4 md:py-4 md:px-6">Customer</th>
                    <th className="py-3 px-4 md:py-4 md:px-6 hidden md:table-cell">Items</th>
                    <th className="py-3 px-4 md:py-4 md:px-6">Total</th>
                    <th className="py-3 px-4 md:py-4 md:px-6">Status</th>
                    <th className="py-3 px-4 md:py-4 md:px-6 hidden md:table-cell">Note</th>
                    <th className="py-3 px-4 md:py-4 md:px-6 hidden md:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80">{filteredOrders.map(order => (
                    <tr 
                      key={order.id} 
                      onClick={() => setSelectedOrderId(order.id)}
                      className="hover:bg-gray-50/50 dark:hover:bg-white/3 transition-all align-top cursor-pointer"
                    >
                      <td className="py-3 px-4 md:py-4 md:px-6 font-bold text-[#1a1a2e] dark:text-white whitespace-nowrap text-xs md:text-sm">{order.orderNumber}</td>
                      <td className="py-3 px-4 md:py-4 md:px-6" onClick={(e) => e.stopPropagation()}>
                        <p className="font-bold text-[#1a1a2e] dark:text-white text-xs md:text-sm truncate max-w-[120px] md:max-w-none">{order.customerName || 'N/A'}</p>
                        <a 
                          href={`https://wa.me/${cleanWhatsAppPhone(order.customerPhone)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] md:text-xs text-[#10b981] hover:underline font-semibold flex items-center gap-1 mt-0.5"
                        >
                          <span className="truncate max-w-[100px] md:max-w-none">{order.customerPhone || 'N/A'}</span>
                          <ExternalLink className="h-2.5 w-2.5 md:h-3 md:w-3" />
                        </a>
                      </td>
                      <td className="py-3 px-4 md:py-4 md:px-6 max-w-xs hidden md:table-cell">
                        <div className="space-y-1">
                          {order.items.map((item, idx) => {
                            const variantParts = [];
                            if (item.selectedVariant?.color) variantParts.push(item.selectedVariant.color);
                            if (item.selectedVariant?.size) variantParts.push(item.selectedVariant.size);
                            const variantStr = variantParts.length ? ` (${variantParts.join(', ')})` : '';
                            return (
                              <div key={idx} className="text-xs font-semibold text-gray-600 dark:text-gray-400 line-clamp-1">
                                • {item.product.name}{variantStr} x{item.quantity}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4 md:py-4 md:px-6 font-bold text-[#1a1a2e] dark:text-white text-xs md:text-sm whitespace-nowrap">{formatPrice(order.total, settings.currencySymbol)}</td>
                      <td className="py-3 px-4 md:py-4 md:px-6" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value as Order['status'])}
                          className={`rounded-lg border px-2 py-1 text-xs font-bold uppercase focus:outline-none cursor-pointer transition-colors ${
                            order.status === 'delivered' ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400' :
                            ['pending', 'placed'].includes(order.status) ? 'border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400' :
                            order.status === 'cancelled' ? 'border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400' :
                            ['shipped', 'out_for_delivery'].includes(order.status) ? 'border-purple-200 dark:border-purple-900/50 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400' :
                            order.status === 'refunded' ? 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20 text-gray-550 dark:text-gray-400' :
                            'border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400'
                          }`}
                        >
                          <option value="pending">Pending</option>
                          <option value="placed">Placed</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="out_for_delivery">Out For Delivery</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="refunded">Refunded</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 md:py-4 md:px-6 max-w-xs text-xs font-semibold text-gray-500 dark:text-gray-400 truncate hidden md:table-cell">
                        {order.staffNotes || '—'}
                      </td>
                      <td className="py-3 px-4 md:py-4 md:px-6 text-xs text-gray-500 dark:text-gray-400 font-medium hidden md:table-cell">
                        {new Date(order.createdAt).toLocaleDateString('en-GB')}<br />
                        <span className="text-gray-400 dark:text-gray-500">{new Date(order.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredOrders.map(order => (
              <div
                key={order.id}
                onClick={() => setSelectedOrderId(order.id)}
                className="bg-white dark:bg-[#16162a] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-2.5 cursor-pointer transition-colors active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-[#1a1a2e] dark:text-white">{order.orderNumber}</span>
                  <span className="text-sm font-black text-[#1a1a2e] dark:text-white">{formatPrice(order.total, settings.currencySymbol)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{order.customerName || 'Guest'}</p>
                    {order.customerPhone && (
                      <a
                        href={`https://wa.me/${cleanWhatsAppPhone(order.customerPhone)}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] text-[#10b981] font-semibold flex items-center gap-1 mt-0.5"
                      >
                        {order.customerPhone}
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 font-semibold flex-shrink-0 ml-2">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800/60">
                  <select
                    value={order.status}
                    onChange={(e) => { e.stopPropagation(); handleStatusChange(order.id, e.target.value as Order['status']); }}
                    onClick={(e) => e.stopPropagation()}
                    className={`text-[10px] font-bold uppercase rounded-lg border px-2 py-1 cursor-pointer focus:outline-none ${
                      order.status === 'delivered' ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400' :
                      ['pending', 'placed'].includes(order.status) ? 'border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400' :
                      order.status === 'cancelled' ? 'border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400' :
                      ['shipped', 'out_for_delivery'].includes(order.status) ? 'border-purple-200 dark:border-purple-900/50 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400' :
                      order.status === 'refunded' ? 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20 text-gray-550 dark:text-gray-400' :
                      'border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400'
                    }`}
                  >
                    <option value="pending">Pending</option>
                    <option value="placed">Placed</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="out_for_delivery">Out For Delivery</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="refunded">Refunded</option>
                  </select>
                  <span className="text-[10px] text-gray-400 font-medium">{new Date(order.createdAt).toLocaleDateString('en-GB')}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Shopify-like Right Slide-over Order Details Panel */}
      {selectedOrder && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 transition-opacity animate-fade-in"
            onClick={() => setSelectedOrderId(null)}
          />

          {/* Slide-over Content Drawer */}
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-4xl bg-gray-50 dark:bg-[#0f0f1e] shadow-2xl z-50 flex flex-col border-l border-gray-200 dark:border-gray-800 transition-transform duration-300 translate-x-0 overflow-x-hidden">
            
            {/* Header - compact on mobile */}
            <div className="px-4 md:px-6 py-3 md:py-4 bg-white dark:bg-[#16162a] border-b border-gray-200 dark:border-gray-800/80 flex-shrink-0">
              <div className="flex items-start justify-between gap-2">
                {/* Left: Close + Order Info */}
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <button
                    onClick={() => setSelectedOrderId(null)}
                    className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-white transition-colors flex-shrink-0 mt-0.5"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h2 className="text-sm md:text-lg font-black text-gray-900 dark:text-white truncate">
                        {selectedOrder.orderNumber}
                      </h2>
                      <span className={`text-[9px] md:text-[10px] font-bold px-1.5 md:px-2 py-0.5 rounded-full uppercase border flex-shrink-0 ${getStatusBadgeStyles(selectedOrder.status)}`}>
                        {selectedOrder.status}
                      </span>
                    </div>
                    <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-semibold mt-0.5">
                      {new Date(selectedOrder.createdAt).toLocaleString('en-GB')}
                    </p>
                  </div>
                </div>

                {/* Right: Actions - moved below on mobile, inline on desktop */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleCopyDetails(selectedOrder)}
                    className="flex items-center gap-1 px-2.5 md:px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#16162a] text-[10px] md:text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    {copiedId === selectedOrder.id ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-500" />
                        <span className="hidden md:inline">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span className="hidden md:inline">Copy</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={handlePrevOrder}
                      disabled={selectedOrderIndex <= 0}
                      className="p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#16162a] text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      title="Previous Order"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={handleNextOrder}
                      disabled={selectedOrderIndex < 0 || selectedOrderIndex >= filteredOrders.length - 1}
                      className="p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#16162a] text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      title="Next Order"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 overscroll-contain">
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left/Main Column - Order Items & Totals (2 Cols) */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Items Card */}
                  <div className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs overflow-hidden">
                    <div className="px-4 md:px-5 py-3 md:py-4 border-b border-gray-100 dark:border-gray-800/80 flex items-center gap-2">
                      <Package className="h-4 w-4 text-gray-400" />
                      <h3 className="text-xs md:text-sm font-black text-gray-900 dark:text-white">
                        Items Purchased ({selectedOrder.items.length})
                      </h3>
                    </div>
                    
                    <div className="divide-y divide-gray-100 dark:divide-gray-800/60 px-4 md:px-5">
                      {selectedOrder.items.map((item, idx) => {
                        const variantParts = [];
                        if (item.selectedVariant?.color) variantParts.push(item.selectedVariant.color);
                        if (item.selectedVariant?.size) variantParts.push(item.selectedVariant.size);
                        const variantStr = variantParts.join(', ');
                        
                        const imgUrl = item.product.images?.find((i: any) => i.isPrimary)?.url || item.product.images?.[0]?.url || '';

                        return (
                          <div key={idx} className="py-3 md:py-4 flex gap-3 md:gap-4 items-start">
                            {/* Product Thumbnail */}
                            <div className="h-10 w-10 md:h-14 md:w-14 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 overflow-hidden flex-shrink-0 relative">
                              {imgUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={imgUrl}
                                  alt={item.product.name}
                                  className="absolute inset-0 w-full h-full object-cover"
                                />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                  <ShoppingBag className="h-4 w-4 md:h-6 md:w-6" />
                                </div>
                              )}
                            </div>

                            {/* Item details */}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-[11px] md:text-xs font-bold text-gray-900 dark:text-white truncate">
                                {item.product.name}
                              </h4>
                              {variantStr && (
                                <p className="text-[9px] md:text-[10px] text-gray-500 dark:text-gray-400 font-bold mt-0.5">
                                  {variantStr}
                                </p>
                              )}
                              {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                                <p className="text-[8px] md:text-[9px] text-gray-400 dark:text-gray-500 font-semibold mt-0.5">
                                  + {item.selectedModifiers.map(m => m.name).join(', ')}
                                </p>
                              )}
                              <p className="text-[10px] md:text-xs text-gray-400 dark:text-gray-500 mt-1 font-semibold">
                                {formatPrice(item.unitPrice, settings.currencySymbol)} × {item.quantity}
                              </p>
                            </div>

                            {/* Total per Item */}
                            <div className="text-right flex-shrink-0">
                              <span className="text-[11px] md:text-xs font-black text-gray-900 dark:text-white">
                                {formatPrice(item.total, settings.currencySymbol)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Payment / Summary Card */}
                  <div className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs p-4 md:p-5 space-y-3 md:space-y-4">
                    <h3 className="text-xs md:text-sm font-black text-gray-900 dark:text-white pb-3 border-b border-gray-100 dark:border-gray-800/80">
                      Payment Summary
                    </h3>
                    
                    <div className="space-y-2 text-[11px] md:text-xs font-semibold text-gray-600 dark:text-gray-400">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span className="text-gray-900 dark:text-white font-bold">
                          {formatPrice(selectedOrder.subtotal || selectedOrder.total, settings.currencySymbol)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Shipping</span>
                        <span className="text-[#10b981] font-bold">Free Shipping</span>
                      </div>
                      <div className="h-[1px] bg-gray-100 dark:bg-gray-800/80 my-1" />
                      <div className="flex justify-between text-sm font-black text-gray-900 dark:text-white">
                        <span>Total</span>
                        <span>{formatPrice(selectedOrder.total, settings.currencySymbol)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Timeline History log (Shopify jesa) */}
                  <div className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs p-4 md:p-5 space-y-3 md:space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-800/80">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <h3 className="text-xs md:text-sm font-black text-gray-900 dark:text-white">
                        Order History Timeline
                      </h3>
                    </div>

                    <div className="flow-root pl-2">
                      <ul className="-mb-8">
                        {(!selectedOrder.statusLogs || selectedOrder.statusLogs.length === 0) ? (
                          <li className="text-xs text-gray-400 py-4 text-center">No timeline logs recorded for this order.</li>
                        ) : (
                          [...selectedOrder.statusLogs].reverse().map((log, logIdx) => (
                            <li key={log.id || logIdx}>
                              <div className="relative pb-8">
                                {logIdx !== selectedOrder.statusLogs!.length - 1 ? (
                                  <span
                                    className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-800"
                                    aria-hidden="true"
                                  />
                                ) : null}
                                <div className="relative flex space-x-3 items-start">
                                  <div>
                                    <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white dark:ring-[#16162a] ${
                                      log.type === 'creation' ? 'bg-blue-500 text-white' :
                                      log.type === 'status_change' ? 'bg-amber-500 text-white' :
                                      'bg-purple-500 text-white'
                                    }`}>
                                      {log.type === 'creation' ? <Package className="h-3.5 w-3.5" /> :
                                       log.type === 'status_change' ? <ClipboardList className="h-3.5 w-3.5" /> :
                                       <UserIcon className="h-3.5 w-3.5" />}
                                    </span>
                                  </div>
                                  <div className="flex-1 min-w-0 pt-1">
                                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                      {log.message}
                                    </p>
                                    {log.notes && (
                                      <div className="mt-2 text-xs font-semibold text-gray-600 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-150 dark:border-gray-800 rounded-xl leading-relaxed whitespace-pre-wrap">
                                        {log.notes}
                                      </div>
                                    )}
                                    <div className="text-[10px] text-gray-400 mt-1 font-semibold">
                                      {new Date(log.createdAt).toLocaleString('en-GB')}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  </div>

                </div>

                {/* Right Column - Customer Info & Actions (1 Col) */}
                <div className="space-y-6">
                  
                  {/* Status Manager */}
                  <div className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs p-4 md:p-5 space-y-3 md:space-y-4">
                    <h3 className="text-xs md:text-sm font-black text-gray-900 dark:text-white pb-3 border-b border-gray-100 dark:border-gray-800/80">
                      Order Actions
                    </h3>
                    <div className="space-y-3 md:space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1.5">
                          Update Status
                        </label>
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value as Order['status'])}
                          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#16162a] px-3.5 py-2.5 text-xs font-bold uppercase focus:outline-none text-gray-900 dark:text-white cursor-pointer"
                        >
                          <option value="pending">Pending</option>
                          <option value="placed">Placed</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="out_for_delivery">Out For Delivery</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="refunded">Refunded</option>
                        </select>
                      </div>

                      {/* Shipped/Out for Delivery fields */}
                      {['shipped', 'out_for_delivery'].includes(editStatus) && (
                        <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800/60">
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Tracking Number</label>
                            <input
                              type="text"
                              value={trackingNumber}
                              onChange={(e) => setTrackingNumber(e.target.value)}
                              placeholder="e.g. TCS12345"
                              className="w-full rounded-xl border border-gray-200 dark:border-gray-750 bg-white dark:bg-[#16162a] px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#e94560] text-gray-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Courier Name</label>
                            <input
                              type="text"
                              value={courierName}
                              onChange={(e) => setCourierName(e.target.value)}
                              placeholder="e.g. TCS Courier"
                              className="w-full rounded-xl border border-gray-200 dark:border-gray-750 bg-white dark:bg-[#16162a] px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#e94560] text-gray-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Tracking URL</label>
                            <input
                              type="text"
                              value={trackingUrl}
                              onChange={(e) => setTrackingUrl(e.target.value)}
                              placeholder="e.g. https://tcs.com.pk/..."
                              className="w-full rounded-xl border border-gray-200 dark:border-gray-750 bg-white dark:bg-[#16162a] px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#e94560] text-gray-900 dark:text-white"
                            />
                          </div>
                        </div>
                      )}

                      {/* Cancel reason field */}
                      {editStatus === 'cancelled' && (
                        <div className="pt-2 border-t border-gray-100 dark:border-gray-800/60">
                          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Cancellation Reason</label>
                          <input
                            type="text"
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="e.g. Out of stock"
                            className="w-full rounded-xl border border-gray-200 dark:border-gray-750 bg-white dark:bg-[#16162a] px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#e94560] text-gray-900 dark:text-white"
                          />
                        </div>
                      )}

                      {/* Refund amount field */}
                      {editStatus === 'refunded' && (
                        <div className="pt-2 border-t border-gray-100 dark:border-gray-800/60">
                          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Refund Amount ({settings.currencySymbol})</label>
                          <input
                            type="number"
                            value={refundAmount}
                            onChange={(e) => setRefundAmount(e.target.value)}
                            placeholder="e.g. 1500"
                            className="w-full rounded-xl border border-gray-200 dark:border-gray-750 bg-white dark:bg-[#16162a] px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#e94560] text-gray-900 dark:text-white"
                          />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleSaveStatusAndDetails}
                        className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#1a1a2e] hover:bg-[#e94560] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                      >
                        <Save className="h-4 w-4" />
                        <span>Update Status & Details</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMoveToTrash(selectedOrder.id)}
                        className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold rounded-xl transition-colors cursor-pointer mt-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Move to Trash</span>
                      </button>
                    </div>
                  </div>

                  {/* Customer Info Card (Shopify Details) */}
                  <div className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs p-4 md:p-5 space-y-3 md:space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800/80">
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-gray-400" />
                        <h3 className="text-xs md:text-sm font-black text-gray-900 dark:text-white">Customer Details</h3>
                      </div>
                      <span className="hidden md:inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30">
                        Active Customer
                      </span>
                    </div>
                    
                    <div className="space-y-4 text-xs font-semibold">
                      {/* Name */}
                      <div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Name</div>
                        <div className="text-xs font-black text-gray-900 dark:text-white mt-1">
                          {selectedOrder.customerName || 'Guest Customer'}
                        </div>
                      </div>
                      
                      {/* Contact & WhatsApp */}
                      {selectedOrder.customerPhone && (
                        <div>
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contact Phone</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-gray-800 dark:text-gray-200 font-bold">{selectedOrder.customerPhone}</span>
                            <a 
                             href={`https://wa.me/${cleanWhatsAppPhone(selectedOrder.customerPhone)}`}
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

                      {/* Complete Address Mapped */}
                      <div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Complete Shipping Address</div>
                        <div className="mt-1.5 p-3.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-150 dark:border-gray-800 rounded-xl text-gray-700 dark:text-gray-300 leading-relaxed font-bold break-words whitespace-pre-wrap">
                          {selectedOrder.notes || 'No shipping address specified in order notes.'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Staff Notes Widget (Team save) */}
                  <div className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs p-4 md:p-5 space-y-3 md:space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-800/80">
                      <ClipboardList className="h-4.5 w-4.5 text-gray-400" />
                      <h3 className="text-sm font-black text-gray-900 dark:text-white">
                        Staff Note (Internal)
                      </h3>
                    </div>
                    
                    <div className="space-y-3">
                      <textarea
                        value={staffNoteInput}
                        onChange={(e) => setStaffNoteInput(e.target.value)}
                        placeholder="Add internal notes for team processing..."
                        rows={4}
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-850 bg-white dark:bg-[#16162a] p-3 text-xs font-semibold focus:outline-none focus:border-[#e94560] text-gray-900 dark:text-white transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveStaffNote(selectedOrder.id, staffNoteInput)}
                        className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#1a1a2e] hover:bg-[#e94560] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                      >
                        <Save className="h-4 w-4" />
                        <span>Save Note for Team</span>
                      </button>
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
