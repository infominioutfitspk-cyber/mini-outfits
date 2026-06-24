'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingCart, LayoutDashboard, Search, X, Heart, ChevronDown, ChevronRight, User, HelpCircle, RefreshCw, Shield, Star } from '@/components/common/Icons';
import { useCart } from '@/lib/hooks/useCart';
import ThemeToggle from '@/components/common/ThemeToggle';
import { useSearchStore } from '@/store/searchStore';
import { Product, StoreSettings, NavigationItem } from '@/lib/types';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

interface NavbarProps {
  storeName?: string;
  logoUrl?: string;
  logoWidth?: number;
  settings?: StoreSettings;
}

export default function Navbar({
  storeName: propStoreName = 'Zaynahs E-Store',
  logoUrl: propLogoUrl,
  logoWidth: propLogoWidth = 120,
  settings,
}: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const totalItems = useCart((state) => state.totalItems());
  const isAdmin = pathname?.startsWith('/admin') && pathname !== '/admin/settings/customizer/preview';

  // Load and fallback settings values
  const storeName = settings?.storeName ?? propStoreName;
  const settingsTimestamp = settings?.updatedAt ? new Date(settings.updatedAt).getTime() : '';
  const rawLogoUrl = settings?.logoUrl ?? propLogoUrl;
  const logoUrl = rawLogoUrl && settingsTimestamp ? `${rawLogoUrl}?v=${settingsTimestamp}` : rawLogoUrl;
  const logoWidth = settings?.logoWidth ?? propLogoWidth;

  // Header options defaults
  const headerStickyDesktop = settings?.headerStickyDesktop ?? true;
  const headerStickyMobile = settings?.headerStickyMobile ?? true;

  const stickyClass = (headerStickyDesktop && headerStickyMobile)
    ? 'sticky top-0'
    : headerStickyDesktop
      ? 'md:sticky md:top-0 relative'
      : headerStickyMobile
        ? 'sticky top-0 md:relative'
        : 'relative';
  const showTopBar = settings?.headerShowTopBar ?? true;
  const topBarPhone = settings?.headerTopBarPhone ?? '0328-4114551';
  const topBarEmail = settings?.headerTopBarEmail ?? 'Totvoguepk@gmail.com';
  const showNewsletter = settings?.headerShowNewsletter ?? true;
  const newsletterText = settings?.headerNewsletterText ?? 'Summer sale discount off 50%. Shop Sale';

  const topBarBg = settings?.headerTopBarBg ?? '#d97706';
  const topBarTextColor = settings?.headerTopBarTextColor ?? '#ffffff';
  const headerBg = settings?.headerBg ?? '#ffffff';
  const headerTextColor = settings?.headerTextColor ?? '#1a1a2e';
  const headerBorderColor = settings?.headerBorderColor ?? '#e5e7eb';

  // Desktop alignments
  const desktopLogoAlign = settings?.headerDesktopLogoAlign ?? 'left';
  const desktopSearchAlign = settings?.headerDesktopSearchAlign ?? 'right';
  const desktopWishlistAlign = settings?.headerDesktopWishlistAlign ?? 'right';
  const desktopCartAlign = settings?.headerDesktopCartAlign ?? 'right';
  const desktopThemeAlign = settings?.headerDesktopThemeAlign ?? 'right';

  // Mobile logo always centered (as per design rules)
  const mobileLogoAlign = 'center';
  const mobileMenuAlign = settings?.headerMobileMenuAlign ?? 'left';
  const mobileSearchAlign = settings?.headerMobileSearchAlign ?? 'right';
  const mobileCartAlign = settings?.headerMobileCartAlign ?? 'right';
  const mobileWishlistAlign = settings?.headerMobileWishlistAlign ?? 'hidden';

  // Mobile menu states
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Split newsletter text by newlines to support multiple announcements rotating automatically
  const announcementLines = useMemo(() => {
    return (newsletterText || '').split('\n').map(line => line.trim()).filter(Boolean);
  }, [newsletterText]);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 4000, stopOnInteraction: false })
  ]);
  // Mobile accordion open states for custom nav items with children
  const [mobileAccordionOpen, setMobileAccordionOpen] = useState<Record<string, boolean>>({});
  // Desktop hover open state for dropdowns
  const [desktopHoverOpen, setDesktopHoverOpen] = useState<string | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navigationMenu: NavigationItem[] = settings?.navigationMenu ?? [];
  const headerDesktopMenuAlign = settings?.headerDesktopMenuAlign ?? 'center';

  // Search store state
  const searchQuery = useSearchStore((state) => state.searchQuery);
  const setSearchQuery = useSearchStore((state) => state.setSearchQuery);
  const searchOpen = useSearchStore((state) => state.isOpen);
  const setSearchOpen = useSearchStore((state) => state.setIsOpen);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Live Ajax search state
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch active products client-side on-demand when search is opened
  useEffect(() => {
    if (searchOpen && products.length === 0) {
      const loadProducts = async () => {
        setLoading(true);
        try {
          const { getProductsClient } = await import('@/lib/services/products-client');
          const data = await getProductsClient();
          setProducts(data);
        } catch (err) {
          console.error('Failed to load products for live search:', err);
        } finally {
          setLoading(false);
        }
      };
      loadProducts();
    }
  }, [searchOpen, products.length]);

  // Click outside to close suggestion dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute live Ajax search suggestions matching titles, category name, or variants
  const suggestions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q || products.length === 0) return [];

    return products.filter(product => {
      return (
        product.name.toLowerCase().includes(q) ||
        (product.description && product.description.toLowerCase().includes(q)) ||
        (product.shortDescription && product.shortDescription.toLowerCase().includes(q)) ||
        (product.sku && product.sku.toLowerCase().includes(q)) ||
        (product.tags && product.tags.some(tag => tag.toLowerCase().includes(q))) ||
        (product.category?.name && product.category.name.toLowerCase().includes(q)) ||
        (product.variants && product.variants.some(v =>
          v.active && (
            (v.color && v.color.toLowerCase().includes(q)) ||
            (v.size && v.size.toLowerCase().includes(q)) ||
            (v.material && v.material.toLowerCase().includes(q)) ||
            (v.sku && v.sku.toLowerCase().includes(q)) ||
            (v.customValue && v.customValue.toLowerCase().includes(q))
          )
        ))
      );
    }).slice(0, 5); // Limit suggestions to 5 items
  }, [products, searchQuery]);

  // Prevent hydration mismatch — cart count comes from localStorage (client-only)
  const [mounted, setMounted] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [customerSession, setCustomerSession] = useState<any>(null);
  const [isPreview, setIsPreview] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      if (typeof window !== 'undefined' && window.self !== window.top) {
        setIsPreview(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Fetch active customer session client-side
  useEffect(() => {
    if (!mounted) return;
    async function loadSession() {
      try {
        const { getCustomerProfile } = await import('@/lib/services/customers');
        const profile = await getCustomerProfile();
        setCustomerSession(profile);
      } catch { }
    }
    loadSession();
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;

    const updateWishlistCount = () => {
      const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
      setWishlistCount(wishlist.length);
    };

    updateWishlistCount();

    window.addEventListener('wishlist-updated', updateWishlistCount);
    return () => {
      window.removeEventListener('wishlist-updated', updateWishlistCount);
    };
  }, [mounted]);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  // Lock body scroll when mobile menu or search modal is open
  useEffect(() => {
    if (mobileMenuOpen || searchOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen, searchOpen]);

  // Escape key handler to close search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen, setSearchOpen]);

  // Reset search query on pathname change to prevent stale search results on page transitions
  useEffect(() => {
    setSearchQuery('');
  }, [pathname, setSearchQuery]);

  // Helper renderers for dynamic alignment
  const customTextColorStyle = headerTextColor !== '#1a1a2e' ? { color: headerTextColor } : {};
  const customBorderColorStyle = headerBorderColor !== '#e5e7eb' ? { borderColor: headerBorderColor } : {};

  const renderLogo = () => (
    <Link href="/" key="logo" className="flex items-center gap-2 shrink-0 select-none" onClick={() => { setSearchOpen(false); setMobileMenuOpen(false); }}>
      {logoUrl ? (
        <div
          style={{ width: `${logoWidth}px`, maxWidth: `${logoWidth}px` }}
          className="flex items-center shrink-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt={storeName}
            style={{ width: `${logoWidth}px`, height: 'auto', maxWidth: '100%', display: 'block' }}
            className="object-contain"
          />
        </div>
      ) : (
        <span className="text-lg sm:text-xl font-black tracking-tight md:text-2xl" style={customTextColorStyle}>
          {storeName}
        </span>
      )}
    </Link>
  );


  const renderSearch = () => !isAdmin && (
    <button
      key="search"
      onClick={() => setSearchOpen(true)}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-[#1a1a2e] dark:hover:text-white transition-all cursor-pointer animate-fade-in"
      title="Search Store"
    >
      <Search className="h-5 w-5" style={customTextColorStyle} />
    </button>
  );

  const renderThemeToggle = () => (
    <div key="theme-toggle" className="shrink-0">
      <ThemeToggle />
    </div>
  );

  const renderWishlist = (isMobile?: boolean) => !isAdmin && (
    <Link
      href="/wishlist"
      key="wishlist"
      id={isMobile ? "header-wishlist-icon-mobile" : "header-wishlist-icon-desktop"}
      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-[#1a1a2e] dark:hover:text-white transition-all"
      title="My Wishlist"
    >
      <Heart className="h-5 w-5" style={customTextColorStyle} />
      {mounted && wishlistCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-[#0f0f1b]">
          {wishlistCount}
        </span>
      )}
    </Link>
  );

  const renderCart = (isMobile?: boolean) => !isAdmin && (
    <Link
      href="/cart"
      key="cart"
      id={isMobile ? "header-cart-icon-mobile" : "header-cart-icon-desktop"}
      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-[#1a1a2e] dark:hover:text-white transition-all cursor-pointer"
    >
      <ShoppingCart className="h-5 w-5" style={customTextColorStyle} />
      {mounted && totalItems > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#e94560] text-[10px] font-bold text-white ring-2 ring-white dark:ring-[#0f0f1b]">
          {totalItems}
        </span>
      )}
    </Link>
  );

  const renderAccountLink = () => !isAdmin && (
    <Link
      href={customerSession ? "/account" : "/login"}
      key="account"
      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-[#1a1a2e] dark:hover:text-white transition-all"
      title={customerSession ? "My Account" : "Login / Register"}
    >
      <User className="h-5 w-5" style={customTextColorStyle} />
    </Link>
  );

  const renderAdminLink = () => isAdmin ? (
    <Link
      href="/"
      key="admin-link"
      className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-[#e94560] transition-colors shrink-0"
      style={customTextColorStyle}
    >
      <span>Go to Shop</span>
    </Link>
  ) : null;

  const renderMobileMenuButton = () => (
    <button
      key="mobile-menu"
      onClick={() => setMobileMenuOpen(true)}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-[#1a1a2e] dark:hover:text-white transition-all cursor-pointer"
      title="Open Menu"
    >
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={customTextColorStyle}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );

  // Desktop navigation dropdown menu renderer (Hierarchical vertical dropdown list showing all nested levels upfront)
  const renderDesktopDropdown = (item: NavigationItem) => {
    const children = item.children || [];
    if (children.length === 0) return null;

    // Recursive function to render a menu item and its children with indentation
    const renderDropdownItem = (node: NavigationItem, depth = 0): React.ReactNode => {
      const nodeChildren = node.children || [];
      const hasChildren = nodeChildren.length > 0;

      // Define styling classes and vertical padding based on depth
      let textClass = "text-sm font-bold text-gray-900 dark:text-white";
      let pyClass = "py-2.5";

      if (depth === 1) {
        textClass = "text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-[#e94560] dark:hover:text-white";
        pyClass = "py-2";
      } else if (depth >= 2) {
        textClass = "text-[11px] font-semibold text-gray-500 dark:text-gray-400 hover:text-[#e94560] dark:hover:text-white";
        pyClass = "py-1.5";
      }

      // Calculate precise padding left mathematically based on depth
      const paddingLeftValue = `${20 + depth * 16}px`;

      return (
        <React.Fragment key={node.id}>
          <div className="flex flex-col">
            <Link
              href={node.url}
              style={{ paddingLeft: paddingLeftValue }}
              className={`block w-full text-left pr-5 transition-colors hover:bg-gray-50 dark:hover:bg-white/5 whitespace-nowrap ${pyClass} ${textClass}`}
            >
              <span className="flex items-center gap-2">
                {depth > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700 shrink-0" />
                )}
                {node.label}
              </span>
            </Link>
          </div>
          {hasChildren && (
            <div className="flex flex-col">
              {nodeChildren.map((child) => renderDropdownItem(child, depth + 1))}
            </div>
          )}
        </React.Fragment>
      );
    };

    return (
      <div
        className="absolute top-full left-0 mt-2 min-w-[220px] bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl py-2 z-50 animate-fade-in flex flex-col"
      >
        {children.map((child, idx) => (
          <React.Fragment key={child.id}>
            {/* Clean divider line between Level 1 sections */}
            {idx > 0 && (
              <div className="border-t border-gray-100 dark:border-gray-800 my-1.5" />
            )}
            {renderDropdownItem(child, 0)}
          </React.Fragment>
        ))}
      </div>
    );
  };


  // Desktop dynamic navigation menu renderer
  const renderDesktopNavMenu = () => {
    if (isAdmin || navigationMenu.length === 0 || headerDesktopMenuAlign === 'hidden') return null;
    return (
      <nav key="desktop-nav" className="flex items-center gap-0.5">
        {navigationMenu.map((item) => {
          const hasChildren = item.children && item.children.length > 0;
          const isOpen = desktopHoverOpen === item.id;
          return (
            <div
              key={item.id}
              className="relative"
              onMouseEnter={() => {
                if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
                setDesktopHoverOpen(item.id);
              }}
              onMouseLeave={() => {
                hoverTimerRef.current = setTimeout(() => setDesktopHoverOpen(null), 150);
              }}
            >
              <Link
                href={item.url}
                className={`flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap relative group/item ${isOpen
                    ? 'text-[#e94560] bg-gray-50 dark:bg-white/5'
                    : 'text-gray-700 dark:text-gray-200 hover:text-[#e94560] hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}
                style={customTextColorStyle}
              >
                <span>{item.label}</span>
                {hasChildren && (
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  />
                )}
                {/* Underline line transition */}
                <span
                  className={`absolute bottom-0.5 left-3 right-3 h-[2px] bg-[#e94560] rounded-full transition-all duration-300 transform origin-left ${isOpen ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0 group-hover/item:scale-x-100 group-hover/item:opacity-100'
                    }`}
                />
              </Link>
              {/* Dropdown sub-menu */}
              {hasChildren && isOpen && renderDesktopDropdown(item)}
            </div>
          );
        })}
      </nav>
    );
  };

  // Helper to recursively collect all descendant item IDs under a navigation item
  const getDescendantIds = (node: NavigationItem): string[] => {
    const ids: string[] = [];
    const traverse = (n: NavigationItem) => {
      const children = n.children || [];
      children.forEach((c) => {
        ids.push(c.id);
        traverse(c);
      });
    };
    traverse(node);
    return ids;
  };

  // Recursive mobile drawer accordion menu renderer
  const renderMobileNavItem = (item: NavigationItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isAccOpen = mobileAccordionOpen[item.id];

    return (
      <div key={item.id} className="w-full">
        <div className="flex items-center justify-between">
          <Link
            href={item.url}
            onClick={() => { if (!hasChildren) setMobileMenuOpen(false); }}
            className="flex-1 py-2 text-sm font-bold text-gray-900 dark:text-white hover:text-[#e94560] transition-colors"
          >
            {item.label}
          </Link>
          {hasChildren && (
            <button
              type="button"
              onClick={() => {
                const nextState = !isAccOpen;
                setMobileAccordionOpen((prev) => {
                  const updated = { ...prev, [item.id]: nextState };
                  if (nextState) {
                    // Automatically expand all nested sub-items/descendants
                    getDescendantIds(item).forEach((id) => {
                      updated[id] = true;
                    });
                  }
                  return updated;
                });
              }}
              className="p-1.5 text-gray-400 hover:text-[#e94560] transition-colors cursor-pointer"
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${isAccOpen ? 'rotate-180' : ''}`}
              />
            </button>
          )}
        </div>
        {/* Accordion sub-items */}
        {hasChildren && isAccOpen && (
          <div className="ml-4 mt-1 space-y-1 border-l border-gray-200 dark:border-gray-800 pl-3 animate-fade-in">
            {item.children!.map((child) => renderMobileNavItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Group desktop items by alignment settings
  const desktopLeftElements: React.ReactNode[] = [];
  const desktopCenterElements: React.ReactNode[] = [];
  const desktopRightElements: React.ReactNode[] = [];

  const addToDesktopSlot = (align: string, element: React.ReactNode) => {
    if (align === 'left') desktopLeftElements.push(element);
    else if (align === 'center') desktopCenterElements.push(element);
    else if (align === 'right') desktopRightElements.push(element);
  };

  addToDesktopSlot(desktopLogoAlign, renderLogo());
  // Add the dynamic menu to the configured desktop alignment slot
  addToDesktopSlot(headerDesktopMenuAlign, renderDesktopNavMenu());
  addToDesktopSlot(desktopSearchAlign, renderSearch());
  addToDesktopSlot(desktopWishlistAlign, renderAccountLink());
  addToDesktopSlot(desktopWishlistAlign, renderWishlist(false));
  addToDesktopSlot(desktopCartAlign, renderCart(false));
  addToDesktopSlot(desktopThemeAlign, renderAdminLink());

  // Group mobile items by alignment settings
  const mobileLeftElements: React.ReactNode[] = [];
  const mobileCenterElements: React.ReactNode[] = [];
  const mobileRightElements: React.ReactNode[] = [];

  const addToMobileSlot = (align: string, element: React.ReactNode) => {
    if (align === 'left') mobileLeftElements.push(element);
    else if (align === 'center') mobileCenterElements.push(element);
    else if (align === 'right') mobileRightElements.push(element);
  };

  addToMobileSlot(mobileMenuAlign, renderMobileMenuButton());
  addToMobileSlot(mobileLogoAlign, renderLogo());
  addToMobileSlot(mobileSearchAlign, renderSearch());
  addToMobileSlot(mobileWishlistAlign, renderAccountLink());
  addToMobileSlot(mobileWishlistAlign, renderWishlist(true));
  addToMobileSlot(mobileCartAlign, renderCart(true));
  addToMobileSlot('right', renderAdminLink());

  // Clear query on close
  const handleCloseSearch = () => {
    setSearchQuery('');
    setSearchOpen(false);
  };

  return (
    <>
      {/* Top Bar Contacts & Announcements */}
      {(showTopBar || showNewsletter) && (
        <div
          onClick={(e) => {
            if (isPreview) {
              e.preventDefault();
              e.stopPropagation();
              window.parent.postMessage({ type: 'select_section', sectionId: 'announcement_bar' }, '*');
            }
          }}
          className={`w-full text-xs py-1 md:py-2 px-4 flex flex-col md:flex-row items-center justify-between gap-2 border-b transition-colors font-semibold ${isPreview ? 'cursor-pointer hover:ring-2 hover:ring-[#e94560] hover:ring-offset-2' : ''
            }`}
          style={{
            backgroundColor: topBarBg,
            color: topBarTextColor,
            borderColor: headerBorderColor
          }}
        >
          {/* Top Bar Contacts (Hidden on mobile/tablet, shown on desktop) */}
          {showTopBar ? (
            <div className="hidden md:flex flex-wrap items-center gap-4 text-[10px] sm:text-[11px] font-bold">
              {topBarPhone && (
                <a href={`tel:${topBarPhone.replace(/\D/g, '')}`} className="hover:opacity-85 transition-opacity flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6.62 10.79a15.15 15.15 0 006.57 6.57l2.2-2.2a1 1 0 01.9-.27 11.36 11.36 0 00.57 3.58 1 1 0 01-.27.9l-2.2 2.2z" />
                  </svg>
                  <span>{topBarPhone}</span>
                </a>
              )}
              {topBarEmail && (
                <a href={`mailto:${topBarEmail}`} className="hover:opacity-85 transition-opacity flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  <span>{topBarEmail}</span>
                </a>
              )}
            </div>
          ) : (
            <div className="hidden md:block shrink-0 w-32" />
          )}

          {/* Announcement Ticker */}
          {showNewsletter && announcementLines.length > 0 && (
            <div className="flex-1 max-w-xl flex items-center justify-center gap-1 sm:gap-2">
              {announcementLines.length > 1 && (
                <button
                  type="button"
                  onClick={() => emblaApi?.scrollPrev()}
                  className="w-8 h-8 flex items-center justify-center hover:opacity-85 transition-opacity cursor-pointer shrink-0 z-10 -my-1"
                  aria-label="Previous announcement"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}

              <div className="overflow-hidden flex-1 select-none" ref={emblaRef}>
                <div className="flex">
                  {announcementLines.map((line, idx) => (
                    <div
                      key={idx}
                      className="flex-[0_0_100%] min-w-0 text-center font-black tracking-wider truncate px-1 text-[10px] sm:text-[11px] uppercase min-h-[16px] flex items-center justify-center"
                    >
                      {line}
                    </div>
                  ))}
                </div>
              </div>

              {announcementLines.length > 1 && (
                <button
                  type="button"
                  onClick={() => emblaApi?.scrollNext()}
                  className="w-8 h-8 flex items-center justify-center hover:opacity-85 transition-opacity cursor-pointer shrink-0 z-10 -my-1"
                  aria-label="Next announcement"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          )}

          <div className="hidden md:block shrink-0 w-32" />
        </div>
      )}

      {/* Main Header */}
      <header
        onClick={(e) => {
          if (isPreview) {
            e.preventDefault();
            e.stopPropagation();
            window.parent.postMessage({ type: 'select_global_tab', subTab: 'header' }, '*');
          }
        }}
        className={`${stickyClass} z-40 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-[#0f0f1b]/85 backdrop-blur-md transition-colors duration-200 ${isPreview ? 'cursor-pointer hover:ring-2 hover:ring-[#e94560] hover:ring-offset-2' : ''
          }`}
        style={{
          backgroundColor: headerBg !== '#ffffff' ? headerBg : undefined,
          borderColor: headerBorderColor !== '#e5e7eb' ? headerBorderColor : undefined,
          color: headerTextColor !== '#1a1a2e' ? headerTextColor : undefined
        }}
      >
        {/* Desktop Header Layout */}
        <div className="mx-auto hidden md:flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 gap-4">
          <div className="flex items-center gap-4 justify-start shrink-0">
            {desktopLeftElements}
          </div>
          <div className="flex items-center gap-4 justify-center flex-grow min-w-0">
            {desktopCenterElements}
          </div>
          <div className="flex items-center gap-4 justify-end shrink-0">
            {desktopRightElements}
          </div>
        </div>

        {/* Mobile Header Layout */}
        <div className="mx-auto md:hidden flex h-14 items-center justify-between px-4 relative">
          <div className="flex-1 flex items-center gap-2 justify-start shrink-0 z-10">
            {mobileLeftElements}
          </div>
          <div className="absolute inset-x-0 top-0 bottom-0 flex items-center justify-center pointer-events-none z-20">
            <div className="pointer-events-auto flex items-center">
              {mobileCenterElements}
            </div>
          </div>
          <div className="flex-1 flex items-center gap-2 justify-end shrink-0 z-10">
            {mobileRightElements}
          </div>
        </div>
      </header>

      {/* MOBILE DRAWER MENU */}
      {mounted && mobileMenuOpen && createPortal(
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-[150] bg-black/70 flex justify-start transition-all duration-300 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#16162a] w-4/5 max-w-xs h-[100dvh] shadow-2xl relative flex flex-col overflow-hidden scale-up duration-200 will-change-transform"
          >
            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y p-6 pb-24">
              {/* Drawer Header */}
              <div className="flex items-center justify-between mb-6">
                <span className="font-black text-gray-900 dark:text-white uppercase tracking-wider">Menu</span>
                <div className="flex items-center gap-2">

                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer flex h-10 w-10 items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-white/5"
                    title="Close Menu"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>


              {/* 1. Custom Navigation Menu - FIRST SECTION (accordion) */}
              {!isAdmin && navigationMenu.length > 0 && (
                <div className="mb-6">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-3">Navigation</span>
                  <div className="space-y-1">
                    {navigationMenu.map((item) => renderMobileNavItem(item))}
                  </div>
                </div>
              )}

              {/* 3. Secondary Links - BOTTOM SECTION */}
              <div className="border-t border-gray-100 dark:border-gray-800 pt-6">
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-3">Quick Links</span>
                <div className="space-y-2">
                  {customerSession ? (
                    <Link
                      href="/account"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 py-1.5 text-sm font-bold text-gray-900 dark:text-white hover:text-[#e94560] transition-colors"
                    >
                      <User className="h-4 w-4" />
                      <span>My Account ({customerSession.name})</span>
                    </Link>
                  ) : (
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 py-1.5 text-sm font-bold text-gray-900 dark:text-white hover:text-[#e94560] transition-colors"
                    >
                      <User className="h-4 w-4" />
                      <span>Login / Register</span>
                    </Link>
                  )}
                  <Link
                    href="/cart"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex w-full items-center gap-2.5 py-1.5 text-sm font-bold text-gray-900 dark:text-white hover:text-[#e94560] transition-colors cursor-pointer"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    <span>Shopping Cart {mounted && totalItems > 0 && `(${totalItems})`}</span>
                  </Link>
                  <Link
                    href="/wishlist"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 py-1.5 text-sm font-bold text-gray-900 dark:text-white hover:text-[#e94560] transition-colors"
                  >
                    <Heart className="h-4 w-4" />
                    <span>My Wishlist {mounted && wishlistCount > 0 && `(${wishlistCount})`}</span>
                  </Link>
                  {settings?.showFaqInNav !== false && (
                    <Link
                      href="/faq"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 py-1.5 text-sm font-bold text-gray-900 dark:text-white hover:text-[#e94560] transition-colors"
                    >
                      <HelpCircle className="h-4 w-4" />
                      <span>FAQ</span>
                    </Link>
                  )}
                  <Link
                    href="/reviews"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 py-1.5 text-sm font-bold text-gray-900 dark:text-white hover:text-[#e94560] transition-colors"
                  >
                    <Star className="h-4 w-4" />
                    <span>Reviews</span>
                  </Link>
                  {settings?.showReturnsInNav !== false && (
                    <Link
                      href="/returns"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 py-1.5 text-sm font-bold text-gray-900 dark:text-white hover:text-[#e94560] transition-colors"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>Return Policy</span>
                    </Link>
                  )}
                  {settings?.showPrivacyInNav !== false && (
                    <Link
                      href="/privacy-policy"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 py-1.5 text-sm font-bold text-gray-900 dark:text-white hover:text-[#e94560] transition-colors"
                    >
                      <Shield className="h-4 w-4" />
                      <span>Privacy Policy</span>
                    </Link>
                  )}
                </div>
              </div>

              {/* Contacts Section inside Mobile Menu drawer */}
              {(topBarPhone || topBarEmail) && (
                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-3">Contact Us</span>
                  <div className="space-y-3">
                    {topBarPhone && (
                      <a
                        href={`tel:${topBarPhone.replace(/\D/g, '')}`}
                        className="flex items-center gap-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:text-[#e94560] transition-colors"
                      >
                        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6.62 10.79a15.15 15.15 0 006.57 6.57l2.2-2.2a1 1 0 01.9-.27 11.36 11.36 0 00.57 3.58 1 1 0 01-.27.9l-2.2 2.2z" />
                        </svg>
                        <span>{topBarPhone}</span>
                      </a>
                    )}
                    {topBarEmail && (
                      <a
                        href={`mailto:${topBarEmail}`}
                        className="flex items-center gap-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:text-[#e94560] transition-colors"
                      >
                        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                        </svg>
                        <span className="truncate">{topBarEmail}</span>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer strip */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 text-[10px] text-gray-400 dark:text-gray-500 font-semibold tracking-wider uppercase shrink-0">
              &copy; {new Date().getFullYear()} {storeName}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* DEDICATED SEARCH POPUP MODAL */}
      {mounted && searchOpen && !isAdmin && createPortal(
        <div className="fixed inset-0 z-[150] bg-black/75 flex items-start justify-center pt-24 px-4 transition-all duration-300 animate-fade-in overscroll-contain">
          <div ref={containerRef} className="bg-white dark:bg-[#16162a] w-full max-w-2xl rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6 relative scale-up transition-all will-change-transform">

            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4 pr-8">
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white">Search Products</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 font-semibold mt-0.5">Find products, categories, colors, sizes instantly</p>
              </div>
              <button
                type="button"
                onClick={handleCloseSearch}
                className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search Input field */}
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setShowSuggestions(false);
                    setSearchOpen(false);
                    router.push(`/shop?search=${encodeURIComponent(searchQuery)}`);
                  }
                }}
                placeholder="Type name, category, color, size, sku..."
                className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0f0f1b] py-3.5 pl-12 pr-12 text-sm font-semibold text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] focus:outline-none focus:ring-4 focus:ring-[#e94560]/10 transition-all duration-200"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {/* Popular Searches when empty */}
            {searchQuery.trim().length === 0 && (
              <div className="space-y-3 pt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Popular Searches</span>
                <div className="flex flex-wrap gap-2">
                  {(settings?.popularSearches
                    ? settings.popularSearches.split(',').map((s) => s.trim()).filter(Boolean)
                    : ['Co-ord Sets', 'Sonic', 'Graphic Tee', 'T-shirt', 'Kids']
                  ).map((term) => (
                    <button
                      key={term}
                      onClick={() => {
                        setSearchQuery(term);
                        setShowSuggestions(true);
                        searchInputRef.current?.focus();
                      }}
                      className="px-3.5 py-1.5 bg-gray-50 dark:bg-gray-800 hover:bg-[#e94560] hover:text-white dark:hover:bg-[#e94560] text-gray-600 dark:text-gray-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {showSuggestions && searchQuery.trim().length > 0 && (
              <div className="mt-2 overflow-hidden py-1 max-h-[320px] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/50">
                {loading ? (
                  <div className="px-4 py-8 text-xs text-gray-500 dark:text-gray-400 flex flex-col items-center justify-center gap-3">
                    <div className="w-6 h-6 rounded-full border-2 border-[#e94560] border-t-transparent animate-spin" />
                    <span className="font-semibold">Searching shop...</span>
                  </div>
                ) : suggestions.length > 0 ? (
                  <div className="space-y-1 pt-1">
                    <div className="pb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      Suggested Products ({suggestions.length})
                    </div>
                    {suggestions.map((product) => {
                      const primaryImage = product.images.find(img => img.isPrimary) || product.images[0];
                      return (
                        <Link
                          key={product.id}
                          href={`/product/${product.slug}`}
                          onClick={() => setSearchOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                        >
                          <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-100 dark:border-gray-800">
                            {primaryImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={primaryImage.url}
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-[10px] text-gray-400">
                                No Img
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate group-hover:text-[#e94560] transition-colors">
                              {product.name}
                            </h4>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                              {product.category?.name || 'Uncategorized'}
                              {product.variants.length > 0 && ` • ${product.variants.length} options`}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="text-xs font-black text-gray-900 dark:text-white">
                              Rs. {product.price.toLocaleString()}
                            </span>
                          </div>
                        </Link>
                      );
                    })}

                    <button
                      onClick={() => {
                        setSearchOpen(false);
                        router.push(`/shop?search=${encodeURIComponent(searchQuery)}`);
                      }}
                      className="w-full text-center mt-3 text-xs font-black text-[#e94560] hover:underline py-2 cursor-pointer"
                    >
                      View all results for "{searchQuery}"
                    </button>
                  </div>
                ) : (
                  <div className="px-4 py-8 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">No products found</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Try searching for another term, category, variant, or color</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
