'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { StoreSettings, NavigationItem } from '@/lib/types';
import { toast } from 'sonner';
import { cleanWhatsAppPhone } from '@/lib/utils/whatsapp';
import { addEmailSubscriberClient } from '@/lib/services/sections-client';
import { ChevronDown, FacebookIcon, InstagramIcon, YoutubeIcon, TiktokIcon, SnapchatIcon, TwitterIcon, WhatsAppIcon } from '@/components/common/Icons';

import PaymentBadges from './PaymentBadges';

interface FooterProps {
  settings: StoreSettings;
}

function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await addEmailSubscriberClient(email.trim());
      toast.success('Thank you for subscribing! 🎉', { description: 'You\'ll receive our latest offers.' });
      setEmail('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('duplicate') || msg.includes('unique') || msg.includes('23505')) {
        toast.info('You\'re already subscribed!');
      } else {
        toast.error('Subscription failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        placeholder="Your email address"
        disabled={loading}
        className="flex-grow rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-100/50 dark:bg-[#16162a]/50 px-3.5 py-2 text-sm font-semibold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#e94560] focus:bg-white dark:focus:bg-[#16162a] disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-xl bg-[#e94560] px-4 py-2 text-xs font-bold text-white hover:bg-[#d8344f] transition-all cursor-pointer shrink-0 disabled:opacity-70"
      >
        {loading ? '...' : 'Subscribe'}
      </button>
    </form>
  );
}

