'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Image from 'next/image';
import { 
  Users, Search, Phone, Mail, MessageSquare, 
  TrendingUp, DollarSign, ShoppingBag, Calendar, 
  ChevronDown, ChevronUp, Package, MapPin, Truck, X, Trash2
} from '@/components/common/Icons';
import { getAdminCustomers } from '@/lib/services/customers';
import { getWhatsAppSubscribers } from '@/lib/services/sections';
import { getOrdersByCustomerId } from '@/lib/services/orders';
import { Order, WhatsAppSubscriber } from '@/lib/types';
import { formatPrice, cleanWhatsAppPhone } from '@/lib/utils/whatsapp';
import { toast } from 'sonner';
import { useAdminTab } from '@/lib/hooks/useAdminTab';

interface CustomerRecord {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
  ordersCount: number;
  totalSpent: number;
}

function AdminCustomersPageInner() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [leads, setLeads] = useState<WhatsAppSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useAdminTab<'buyers' | 'leads'>('buyers');

  // Customer Orders Modal state
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [buyersData, leadsData] = await Promise.all([
          getAdminCustomers(),
          getWhatsAppSubscribers()
        ]);
        setCustomers(buyersData);
        setLeads(leadsData);
      } catch (err) {
        console.error('Failed to load data:', err);
        toast.error('Failed to load customer or leads data.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleViewOrders = async (customer: CustomerRecord) => {
    setSelectedCustomer(customer);
    setCustomerOrders([]);
    setExpandedOrderId(null);
    setOrdersLoading(true);
    try {
      const orders = await getOrdersByCustomerId(customer.id);
      setCustomerOrders(orders);
    } catch {
      toast.error('Failed to load orders for this customer.');
    } finally {
      setOrdersLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedCustomer(null);
    setCustomerOrders([]);
    setExpandedOrderId(null);
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm('Are you sure you want to move this customer to Trash?')) return;
    try {
      const { deleteCustomer } = await import('@/lib/services/customers');
      await deleteCustomer(id);
      setCustomers(prev => prev.filter(c => c.id !== id));
      toast.success('Customer moved to Trash');
    } catch {
      toast.error('Failed to move customer to Trash');
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm('Are you sure you want to move this WhatsApp lead to Trash?')) return;
    try {
      const { deleteWhatsAppSubscriber } = await import('@/lib/services/sections');
      await deleteWhatsAppSubscriber(id);
      setLeads(prev => prev.filter(l => l.id !== id));
      toast.success('WhatsApp lead moved to Trash');
    } catch {
      toast.error('Failed to move WhatsApp lead to Trash');
    }
  };

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(c => 
      c.name.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.toLowerCase().includes(q))
    );
  }, [customers, searchQuery]);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return leads;
    return leads.filter(l => 
      (l.name || '').toLowerCase().includes(q) ||
      (l.phone || '').toLowerCase().includes(q)
    );
  }, [leads, searchQuery]);

  const stats = useMemo(() => {
    const total = customers.length;
    const totalSpent = customers.reduce((sum, c) => sum + c.totalSpent, 0);
    const avgSpent = total > 0 ? totalSpent / total : 0;
    const totalOrders = customers.reduce((sum, c) => sum + c.ordersCount, 0);
    return { total, totalSpent, avgSpent, totalOrders };
  }, [customers]);

  const getCleanPhone = (phone: string | null) => {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending':    return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900/30';
      case 'confirmed':  return 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-900/30';
      case 'shipped':    return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/30';
      case 'delivered':  return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/30';
      case 'cancelled':  return 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/30';
      default:           return 'bg-gray-100 text-gray-800 dark:bg-gray-800/40 dark:text-gray-300 border border-gray-200 dark:border-gray-700/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white">Customers Directory</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Manage and contact your e-store customers</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, phone, email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#16162a] text-xs font-semibold text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#e94560] focus:outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#16162a] p-5 rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Total Customers</span>
            <span className="text-xl font-black text-gray-950 dark:text-white">{stats.total}</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
        </div>
        <div className="bg-white dark:bg-[#16162a] p-5 rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">LTV Revenue</span>
            <span className="text-xl font-black text-gray-950 dark:text-white">{formatPrice(stats.totalSpent)}</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>
        <div className="bg-white dark:bg-[#16162a] p-5 rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Avg Spent / User</span>
            <span className="text-xl font-black text-gray-950 dark:text-white">{formatPrice(stats.avgSpent)}</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>
        <div className="bg-white dark:bg-[#16162a] p-5 rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Total Orders</span>
            <span className="text-xl font-black text-gray-950 dark:text-white">{stats.totalOrders}</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <ShoppingBag className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800">
        <button type="button" onClick={() => setActiveTab('buyers')}
          className={`pb-3 px-4 font-bold text-xs uppercase tracking-wider transition-all border-b-2 cursor-pointer ${activeTab === 'buyers' ? 'border-[#e94560] text-[#e94560]' : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
          Registered Buyers ({customers.length})
        </button>
        <button type="button" onClick={() => setActiveTab('leads')}
          className={`pb-3 px-4 font-bold text-xs uppercase tracking-wider transition-all border-b-2 cursor-pointer ${activeTab === 'leads' ? 'border-[#e94560] text-[#e94560]' : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
          WhatsApp Leads ({leads.length})
        </button>
      </div>

      {/* Main List Panel */}
      <div className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 divide-y divide-gray-100 dark:divide-gray-800 animate-pulse space-y-4">
            {[1, 2, 3, 4].map(idx => (
              <div key={idx} className="flex justify-between items-center py-4 first:pt-0 last:pb-0">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/4" />
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/3" />
                </div>
                <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded w-20" />
              </div>
            ))}
          </div>
        ) : activeTab === 'buyers' ? (
          filteredCustomers.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <div className="h-12 w-12 rounded-xl bg-gray-50 dark:bg-[#0f0f1b] border border-gray-100 dark:border-gray-800 mx-auto flex items-center justify-center text-gray-300 dark:text-gray-600">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">No customers found</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs mx-auto mt-1">
                  {searchQuery ? 'Adjust your search query and try again.' : 'Registered customer profiles will appear here.'}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/10 text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      <th className="py-4 px-6">Customer Info</th>
                      <th className="py-4 px-6">Joined</th>
                      <th className="py-4 px-6 text-center">Orders</th>
                      <th className="py-4 px-6 text-right">Lifetime Spent</th>
                      <th className="py-4 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80 text-xs font-semibold text-gray-700 dark:text-gray-300">{filteredCustomers.map(customer => {
                      const joinDate = new Date(customer.createdAt).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });
                      return (
                        <tr key={customer.id} className="hover:bg-gray-50/30 dark:hover:bg-white/5 transition-colors">
                          <td className="py-4 px-6">
                            <div className="font-bold text-gray-950 dark:text-white text-sm">{customer.name}</div>
                            <div className="flex flex-col gap-0.5 mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                              {customer.email && <span>{customer.email}</span>}
                              {customer.phone && <span>{customer.phone}</span>}
                            </div>
                          </td>
                          <td className="py-4 px-6 font-medium text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-gray-400" />
                              <span>{joinDate}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center font-bold text-gray-900 dark:text-white">
                            {customer.ordersCount}
                          </td>
                          <td className="py-4 px-6 text-right font-black text-gray-950 dark:text-white">
                            {formatPrice(customer.totalSpent)}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center justify-center gap-2">
                              {/* View Orders */}
                              <button
                                type="button"
                                onClick={() => handleViewOrders(customer)}
                                className="h-8 w-8 rounded-lg bg-[#e94560]/10 text-[#e94560] hover:bg-[#e94560] hover:text-white flex items-center justify-center transition-all cursor-pointer"
                                title="View Orders"
                              >
                                <ShoppingBag className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomer(customer.id)}
                                className="h-8 w-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                                title="Move Customer to Trash"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                              {customer.phone ? (
                                <a href={`https://wa.me/${cleanWhatsAppPhone(customer.phone)}`} target="_blank" rel="noopener noreferrer"
                                  className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                                  title="Chat on WhatsApp">
                                  <MessageSquare className="h-4 w-4" />
                                </a>
                              ) : (
                                <div className="h-8 w-8 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-300 dark:text-gray-700 flex items-center justify-center cursor-not-allowed">
                                  <MessageSquare className="h-4 w-4" />
                                </div>
                              )}
                              {customer.phone ? (
                                <a href={`tel:${getCleanPhone(customer.phone)}`}
                                  className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                                  title="Call">
                                  <Phone className="h-4 w-4" />
                                </a>
                              ) : (
                                <div className="h-8 w-8 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-300 dark:text-gray-700 flex items-center justify-center cursor-not-allowed">
                                  <Phone className="h-4 w-4" />
                                </div>
                              )}
                              {customer.email ? (
                                <a href={`mailto:${customer.email}`}
                                  className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-600 hover:bg-purple-500 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                                  title="Send Email">
                                  <Mail className="h-4 w-4" />
                                </a>
                              ) : (
                                <div className="h-8 w-8 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-300 dark:text-gray-700 flex items-center justify-center cursor-not-allowed">
                                  <Mail className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
                {filteredCustomers.map(customer => {
                  const joinDate = new Date(customer.createdAt).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });
                  return (
                    <div key={customer.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-black text-gray-950 dark:text-white truncate">{customer.name}</h3>
                          <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 space-y-0.5">
                            {customer.email && <p className="truncate">{customer.email}</p>}
                            {customer.phone && <p>{customer.phone}</p>}
                          </div>
                        </div>
                        <span className="text-xs font-black text-gray-950 dark:text-white flex-shrink-0 ml-2">{formatPrice(customer.totalSpent)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 font-semibold">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{joinDate}</span>
                        </div>
                        <span>{customer.ordersCount} order{customer.ordersCount !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800/60">
                        <button
                          type="button"
                          onClick={() => handleViewOrders(customer)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#e94560]/10 text-[#e94560] hover:bg-[#e94560] hover:text-white text-[10px] font-bold transition-all cursor-pointer"
                        >
                          <ShoppingBag className="h-3.5 w-3.5" /> Orders
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomer(customer.id)}
                          className="px-3 py-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white text-[10px] font-bold transition-all cursor-pointer"
                          title="Move to Trash"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        {customer.phone ? (
                          <a href={`https://wa.me/${cleanWhatsAppPhone(customer.phone)}`} target="_blank" rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white text-[10px] font-bold transition-all">
                            <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
                          </a>
                        ) : (
                          <div className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-300 dark:text-gray-700 text-[10px] font-bold cursor-not-allowed">
                            <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
                          </div>
                        )}
                        {customer.email ? (
                          <a href={`mailto:${customer.email}`}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-500/10 text-purple-600 hover:bg-purple-500 hover:text-white text-[10px] font-bold transition-all">
                            <Mail className="h-3.5 w-3.5" /> Email
                          </a>
                        ) : (
                          <div className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-300 dark:text-gray-700 text-[10px] font-bold cursor-not-allowed">
                            <Mail className="h-3.5 w-3.5" /> Email
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )
        ) : (
          filteredLeads.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <div className="h-12 w-12 rounded-xl bg-gray-50 dark:bg-[#0f0f1b] border border-gray-100 dark:border-gray-800 mx-auto flex items-center justify-center text-gray-300 dark:text-gray-600">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">No WhatsApp leads found</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs mx-auto mt-1">
                  {searchQuery ? 'Adjust your search query and try again.' : 'Subscribers from the spin wheel and exit popups will appear here.'}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop Leads Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/10 text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      <th className="py-4 px-6">Name</th>
                      <th className="py-4 px-6">WhatsApp Phone</th>
                      <th className="py-4 px-6">Joined Date</th>
                      <th className="py-4 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80 text-xs font-semibold text-gray-700 dark:text-gray-300">{filteredLeads.map(lead => {
                      const optInDate = lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
                      return (
                        <tr key={lead.id} className="hover:bg-gray-50/30 dark:hover:bg-white/5 transition-colors">
                          <td className="py-4 px-6 font-bold text-gray-900 dark:text-white">{lead.name || 'Anonymous Guest'}</td>
                          <td className="py-4 px-6 text-gray-600 dark:text-gray-400 font-mono">{lead.phone}</td>
                          <td className="py-4 px-6 font-medium text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-gray-400" />
                              <span>{optInDate}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center justify-center gap-2">
                              <a href={`https://wa.me/${cleanWhatsAppPhone(lead.phone)}`} target="_blank" rel="noopener noreferrer"
                                className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                                title="Chat on WhatsApp">
                                <MessageSquare className="h-4 w-4" />
                              </a>
                              <a href={`tel:${getCleanPhone(lead.phone)}`}
                                className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                                title="Call Lead">
                                <Phone className="h-4 w-4" />
                              </a>
                              <button
                                type="button"
                                onClick={() => handleDeleteLead(lead.id)}
                                className="h-8 w-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                                title="Move Lead to Trash"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Leads Cards */}
              <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
                {filteredLeads.map(lead => {
                  const optInDate = lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';
                  return (
                    <div key={lead.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-black text-gray-900 dark:text-white truncate">{lead.name || 'Anonymous Guest'}</h3>
                          <p className="text-xs font-mono text-gray-600 dark:text-gray-400 mt-0.5">{lead.phone}</p>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400 font-semibold flex-shrink-0 ml-2">
                          <Calendar className="h-3 w-3" />
                          <span>{optInDate}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800/60">
                        <a href={`https://wa.me/${cleanWhatsAppPhone(lead.phone)}`} target="_blank" rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white text-[10px] font-bold transition-all">
                          <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
                        </a>
                        <a href={`tel:${getCleanPhone(lead.phone)}`}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/10 text-blue-600 hover:bg-blue-500 hover:text-white text-[10px] font-bold transition-all">
                          <Phone className="h-3.5 w-3.5" /> Call
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDeleteLead(lead.id)}
                          className="px-3 py-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white text-[10px] font-bold transition-all cursor-pointer"
                          title="Move to Trash"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )
        )}
      </div>

      {/* =================== CUSTOMER ORDERS MODAL =================== */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />

          {/* Modal Panel */}
          <div className="relative w-full sm:max-w-2xl max-h-[92dvh] sm:max-h-[85vh] flex flex-col bg-gray-50 dark:bg-[#0f0f1b] sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex-shrink-0 px-5 pt-5 pb-4 bg-white dark:bg-[#16162a] border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-[#e94560]" />
                  {selectedCustomer.name}&apos;s Orders
                </h2>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {selectedCustomer.phone || selectedCustomer.email || ''} · {selectedCustomer.ordersCount} order{selectedCustomer.ordersCount !== 1 ? 's' : ''} · {formatPrice(selectedCustomer.totalSpent)} lifetime
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3">
              {ordersLoading ? (
                <div className="space-y-3 animate-pulse py-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white dark:bg-[#16162a] rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-gray-800" />
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/3" />
                          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/4" />
                        </div>
                        <div className="h-5 w-16 bg-gray-100 dark:bg-gray-800 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : customerOrders.length === 0 ? (
                <div className="py-16 text-center space-y-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 mx-auto">
                    <Package className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">No orders found</h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">This customer has not placed any orders yet.</p>
                  </div>
                </div>
              ) : (
                customerOrders.map(order => {
                  const isExpanded = expandedOrderId === order.id;
                  const itemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
                  const orderDate = new Date(order.createdAt).toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' });

                  return (
                    <div key={order.id} className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-sm overflow-hidden transition-all duration-200">
                      {/* Order Summary Row */}
                      <div
                        onClick={() => setExpandedOrderId(prev => prev === order.id ? null : order.id)}
                        className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-xl bg-gray-50 dark:bg-[#0f0f1b] border border-gray-100 dark:border-gray-800 flex items-center justify-center text-gray-400 flex-shrink-0">
                            <Package className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-gray-900 dark:text-white text-sm">{order.orderNumber}</span>
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${getStatusColor(order.status)}`}>
                                {order.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-semibold mt-0.5">
                              <Calendar className="h-3 w-3" />
                              <span>{orderDate}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right">
                            <div className="text-[10px] text-gray-400 font-semibold">{itemsCount} item{itemsCount !== 1 ? 's' : ''}</div>
                            <div className="text-sm font-black text-gray-950 dark:text-white">{formatPrice(order.total)}</div>
                          </div>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                        </div>
                      </div>

                      {/* Order Details (expanded) */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-gray-800/60 bg-gray-50/20 dark:bg-[#16162a]/10 space-y-4">
                          {/* Items */}
                          <div className="space-y-2">
                            <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Ordered Items</h4>
                            <div className="divide-y divide-gray-100 dark:divide-gray-800/50">
                              {order.items.map((item, idx) => {
                                const img = item.product.images?.find((i: { isPrimary?: boolean; url: string }) => i.isPrimary)?.url || item.product.images?.[0]?.url || '';
                                const parts = [];
                                if (item.selectedVariant?.color) parts.push(item.selectedVariant.color);
                                if (item.selectedVariant?.size) parts.push(item.selectedVariant.size);
                                const variantStr = parts.join(' · ');

                                return (
                                  <div key={idx} className="py-3 flex items-center gap-3 first:pt-0 last:pb-0">
                                    <div className="relative h-12 w-12 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden shrink-0 bg-gray-50 dark:bg-[#0f0f1b]">
                                      {img ? (
                                        <Image src={img} alt={item.product.name} fill sizes="48px" className="object-cover" unoptimized />
                                      ) : (
                                        <div className="flex h-full w-full items-center justify-center"><Package className="h-5 w-5 text-gray-300" /></div>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h5 className="font-bold text-gray-900 dark:text-white text-xs truncate">{item.product.name}</h5>
                                      {variantStr && <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{variantStr}</p>}
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      <div className="text-[10px] text-gray-400 font-semibold">Qty {item.quantity}</div>
                                      <div className="text-xs font-bold text-gray-900 dark:text-white mt-0.5">{formatPrice(item.unitPrice * item.quantity)}</div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Delivery + Summary */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-gray-100 dark:border-gray-800/60">
                            {order.notes && (
                              <div className="space-y-1.5 text-xs">
                                <h4 className="font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 text-[10px] flex items-center gap-1.5">
                                  <MapPin className="h-3.5 w-3.5" /> Delivery Address
                                </h4>
                                <div className="bg-gray-50 dark:bg-[#0f0f1b]/50 border border-gray-100 dark:border-gray-800/80 rounded-xl p-3 text-gray-600 dark:text-gray-300 font-semibold leading-relaxed whitespace-pre-line">
                                  {order.notes}
                                </div>
                              </div>
                            )}
                            <div className="space-y-2 text-xs">
                              <h4 className="font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 text-[10px] flex items-center gap-1.5">
                                <Truck className="h-3.5 w-3.5" /> Order Summary
                              </h4>
                              <div className="bg-gray-50 dark:bg-[#0f0f1b]/50 border border-gray-100 dark:border-gray-800/80 rounded-xl p-3.5 space-y-2 text-gray-500 dark:text-gray-400 font-semibold">
                                <div className="flex justify-between">
                                  <span>Subtotal</span>
                                  <span className="font-bold text-gray-950 dark:text-white">{formatPrice(order.subtotal)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Delivery / Shipping</span>
                                  <span className="font-bold text-gray-950 dark:text-white">Included</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-800 text-sm font-black text-gray-900 dark:text-white">
                                  <span>Total Paid</span>
                                  <span>{formatPrice(order.total)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminCustomersPage() {
  return (
    <Suspense>
      <AdminCustomersPageInner />
    </Suspense>
  );
}
