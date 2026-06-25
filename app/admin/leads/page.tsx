'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { 
  Search, Phone, Mail, MessageSquare, Calendar, Users, 
  Zap, Copy, ExternalLink, SlidersHorizontal, Clock, ArrowUpRight,
  Trash2
} from '@/components/common/Icons';
import { getWhatsAppSubscribers, getEmailSubscribers } from '@/lib/services/sections';
import { WhatsAppSubscriber, EmailSubscriber } from '@/lib/types';
import { toast } from 'sonner';
import { cleanWhatsAppPhone } from '@/lib/utils/whatsapp';
import { useAdminTab } from '@/lib/hooks/useAdminTab';

type ActiveTab = 'whatsapp' | 'email';

function AdminLeadsPageInner() {
  const [leads, setLeads] = useState<WhatsAppSubscriber[]>([]);
  const [emailSubs, setEmailSubs] = useState<EmailSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useAdminTab<ActiveTab>('whatsapp');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month'>('today');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'wheel' | 'exit_intent'>('all');

  useEffect(() => {
    async function loadLeads() {
      try {
        setLoading(true);
        const [waData, emailData] = await Promise.all([
          getWhatsAppSubscribers(),
          getEmailSubscribers(),
        ]);
        setLeads(waData);
        setEmailSubs(emailData);
      } catch (err) {
        console.error('Failed to load leads:', err);
        toast.error('Failed to load leads.');
      } finally {
        setLoading(false);
      }
    }
    loadLeads();
  }, []);

  // Filtered WhatsApp Leads
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        (lead.name || '').toLowerCase().includes(q) ||
        (lead.phone || '').toLowerCase().includes(q) ||
        (lead.email || '').toLowerCase().includes(q);
      if (!matchesSearch) return false;

      const matchedSource = sourceFilter === 'all' || 
        (lead.source_type || 'wheel') === sourceFilter;
      if (!matchedSource) return false;

      if (timeFilter === 'all') return true;
      if (!lead.created_at) return false;
      const leadDate = new Date(lead.created_at);
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      if (timeFilter === 'today') return leadDate >= startOfToday;
      if (timeFilter === 'yesterday') return leadDate >= startOfYesterday && leadDate < startOfToday;
      if (timeFilter === 'week') return leadDate >= sevenDaysAgo;
      if (timeFilter === 'month') return leadDate >= thirtyDaysAgo;
      return true;
    });
  }, [leads, searchQuery, sourceFilter, timeFilter]);

  // Filtered Email Subscribers
  const filteredEmailSubs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return emailSubs.filter(sub => {
      if (!q) return true;
      return sub.email.toLowerCase().includes(q);
    });
  }, [emailSubs, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let todayCount = 0;
    let wheelCount = 0;
    let exitCount = 0;
    leads.forEach(l => {
      if (l.created_at && new Date(l.created_at) >= startOfToday) todayCount++;
      if ((l.source_type || 'wheel') === 'wheel') wheelCount++;
      else if (l.source_type === 'exit_intent') exitCount++;
    });
    return { total: leads.length, today: todayCount, wheel: wheelCount, exit: exitCount };
  }, [leads]);

  const getCleanPhone = (phone: string) => phone.replace(/\D/g, '');

  const handleCopyLead = (lead: WhatsAppSubscriber) => {
    const text = `Name: ${lead.name || 'N/A'}\nPhone: ${lead.phone}\nEmail: ${lead.email || 'N/A'}\nSource: ${lead.source_type || 'wheel'}`;
    navigator.clipboard.writeText(text);
    toast.success('Lead details copied!');
  };

  const handleCopyEmail = (sub: EmailSubscriber) => {
    navigator.clipboard.writeText(sub.email);
    toast.success('Email copied!');
  };

  const handleDeleteWhatsAppLead = async (id: string) => {
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

  const handleDeleteEmailSub = async (id: string) => {
    if (!confirm('Are you sure you want to move this email subscriber to Trash?')) return;
    try {
      const { deleteEmailSubscriber } = await import('@/lib/services/sections');
      await deleteEmailSubscriber(id);
      setEmailSubs(prev => prev.filter(s => s.id !== id));
      toast.success('Email subscriber moved to Trash');
    } catch {
      toast.error('Failed to move email subscriber to Trash');
    }
  };

  const getWhatsAppURL = (lead: WhatsAppSubscriber) => {
    const phone = cleanWhatsAppPhone(lead.phone);
    const greeting = lead.name ? `Dear ${lead.name}` : 'Hello';
    const message = `${greeting}, thank you for subscribing at Zaynah's E-Store! We noticed you claimed a special coupon on our store. Let us know if you need any assistance placing your order.`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Search */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white">Leads & Subscribers</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            WhatsApp leads from Spin Wheel / Exit Intent + Newsletter email subscribers
          </p>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#16162a] p-5 rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">WhatsApp Leads</span>
            <span className="text-xl font-black text-gray-950 dark:text-white">{stats.total}</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <MessageSquare className="h-5 w-5" />
          </div>
        </div>
        <div className="bg-white dark:bg-[#16162a] p-5 rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Newsletter Subs</span>
            <span className="text-xl font-black text-gray-950 dark:text-white">{emailSubs.length}</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
            <Mail className="h-5 w-5" />
          </div>
        </div>
        <div className="bg-white dark:bg-[#16162a] p-5 rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Spin Wheel</span>
            <span className="text-xl font-black text-gray-950 dark:text-white">{stats.wheel}</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Zap className="h-5 w-5" />
          </div>
        </div>
        <div className="bg-white dark:bg-[#16162a] p-5 rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Exit-Intent</span>
            <span className="text-xl font-black text-gray-950 dark:text-white">{stats.exit}</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
            <ArrowUpRight className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-[#0f0f1b] p-1 rounded-xl w-full sm:w-fit">
        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'whatsapp' ? 'bg-white dark:bg-[#16162a] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          WhatsApp Leads ({leads.length})
        </button>
        <button
          onClick={() => setActiveTab('email')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'email' ? 'bg-white dark:bg-[#16162a] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
        >
          <Mail className="h-3.5 w-3.5" />
          Newsletter ({emailSubs.length})
        </button>
      </div>

      {/* WhatsApp Leads Tab */}
      {activeTab === 'whatsapp' && (
        <>
          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-[#16162a] p-4 rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filters:</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['all', 'today', 'yesterday', 'week', 'month'] as const).map(t => (
                <button key={t} onClick={() => setTimeFilter(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${timeFilter === t ? 'bg-[#e94560] text-white' : 'bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300'}`}>
                  {t === 'all' ? 'All Time' : t === 'today' ? 'Today' : t === 'yesterday' ? 'Yesterday' : t === 'week' ? 'Last 7 Days' : 'Last 30 Days'}
                </button>
              ))}
            </div>
            <div className="h-6 w-px bg-gray-200 dark:bg-gray-800 hidden sm:block" />
            <div className="flex items-center gap-1.5">
              {(['all', 'wheel', 'exit_intent'] as const).map(s => (
                <button key={s} onClick={() => setSourceFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${sourceFilter === s ? 'bg-[#1a1a2e] dark:bg-amber-600 text-white' : 'bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300'}`}>
                  {s === 'all' ? 'All Sources' : s === 'wheel' ? 'Spin Wheel' : 'Exit Popup'}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-6 animate-pulse space-y-4">
                {[1, 2, 3].map(idx => (
                  <div key={idx} className="flex justify-between items-center py-4">
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/4" />
                      <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/3" />
                    </div>
                    <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded w-24" />
                  </div>
                ))}
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="p-16 text-center space-y-3">
                <div className="h-12 w-12 rounded-xl bg-gray-50 dark:bg-[#0f0f1b] border border-gray-100 dark:border-gray-800 mx-auto flex items-center justify-center text-gray-300 dark:text-gray-600">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">No subscriber leads found</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs mx-auto">
                  {searchQuery || sourceFilter !== 'all' || timeFilter !== 'all' 
                    ? 'Adjust your filters or search terms.' 
                    : 'Subscriber details from Spin Wheel and Exit Popup will display here.'}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop WhatsApp Leads Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/10 text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        <th className="py-4 px-6">Subscriber</th>
                        <th className="py-4 px-6">Phone</th>
                        <th className="py-4 px-6">Source</th>
                        <th className="py-4 px-6">Opt-In Date</th>
                        <th className="py-4 px-6 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80 text-xs font-semibold text-gray-700 dark:text-gray-300">{filteredLeads.map(lead => {
                        const optInDate = lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-PK', {
                          year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        }) : '-';
                        const isWheel = (lead.source_type || 'wheel') === 'wheel';
                        return (
                          <tr key={lead.id} className="hover:bg-gray-50/30 dark:hover:bg-white/5 transition-colors">
                            <td className="py-4 px-6">
                              <div className="font-bold text-gray-950 dark:text-white text-sm">{lead.name || 'Anonymous Guest'}</div>
                              {lead.email ? (
                                <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1">
                                  <Mail className="h-3 w-3" /><span>{lead.email}</span>
                                </div>
                              ) : (
                                <span className="text-[9px] text-gray-400 dark:text-gray-600 italic block mt-0.5">No email provided</span>
                              )}
                            </td>
                            <td className="py-4 px-6 font-mono text-gray-900 dark:text-gray-300 text-sm">{lead.phone}</td>
                            <td className="py-4 px-6">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${isWheel ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'}`}>
                                {isWheel ? <Zap className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                                {isWheel ? 'Spin Wheel' : 'Exit Popup'}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-gray-500 dark:text-gray-400">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                <span>{optInDate}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center justify-center gap-2">
                              <a href={getWhatsAppURL(lead)} target="_blank" rel="noopener noreferrer"
                                className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-all cursor-pointer" title="Open WhatsApp chat">
                                <MessageSquare className="h-4.5 w-4.5" />
                              </a>
                              <a href={`tel:${getCleanPhone(lead.phone)}`}
                                className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 hover:bg-blue-500 hover:text-white flex items-center justify-center transition-all cursor-pointer" title="Call">
                                <Phone className="h-4.5 w-4.5" />
                              </a>
                              <button onClick={() => handleDeleteWhatsAppLead(lead.id)}
                                className="h-9 w-9 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all cursor-pointer" title="Move to Trash">
                                <Trash2 className="h-4.5 w-4.5" />
                              </button>
                                <button onClick={() => handleCopyLead(lead)}
                                  className="h-9 w-9 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 flex items-center justify-center transition-all cursor-pointer" title="Copy">
                                  <Copy className="h-4.5 w-4.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile WhatsApp Leads Cards */}
                <div className="md:hidden space-y-3 p-4">
                  {filteredLeads.map(lead => {
                    const optInDate = lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-PK', {
                      year: 'numeric', month: 'short', day: 'numeric'
                    }) : '-';
                    const isWheel = (lead.source_type || 'wheel') === 'wheel';
                    return (
                      <div key={lead.id} className="bg-white dark:bg-[#16162a] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-black text-gray-900 dark:text-white truncate">{lead.name || 'Anonymous Guest'}</h3>
                            <p className="text-xs font-mono text-gray-600 dark:text-gray-400 mt-0.5">{lead.phone}</p>
                            {lead.email && <p className="text-[10px] text-gray-400 mt-0.5 truncate">{lead.email}</p>}
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex-shrink-0 ml-2 ${isWheel ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'}`}>
                            {isWheel ? 'Wheel' : 'Exit'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400 font-semibold">
                          <Calendar className="h-3 w-3" />
                          <span>{optInDate}</span>
                        </div>
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800/60">
                          <a href={getWhatsAppURL(lead)} target="_blank" rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white text-[10px] font-bold transition-all">
                            <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
                          </a>
                          <a href={`tel:${getCleanPhone(lead.phone)}`}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/10 text-blue-600 hover:bg-blue-500 hover:text-white text-[10px] font-bold transition-all">
                            <Phone className="h-3.5 w-3.5" /> Call
                          </a>
                          <button onClick={() => handleDeleteWhatsAppLead(lead.id)}
                            className="px-3 py-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white text-[10px] font-bold transition-all cursor-pointer" title="Move to Trash">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleCopyLead(lead)}
                            className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 text-[10px] font-bold transition-all">
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Newsletter Email Subscribers Tab */}
      {activeTab === 'email' && (
        <div className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-6 animate-pulse space-y-4">
              {[1, 2, 3].map(idx => (
                <div key={idx} className="flex justify-between items-center py-3">
                  <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/3" />
                  <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded w-20" />
                </div>
              ))}
            </div>
          ) : filteredEmailSubs.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <div className="h-12 w-12 rounded-xl bg-gray-50 dark:bg-[#0f0f1b] border border-gray-100 dark:border-gray-800 mx-auto flex items-center justify-center text-gray-300 dark:text-gray-600">
                <Mail className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">No newsletter subscribers yet</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs mx-auto">
                {searchQuery ? 'No results for your search.' : 'Customers who subscribe via the footer newsletter form will appear here.'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Email Subscribers Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f0f1b]/10 text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      <th className="py-4 px-6">Email Address</th>
                      <th className="py-4 px-6">Source</th>
                      <th className="py-4 px-6">Subscribed On</th>
                      <th className="py-4 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80 text-xs font-semibold text-gray-700 dark:text-gray-300">{filteredEmailSubs.map(sub => (
                      <tr key={sub.id} className="hover:bg-gray-50/30 dark:hover:bg-white/5 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                              <Mail className="h-4 w-4" />
                            </div>
                            <span className="font-bold text-gray-900 dark:text-white text-sm">{sub.email}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-400">
                            Newsletter
                          </span>
                        </td>
                        <td className="py-4 px-6 text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                            <span>{sub.created_at ? new Date(sub.created_at).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-center gap-2">
                            <a href={`mailto:${sub.email}`}
                              className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-600 hover:bg-purple-500 hover:text-white flex items-center justify-center transition-all cursor-pointer" title="Send email">
                              <Mail className="h-4.5 w-4.5" />
                            </a>
                            <button onClick={() => handleDeleteEmailSub(sub.id)}
                              className="h-9 w-9 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all cursor-pointer" title="Move to Trash">
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                            <button onClick={() => handleCopyEmail(sub)}
                              className="h-9 w-9 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 flex items-center justify-center transition-all cursor-pointer" title="Copy email">
                              <Copy className="h-4.5 w-4.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Email Subscribers Cards */}
              <div className="md:hidden space-y-3 p-4">
                {filteredEmailSubs.map(sub => (
                  <div key={sub.id} className="bg-white dark:bg-[#16162a] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="h-8 w-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                          <Mail className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-black text-gray-900 dark:text-white truncate">{sub.email}</span>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-400 flex-shrink-0 ml-2">
                        Newsletter
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400 font-semibold">
                      <Calendar className="h-3 w-3" />
                      <span>{sub.created_at ? new Date(sub.created_at).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800/60">
                      <a href={`mailto:${sub.email}`}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-500/10 text-purple-600 hover:bg-purple-500 hover:text-white text-[10px] font-bold transition-all">
                        <Mail className="h-3.5 w-3.5" /> Email
                      </a>
                      <button onClick={() => handleDeleteEmailSub(sub.id)}
                        className="px-3 py-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white text-[10px] font-bold transition-all cursor-pointer" title="Move to Trash">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleCopyEmail(sub)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 text-[10px] font-bold transition-all">
                        <Copy className="h-3.5 w-3.5" /> Copy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminLeadsPage() {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse bg-gray-100 dark:bg-gray-800 rounded-2xl" />}>
      <AdminLeadsPageInner />
    </Suspense>
  );
}
