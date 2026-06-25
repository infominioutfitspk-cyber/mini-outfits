'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  FolderOpen,
  ClipboardList,
  Settings,
  LogOut,
  Store,
  Star,
  Layers,
  Images,
  Award,
  Users,
  Layout,
  MessageSquare,
  TrendingUp,
  ShoppingCart,
  Menu,
  X,
  ChevronDown,
  Package,
  Shield,
  HelpCircle,
  Globe,
  Truck,
  Ruler,
  CreditCard,
  Zap,
  Mail,
  RefreshCw,
  Navigation,
  MessageCircle,
  Trash2
} from '@/components/common/Icons';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useOrderNotification } from '@/lib/hooks/useOrderNotification';
import { useSettings } from '@/lib/hooks/useSettings';
import Image from 'next/image';

function AdminLayoutContent({
  children
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { settings } = useSettings();
  const logoUrl = settings?.logoUrl || null;
  const storeName = settings?.storeName || 'Admin Console';

  // ⚠️ Client-only active state — avoids SSR/CSR hydration mismatch.
  // Both server and client start as 'not active / Console', then client
  // updates after first mount using window.location (safe — client only).
  const [mounted, setMounted] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  useEffect(() => {
    setMounted(true);
    setClientSearch(window.location.search || '');
  }, [pathname, searchParams]);

  // 🔔 Real-time order notifications (sound + browser notification)
  useOrderNotification();

  // Swap manifest for admin PWA install
  useEffect(() => {
    const storeLink = document.querySelector('link[rel="manifest"]');
    if (storeLink) storeLink.remove();

    const adminLink = document.createElement('link');
    adminLink.rel = 'manifest';
    adminLink.href = '/admin-manifest.json';
    adminLink.id = 'admin-manifest';
    document.head.appendChild(adminLink);

    return () => {
      const el = document.getElementById('admin-manifest');
      if (el) el.remove();
      if (storeLink) document.head.appendChild(storeLink.cloneNode());
    };
  }, []);

  // 📊 Today's counts for sidebar/bottom tab badges
  const [todayCounts, setTodayCounts] = useState<Record<string, number>>({});
  const [aiEnabled, setAiEnabled] = useState(false);

  useEffect(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startISO = startOfDay.toISOString();

    async function fetchTodayCounts() {
      const supabase = createClient();
      const [ordersRes, pendingRes, leadsRes, cartsRes, pendingCartsRes, settingsFetch] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', startISO),
        supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', startISO).in('status', ['pending', 'placed']),
        supabase.from('whatsapp_subscribers').select('id', { count: 'exact', head: true }).gte('created_at', startISO),
        supabase.from('abandoned_carts').select('id', { count: 'exact', head: true }).gte('last_activity', startISO),
        supabase.from('abandoned_carts').select('id', { count: 'exact', head: true }).gte('last_activity', startISO).eq('email_sent', false).eq('order_placed', false),
        fetch('/api/ai-check').then(r => r.json()).catch(() => ({ ai_enabled: false }))
      ]);
      setTodayCounts({
        orders: ordersRes.count ?? 0,
        pending: pendingRes.count ?? 0,
        leads: leadsRes.count ?? 0,
        carts: cartsRes.count ?? 0,
        pendingCarts: pendingCartsRes.count ?? 0,
      });
      setAiEnabled(settingsFetch.ai_enabled);
    }
    fetchTodayCounts();
  }, []);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Logged out successfully');
      router.refresh();
      router.push('/admin/login');
    } catch (err) {
      toast.error('Logout failed');
    }
  };

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    dashboard: true,
    catalog: true,
    orders: true,
    customers: true,
    reviews: true,
    trash: true,
    reporting: true,
    settings: true,
  });

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const navSections = [
    {
      key: 'dashboard', label: '', items: [
        { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
      ]
    },
    {
      key: 'catalog', label: 'CATALOG', items: [
        { label: 'Products', href: '/admin/products', icon: ShoppingBag },
        { label: 'Inventory', href: '/admin/inventory', icon: Package },
        { label: 'Categories', href: '/admin/categories', icon: FolderOpen },
        { label: 'Variants', href: '/admin/variants', icon: Layers },
        { label: 'Size Guides', href: '/admin/size-guides', icon: Ruler },
        { label: 'Media', href: '/admin/media', icon: Images },
        ...(aiEnabled ? [{ label: 'SEO Copywriter', href: '/admin/seo', icon: Zap }] : []),
      ]
    },
    {
      key: 'orders', label: 'ORDERS', items: [
        { label: 'Orders Log', href: '/admin/orders', icon: ClipboardList },
        { label: 'Abandoned Carts', href: '/admin/abandoned-carts', icon: ShoppingCart },
      ]
    },
    {
      key: 'customers', label: 'CUSTOMERS', items: [
        { label: 'Customers', href: '/admin/customers', icon: Users },
        { label: 'WhatsApp Leads', href: '/admin/leads', icon: MessageSquare },
      ]
    },
    {
      key: 'reviews', label: 'REVIEWS', items: [
        { label: 'Reviews', href: '/admin/reviews', icon: Star },
        { label: 'Badges', href: '/admin/badges', icon: Award },
      ]
    },
    {
      key: 'reporting', label: '', items: [
        { label: 'Reporting', href: '/admin/reporting', icon: TrendingUp },
      ]
    },
    {
      key: 'trash', label: 'TRASH', items: [
        { label: 'Trash Bin', href: '/admin/trash', icon: Trash2 },
      ]
    },
    {
      key: 'settings', label: 'SETTINGS', items: [
        { label: 'General', href: '/admin/settings?tab=general', icon: Settings },
        { label: 'Header', href: '/admin/settings?tab=header', icon: Layout },
        { label: 'Navigation', href: '/admin/settings?tab=navigation', icon: Navigation },
        { label: 'Products', href: '/admin/settings?tab=products', icon: Package },
        { label: 'Trust & Badges', href: '/admin/settings?tab=trust', icon: Shield },
        { label: 'WhatsApp', href: '/admin/settings?tab=whatsapp', icon: MessageCircle },
        { label: 'Policies & FAQ', href: '/admin/settings?tab=policies', icon: HelpCircle },
        { label: 'Footer & Social', href: '/admin/settings?tab=footer', icon: Globe },
        { label: 'Shipping & Pay', href: '/admin/settings?tab=shipping', icon: Truck },
        { label: 'Premium', href: '/admin/settings?tab=premium', icon: Award },
        { label: 'Coupons', href: '/admin/settings?tab=coupons', icon: CreditCard },
        { label: 'Pixels & SEO', href: '/admin/settings?tab=pixels', icon: Globe },
        { label: 'AI Settings', href: '/admin/settings?tab=ai_settings', icon: Zap },
        { label: 'Email & SMTP', href: '/admin/settings?tab=email', icon: Mail },
        ...(settings?.meta_sync_enabled ? [{ label: 'Meta Sync', href: '/admin/settings?tab=meta_sync', icon: RefreshCw }] : []),
        { label: 'Homepage Customizer', href: '/admin/settings/customizer', icon: Layout },
      ]
    },
  ];

  const isItemActive = (href: string) => {
    if (!mounted) return false; // server: nothing is active — no hydration mismatch
    const [basePath, searchQuery] = href.split('?');
    if (searchQuery) {
      const active = pathname === basePath && clientSearch === `?${searchQuery}`;
      // Special case: if we are on /admin/settings with no tab query param, treat general as active
      if (basePath === '/admin/settings' && searchQuery === 'tab=general' && (!clientSearch || clientSearch === '')) {
        return true;
      }
      return active;
    }
    return pathname === href || (basePath !== '/admin/dashboard' && pathname?.startsWith(basePath) && !pathname?.startsWith('/admin/settings'));
  };

  const getPageTitle = () => {
    if (!mounted) return 'Console'; // server: always 'Console'
    for (const section of navSections) {
      for (const item of section.items) {
        if (isItemActive(item.href)) return item.label;
      }
    }
    return 'Console';
  };

  // If we are on the login page, customizer preview page, or customizer page, don't show the dashboard layout
  const cleanPathname = pathname?.replace(/\/$/, '') || '';
  if (
    cleanPathname === '/admin/login' ||
    cleanPathname === '/admin/settings/customizer/preview' ||
    cleanPathname === '/admin/settings/customizer'
  ) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen w-screen flex-col md:flex-row bg-gray-50 dark:bg-[#0f0f1b] overflow-hidden">
      {/* 📱 Mobile Drawer Sidebar Backdrop (overlay) */}
      <div
        onClick={() => setIsMobileMenuOpen(false)}
        className={`fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
      />

      {/* 📱 Mobile Drawer Sidebar Container */}
      <div
        className={`fixed inset-y-0 left-0 w-72 bg-[#1a1a2e] z-50 transform transition-transform duration-300 md:hidden flex flex-col h-full border-r border-current/10 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* Mobile Drawer Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-current/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            {logoUrl ? (
              <Image src={logoUrl} alt={storeName} width={32} height={32} className="h-8 w-auto object-contain rounded" />
            ) : (
              <Store className="h-6 w-6 text-[#e94560]" />
            )}
            <span className="font-bold text-lg tracking-tight text-current">{storeName}</span>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setIsMobileMenuOpen(false); }}
            className="p-2 rounded-xl text-current opacity-50 hover:bg-current/10 hover:opacity-100 transition-all focus:outline-none active:scale-95"
            title="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mobile Drawer Scrollable Navigation links (Touch-First) */}
        <nav className="flex-1 px-4 py-4 overflow-y-auto overscroll-contain touch-pan-y">
          {navSections.map(section => (
            <div key={section.key} className="mb-3">
              {section.label && (
                <button
                  onClick={() => toggleSection(section.key)}
                  className="flex items-center justify-between w-full px-4 py-2 text-[10px] font-black text-current opacity-60 uppercase tracking-widest cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <span>{section.label}</span>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expandedSections[section.key] ? 'rotate-0' : '-rotate-90'}`} />
                </button>
              )}
              {expandedSections[section.key] && (
                <div className="space-y-0.5 mt-1">
                  {section.items.map(item => {
                    const Icon = item.icon;
                    const active = isItemActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${active
                            ? 'bg-[#e94560] text-white shadow-md'
                            : 'text-current opacity-70 hover:opacity-100 hover:bg-current/10'
                          }`}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Mobile Drawer Footer Logout */}
        <div className="p-4 border-t border-current/10 flex-shrink-0">
          <button
            onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-current opacity-70 hover:bg-red-500/10 hover:text-red-500 hover:opacity-100 transition-all cursor-pointer text-left"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* 🖥️ Desktop Static Sidebar Navigation */}
      <aside className="hidden md:flex md:w-64 bg-[#1a1a2e] text-current flex-col flex-shrink-0 md:h-screen md:sticky md:top-0 md:overflow-y-auto">
        {/* Brand logo header */}
        <div className="flex h-16 items-center gap-2 px-6 border-b border-current/10">
          {logoUrl ? (
            <Image src={logoUrl} alt={storeName} width={32} height={32} className="h-8 w-auto object-contain rounded" />
          ) : (
            <Store className="h-6 w-6 text-[#e94560]" />
          )}
          <span className="font-bold text-lg tracking-tight">{storeName}</span>
        </div>

        {/* Desktop Vertical nav links */}
        <nav className="flex-1 px-4 py-4 overflow-y-auto">
          {navSections.map(section => (
            <div key={section.key} className="mb-3">
              {section.label && (
                <button
                  onClick={() => toggleSection(section.key)}
                  className="flex items-center justify-between w-full px-4 py-1.5 text-[10px] font-black text-current opacity-60 uppercase tracking-widest cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <div className="flex items-center gap-2">
                    <span>{section.label}</span>
                    {section.key === 'orders' && todayCounts.orders > 0 && (
                      <span className="text-[9px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full leading-none">
                        {todayCounts.orders}
                      </span>
                    )}
                    {section.key === 'customers' && todayCounts.leads > 0 && (
                      <span className="text-[9px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full leading-none">
                        {todayCounts.leads}
                      </span>
                    )}
                  </div>
                  <ChevronDown className={`h-3 w-3 transition-transform ${expandedSections[section.key] ? 'rotate-0' : '-rotate-90'}`} />
                </button>
              )}
              {expandedSections[section.key] && (
                <div className="space-y-0.5 mt-0.5">
                  {section.items.map(item => {
                    const Icon = item.icon;
                    const active = isItemActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${active
                            ? 'bg-[#e94560] text-white shadow-md'
                            : 'text-current opacity-70 hover:opacity-100 hover:bg-current/10'
                          }`}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        <span>{item.label}</span>
                        {(item.label === 'Orders Log' || item.label === 'Abandoned Carts' || item.label === 'WhatsApp Leads') && (
                          (() => {
                            const count = item.label === 'Orders Log' ? todayCounts.pending
                              : item.label === 'Abandoned Carts' ? todayCounts.pendingCarts
                                : todayCounts.leads;
                            if (count !== undefined && count > 0) return (
                              <span className="ml-auto text-[9px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full leading-none">
                                {count > 99 ? '99+' : count}
                              </span>
                            );
                            return null;
                          })()
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Desktop Footer Logout */}
        <div className="p-4 border-t border-current/10">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-current opacity-70 hover:bg-red-500/10 hover:text-red-500 hover:opacity-100 transition-all cursor-pointer text-left"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Unified Mobile/Desktop Header with Hamburger Trigger */}
        <header className="h-16 flex-shrink-0 bg-white dark:bg-[#16162a] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3">
            {/* 📱 Hamburger Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 transition-all focus:outline-none active:scale-95"
              title="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="text-sm md:text-lg font-black text-gray-900 dark:text-white tracking-tight">
              {getPageTitle()}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xs md:text-sm font-bold text-[#e94560] hover:underline">
              View Store
            </Link>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 pb-20 md:pb-8 overflow-y-auto overflow-x-hidden bg-gray-50 dark:bg-[#0f0f1b] transition-colors duration-200">
          {children}
        </main>
      </div>

      {/* 📱 Mobile Bottom Tab Bar — like a mobile app */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#16162a] border-t border-gray-200 dark:border-gray-800 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] transition-colors duration-200">
        <div className="flex items-center justify-around h-16 px-2">
          {[
            { label: 'Orders', href: '/admin/orders', icon: ClipboardList, countKey: 'pending' },
            { label: 'Reviews', href: '/admin/reviews', icon: Star, countKey: undefined },
            { label: 'Customers', href: '/admin/customers', icon: Users, countKey: undefined },
            { label: 'Carts', href: '/admin/abandoned-carts', icon: ShoppingCart, countKey: 'pendingCarts' },
            { label: 'Leads', href: '/admin/leads', icon: MessageSquare, countKey: 'leads' },
          ].map(tab => {
            const Icon = tab.icon;
            const active = pathname.startsWith(tab.href);
            const count = tab.countKey ? todayCounts[tab.countKey] : undefined;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center justify-center flex-1 h-full relative text-[10px] font-bold transition-colors ${active
                    ? 'text-[#e94560]'
                    : 'text-gray-400 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white'
                  }`}
              >
                <div className="relative flex items-center justify-center">
                  <Icon className="h-5.5 w-5.5 mb-0.5 shrink-0" />
                  {count !== undefined && count > 0 && (
                    <span className="absolute -top-1 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                  {active && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-[#e94560]" />
                  )}
                </div>
                <span className="mt-0.5 tracking-wide">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-screen bg-gray-50 dark:bg-[#0f0f1b] animate-pulse">
        <div className="hidden md:block w-64 bg-[#1a1a2e] h-full" />
        <div className="flex-1 flex flex-col">
          <div className="h-16 bg-white dark:bg-[#16162a] border-b border-gray-200 dark:border-gray-800" />
          <div className="flex-1 p-6 md:p-8 bg-gray-50 dark:bg-[#0f0f1b]" />
        </div>
      </div>
    }>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </Suspense>
  );
}