export default function Footer({ settings }: FooterProps) {
  const [mounted, setMounted] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [footerAccordionOpen, setFooterAccordionOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined' && window.self !== window.top) {
      setIsPreview(true);
    }
  }, []);

  const currentYear = new Date().getFullYear();

  // Social Links Check
  const hasSocialLinks =
    settings.socialFacebook ||
    settings.socialInstagram ||
    settings.socialWhatsapp ||
    settings.socialYoutube ||
    settings.socialTiktok ||
    settings.socialSnapchat ||
    settings.socialTwitter;

  const navigationMenu = settings?.navigationMenu ?? [];

  // Footer toggles with defaults to TRUE
  const showMenu = settings.footerShowMenu ?? true;
  const showSocial = settings.footerShowSocial ?? true;
  const showNewsletter = settings.footerShowNewsletter ?? true;
  const showPayments = settings.footerShowPayments ?? true;

  // Calculate dynamic grid columns
  const showCol3 = showMenu;
  const showCol4 = showNewsletter || (showSocial && hasSocialLinks);

  // Recursive footer custom navigation menu list renderer with expand/collapse
  const renderFooterMenu = (items: NavigationItem[], depth = 0) => {
    return items.map((item) => {
      const hasChildren = item.children && item.children.length > 0;
      const isAccOpen = footerAccordionOpen[item.id];
      
      return (
        <li key={item.id} className="w-full space-y-1" style={{ paddingLeft: `${depth * 8}px` }}>
          <div className="flex items-center justify-between">
            <Link 
              href={item.url} 
              className="text-gray-500 hover:text-[#e94560] dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer block text-sm flex-grow"
            >
              {item.label}
            </Link>
            {hasChildren && (
              <button
                type="button"
                onClick={() =>
                  setFooterAccordionOpen((prev) => ({
                    ...prev,
                    [item.id]: !prev[item.id],
                  }))
                }
                className="p-1 text-gray-400 hover:text-[#e94560] dark:hover:text-white transition-colors cursor-pointer"
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${isAccOpen ? 'rotate-180' : ''}`}
                />
              </button>
            )}
          </div>
          {hasChildren && isAccOpen && (
            <ul className="mt-1 space-y-1.5 border-l border-gray-200 dark:border-gray-800 pl-3 mb-1.5 ml-1 animate-fade-in">
              {renderFooterMenu(item.children || [], depth + 1)}
            </ul>
          )}
        </li>
      );
    });
  };
  
  let gridColsClass = "grid-cols-1 sm:grid-cols-2 md:grid-cols-4";
  const activeCols = 2 + (showCol3 ? 1 : 0) + (showCol4 ? 1 : 0);
  if (activeCols === 2) {
    gridColsClass = "grid-cols-1 sm:grid-cols-2 md:grid-cols-2 max-w-4xl";
  } else if (activeCols === 3) {
    gridColsClass = "grid-cols-1 sm:grid-cols-2 md:grid-cols-3";
  }

  return (
    <footer
      onClick={(e) => {
        if (isPreview) {
          e.preventDefault();
          e.stopPropagation();
          window.parent.postMessage({ type: 'select_global_tab', subTab: 'footer' }, '*');
        }
      }}
      className={`w-full bg-white dark:bg-[#0f0f1b] border-t border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 select-none transition-colors duration-200 ${
        isPreview ? 'cursor-pointer hover:ring-2 hover:ring-[#e94560] hover:ring-offset-2' : ''
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        
        {/* Footer Top - Shopify Dynamic Responsive Grid */}
        <div className={`grid gap-8 pb-10 ${gridColsClass}`}>
          
          {/* Column 1: Brand & About */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-gray-900 dark:text-white uppercase tracking-wider">
              {settings.footerCol1Title || 'About Our Store'}
            </h3>
            <div className="space-y-3">
              {settings.tagline && (
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 max-w-sm">
                  {settings.tagline}
                </p>
              )}
              <p className="text-sm font-semibold leading-relaxed max-w-md text-gray-500 dark:text-gray-400">
                {settings.footerText || `Welcome to ${settings.storeName}. We provide premium quality products delivered right to your doorstep. Confirm your orders instantly via WhatsApp.`}
              </p>
              {settings.address && (
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 leading-relaxed">
                  {settings.address}
                </p>
              )}
            </div>
          </div>

          {/* Column 2: Customer Support Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-gray-900 dark:text-white uppercase tracking-wider">
              {settings.footerCol2Title || 'Customer Support'}
            </h3>
            <p className="text-sm font-semibold leading-relaxed whitespace-pre-line text-gray-500 dark:text-gray-400">
              {settings.footerCol2Text || 'Call/WhatsApp: 0328-4114551\nEmail: Totvoguepk@gmail.com\nTimings: 10 AM - 10 PM'}
            </p>
          </div>

          {/* Column 3: Quick Links navigation */}
          {showCol3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-gray-900 dark:text-white uppercase tracking-wider">
                {settings.footerCol3Title || 'Quick Links'}
              </h3>
              {navigationMenu.length > 0 ? (
                <ul className="space-y-2.5 text-sm font-semibold">
                  {renderFooterMenu(navigationMenu)}
                  {/* Append policy links under custom navigation menu if toggled on */}
                  {settings.showFaqInFooter !== false && (
                    <li>
                      <Link href="/faq" className="text-gray-500 hover:text-[#e94560] dark:text-gray-400 dark:hover:text-white transition-colors block">
                        FAQ
                      </Link>
                    </li>
                  )}
                  <li>
                    <Link href="/reviews" className="text-gray-500 hover:text-[#e94560] dark:text-gray-400 dark:hover:text-white transition-colors block">
                      Reviews
                    </Link>
                  </li>
                  {settings.showReturnsInFooter !== false && (
                    <li>
                      <Link href="/returns" className="text-gray-500 hover:text-[#e94560] dark:text-gray-400 dark:hover:text-white transition-colors block">
                        Return Policy
                      </Link>
                    </li>
                  )}
                  {settings.showPrivacyInFooter !== false && (
                    <li>
                      <Link href="/privacy-policy" className="text-gray-500 hover:text-[#e94560] dark:text-gray-400 dark:hover:text-white transition-colors block">
                        Privacy Policy
                      </Link>
                    </li>
                  )}
                </ul>
              ) : (
                <ul className="space-y-2.5 text-sm font-semibold">
                  <li>
                    <Link href="/" className="text-gray-500 hover:text-[#e94560] dark:text-gray-400 dark:hover:text-white transition-colors block">
                      Home
                    </Link>
                  </li>
                  <li>
                    <Link href="/cart" className="text-gray-500 hover:text-[#e94560] dark:text-gray-400 dark:hover:text-white transition-colors block">
                      Cart
                    </Link>
                  </li>
                  <li>
                    <Link href="/reviews" className="text-gray-500 hover:text-[#e94560] dark:text-gray-400 dark:hover:text-white transition-colors block">
                      Reviews
                    </Link>
                  </li>
                  <li>
                    <Link href="/account" className="text-gray-500 hover:text-[#e94560] dark:text-gray-400 dark:hover:text-white transition-colors block">
                      My Account
                    </Link>
                  </li>
                  {settings.showFaqInFooter !== false && (
                    <li>
                      <Link href="/faq" className="text-gray-500 hover:text-[#e94560] dark:text-gray-400 dark:hover:text-white transition-colors block">
                        FAQ
                      </Link>
                    </li>
                  )}
                  {settings.showReturnsInFooter !== false && (
                    <li>
                      <Link href="/returns" className="text-gray-500 hover:text-[#e94560] dark:text-gray-400 dark:hover:text-white transition-colors block">
                        Return Policy
                      </Link>
                    </li>
                  )}
                  {settings.showPrivacyInFooter !== false && (
                    <li>
                      <Link href="/privacy-policy" className="text-gray-500 hover:text-[#e94560] dark:text-gray-400 dark:hover:text-white transition-colors block">
                        Privacy Policy
                      </Link>
                    </li>
                  )}
                </ul>
              )}
            </div>
          )}

          {/* Column 4: Newsletter & Connect */}
          {showCol4 && (
            <div className="space-y-4">
              {showNewsletter && (
                <>
                  <h3 className="text-sm font-extrabold text-gray-900 dark:text-white uppercase tracking-wider">
                    {settings.footerCol4Title || 'Newsletter'}
                  </h3>
                  <p className="text-sm font-semibold leading-relaxed text-gray-500 dark:text-gray-400">
                    {settings.footerCol4Text || 'Subscribe to get special offers, free giveaways, and once-in-a-lifetime deals.'}
                  </p>
                  
                  {/* Newsletter Subscription Form */}
                  <NewsletterForm />
                </>
              )}

              {/* Social Icons row (including TikTok, Snapchat, Twitter) */}
              {showSocial && hasSocialLinks && (
                <div className="pt-2 flex flex-wrap gap-2">
                  {settings.socialFacebook && (
                    <a
                      href={settings.socialFacebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-300 hover:bg-[#e94560] hover:text-white dark:hover:bg-[#e94560] dark:hover:text-white transition-all cursor-pointer"
                      title="Facebook"
                    >
                      <FacebookIcon className="h-4.5 w-4.5" />
                    </a>
                  )}

                  {settings.socialInstagram && (
                    <a
                      href={settings.socialInstagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-300 hover:bg-[#e94560] hover:text-white dark:hover:bg-[#e94560] dark:hover:text-white transition-all cursor-pointer"
                      title="Instagram"
                    >
                      <InstagramIcon className="h-4.5 w-4.5" />
                    </a>
                  )}

                  {settings.socialTiktok && (
                    <a
                      href={settings.socialTiktok}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-300 hover:bg-[#e94560] hover:text-white dark:hover:bg-[#e94560] dark:hover:text-white transition-all cursor-pointer"
                      title="TikTok"
                    >
                      <TiktokIcon className="h-4.5 w-4.5" />
                    </a>
                  )}

                  {settings.socialSnapchat && (
                    <a
                      href={settings.socialSnapchat}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-300 hover:bg-[#e94560] hover:text-white dark:hover:bg-[#e94560] dark:hover:text-white transition-all cursor-pointer"
                      title="Snapchat"
                    >
                      <SnapchatIcon className="h-4.5 w-4.5" />
                    </a>
                  )}

                  {settings.socialTwitter && (
                    <a
                      href={settings.socialTwitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-300 hover:bg-[#e94560] hover:text-white dark:hover:bg-[#e94560] dark:hover:text-white transition-all cursor-pointer"
                      title="Twitter (X)"
                    >
                      <TwitterIcon className="h-4.5 w-4.5" />
                    </a>
                  )}

                  {settings.socialYoutube && (
                    <a
                      href={settings.socialYoutube}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-300 hover:bg-[#e94560] hover:text-white dark:hover:bg-[#e94560] dark:hover:text-white transition-all cursor-pointer"
                      title="YouTube"
                    >
                      <YoutubeIcon className="h-4.5 w-4.5" />
                    </a>
                  )}

                  {settings.socialWhatsapp && (
                    <a
                      href={`https://wa.me/${cleanWhatsAppPhone(settings.socialWhatsapp)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-300 hover:bg-[#10b981] hover:text-white dark:hover:bg-[#10b981] dark:hover:text-white transition-all cursor-pointer"
                      title="WhatsApp"
                    >
                      <WhatsAppIcon className="h-4.5 w-4.5" />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Bottom (Divider & Copyright) */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            {settings.footerBottomText ? settings.footerBottomText : `© ${currentYear} ${settings.storeName || 'Zaynahs E-Store'}. All rights reserved.`}
          </p>
          {showPayments && settings.enableTrustBadges && settings.safeCheckoutMethods && settings.safeCheckoutMethods.length > 0 && (
            <PaymentBadges methods={settings.safeCheckoutMethods} className="flex flex-wrap items-center gap-1.5 justify-end" />
          )}
        </div>

      </div>
    </footer>
  );
}
