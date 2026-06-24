'use client';

import React, { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { useAdminTab } from '@/lib/hooks/useAdminTab';
import { 
  ShoppingBag, 
  FolderOpen, 
  Star, 
  Trash2, 
  RefreshCw,
  Search,
  ClipboardList,
  Users,
  Images,
  MessageSquare,
  Phone,
  Mail,
  Ruler,
  Layers
} from '@/components/common/Icons';
import { Product, Category, Review, Order, WhatsAppSubscriber, EmailSubscriber, SizeGuide, VariantPreset } from '@/lib/types';
import { restoreProduct, hardDeleteProduct } from '@/lib/services/products';
import { restoreCategory, hardDeleteCategory } from '@/lib/services/categories';
import { restoreReview, hardDeleteReview } from '@/lib/services/reviews';
import { restoreOrder, hardDeleteOrder } from '@/lib/services/orders';
import { restoreCustomer, hardDeleteCustomer } from '@/lib/services/customers';
import { restoreMedia, hardDeleteMedia, TrashedMedia } from '@/lib/services/media';
import { 
  restoreWhatsAppSubscriber, 
  hardDeleteWhatsAppSubscriber, 
  restoreEmailSubscriber, 
  hardDeleteEmailSubscriber 
} from '@/lib/services/sections';
import { restoreSizeGuide, hardDeleteSizeGuide, getDeletedSizeGuides } from '@/lib/services/sizeGuides';
import { restoreVariantPreset, hardDeleteVariantPreset, getDeletedVariantPresets } from '@/lib/services/variantPresets';
import {
  bulkRestoreProducts,
  bulkHardDeleteProducts,
  bulkRestoreCategories,
  bulkHardDeleteCategories,
  bulkRestoreReviews,
  bulkHardDeleteReviews,
  bulkRestoreOrders,
  bulkHardDeleteOrders,
  bulkRestoreCustomers,
  bulkHardDeleteCustomers,
  bulkRestoreMedia,
  bulkHardDeleteMedia,
  bulkRestoreLeads,
  bulkHardDeleteLeads,
  bulkRestoreSizeGuides, bulkHardDeleteSizeGuides,
  bulkRestoreVariantPresets, bulkHardDeleteVariantPresets
} from '@/lib/services/trash';
import EmptyState from '@/components/common/EmptyState';

interface TrashConsoleProps {
  initialProducts: Product[];
  initialCategories: Category[];
  initialReviews: (Review & { productName?: string })[];
  initialOrders: Order[];
  initialCustomers: any[];
  initialMedia: TrashedMedia[];
  initialWhatsAppSubscribers: WhatsAppSubscriber[];
  initialEmailSubscribers: EmailSubscriber[];
  initialSizeGuides: SizeGuide[];
  initialVariantPresets: VariantPreset[];
}

type TabType = 'products' | 'categories' | 'reviews' | 'orders' | 'customers' | 'media' | 'leads' | 'size_guides' | 'variant_presets';

export default function TrashConsole({
  initialProducts,
  initialCategories,
  initialReviews,
  initialOrders,
  initialCustomers,
  initialMedia,
  initialWhatsAppSubscribers,
  initialEmailSubscribers,
  initialSizeGuides,
  initialVariantPresets
}: TrashConsoleProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [reviews, setReviews] = useState<(Review & { productName?: string })[]>(initialReviews);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [customers, setCustomers] = useState<any[]>(initialCustomers);
  const [media, setMedia] = useState<TrashedMedia[]>(initialMedia);
  const [whatsappSubscribers, setWhatsappSubscribers] = useState<WhatsAppSubscriber[]>(initialWhatsAppSubscribers);
  const [emailSubscribers, setEmailSubscribers] = useState<EmailSubscriber[]>(initialEmailSubscribers);
  const [sizeGuides, setSizeGuides] = useState<SizeGuide[]>(initialSizeGuides);
  const [variantPresets, setVariantPresets] = useState<VariantPreset[]>(initialVariantPresets);

  const [activeTab, setActiveTab] = useAdminTab<TabType>('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  // Dialog states for confirming deletes
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string;
    type: TabType;
    name: string;
    extraInfo?: any;
  } | null>(null);

  const [confirmBulkDelete, setConfirmBulkDelete] = useState<boolean>(false);
  const [confirmEmptyTab, setConfirmEmptyTab] = useState<boolean>(false);
  const [confirmEmptyCompleteTrash, setConfirmEmptyCompleteTrash] = useState<boolean>(false);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchTerm('');
    setSelectedIds([]);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Filters
  const filteredProducts = products.filter(p => {
    const term = searchTerm.toLowerCase();
    return (
      (p.name || '').toLowerCase().includes(term) ||
      (p.sku || '').toLowerCase().includes(term)
    );
  });

  const filteredCategories = categories.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(term) ||
      (c.slug || '').toLowerCase().includes(term)
    );
  });

  const filteredReviews = reviews.filter(r => {
    const term = searchTerm.toLowerCase();
    return (
      (r.customerName || '').toLowerCase().includes(term) ||
      (r.comment || '').toLowerCase().includes(term) ||
      (r.productName || '').toLowerCase().includes(term)
    );
  });

  const filteredOrders = orders.filter(o => {
    const term = searchTerm.toLowerCase();
    return (
      (o.orderNumber || '').toLowerCase().includes(term) ||
      (o.customerName || '').toLowerCase().includes(term) ||
      (o.customerPhone || '').toLowerCase().includes(term)
    );
  });

  const filteredCustomers = customers.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(term) ||
      (c.email || '').toLowerCase().includes(term) ||
      (c.phone || '').toLowerCase().includes(term)
    );
  });

  const filteredMedia = media.filter(m => {
    const term = (searchTerm || '').toLowerCase().trim();
    if (!term) return true;
    const filename = (m.original_filename || m.seo_filename || 'untitled').toLowerCase();
    const title = (m.title || '').toLowerCase();
    const url = (m.file_url || '').toLowerCase();
    return filename.includes(term) || title.includes(term) || url.includes(term);
  });

  // Combine whatsapp and email subscribers for UI listing
  const combinedLeads = [
    ...whatsappSubscribers.map(w => ({
      id: w.id,
      type: 'whatsapp' as const,
      name: w.name || 'WhatsApp Subscriber',
      contact: w.phone,
      source: w.source_type || 'WhatsApp Popup',
      createdAt: w.created_at,
    })),
    ...emailSubscribers.map(e => ({
      id: e.id,
      type: 'email' as const,
      name: 'Newsletter Subscriber',
      contact: e.email,
      source: e.source || 'Newsletter Form',
      createdAt: e.created_at,
    }))
  ].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  const filteredLeads = combinedLeads.filter(lead => {
    const term = searchTerm.toLowerCase();
    return (
      (lead.name || '').toLowerCase().includes(term) ||
      (lead.contact || '').toLowerCase().includes(term) ||
      (lead.source || '').toLowerCase().includes(term)
    );
  });

  const filteredSizeGuides = sizeGuides.filter(sg => {
    const term = searchTerm.toLowerCase();
    return (sg.name || '').toLowerCase().includes(term);
  });

  const filteredVariantPresets = variantPresets.filter(vp => {
    const term = searchTerm.toLowerCase();
    return (vp.name || '').toLowerCase().includes(term);
  });

  const getActiveTabItems = () => {
    switch (activeTab) {
      case 'products': return filteredProducts;
      case 'categories': return filteredCategories;
      case 'reviews': return filteredReviews;
      case 'orders': return filteredOrders;
      case 'customers': return filteredCustomers;
      case 'media': return filteredMedia;
      case 'leads': return filteredLeads;
      case 'size_guides': return filteredSizeGuides;
      case 'variant_presets': return filteredVariantPresets;
      default: return [];
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const items = getActiveTabItems();
      setSelectedIds(items.map(item => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleRestore = async (id: string, type: TabType, extraInfo?: any) => {
    startTransition(async () => {
      try {
        if (type === 'products') {
          await restoreProduct(id);
          setProducts(prev => prev.filter(p => p.id !== id));
          toast.success('Product restored successfully');
        } else if (type === 'categories') {
          await restoreCategory(id);
          setCategories(prev => prev.filter(c => c.id !== id));
          toast.success('Category restored successfully');
        } else if (type === 'reviews') {
          await restoreReview(id);
          setReviews(prev => prev.filter(r => r.id !== id));
          toast.success('Review restored successfully');
        } else if (type === 'orders') {
          await restoreOrder(id);
          setOrders(prev => prev.filter(o => o.id !== id));
          toast.success('Order restored successfully');
        } else if (type === 'customers') {
          await restoreCustomer(id);
          setCustomers(prev => prev.filter(c => c.id !== id));
          toast.success('Customer restored successfully');
        } else if (type === 'media') {
          await restoreMedia(id);
          setMedia(prev => prev.filter(m => m.id !== id));
          toast.success('Media file restored successfully');
          } else if (type === 'leads') {
            if (extraInfo?.leadType === 'whatsapp') {
              await restoreWhatsAppSubscriber(id);
              setWhatsappSubscribers(prev => prev.filter(s => s.id !== id));
            } else {
              await restoreEmailSubscriber(id);
              setEmailSubscribers(prev => prev.filter(s => s.id !== id));
            }
            toast.success('Lead restored successfully');
          } else if (type === 'size_guides') {
            await restoreSizeGuide(id);
            setSizeGuides(prev => prev.filter(x => x.id !== id));
            toast.success('Size guide restored successfully');
          } else if (type === 'variant_presets') {
            await restoreVariantPreset(id);
            setVariantPresets(prev => prev.filter(x => x.id !== id));
            toast.success('Variant preset restored successfully');
          }
          setSelectedIds(prev => prev.filter(x => x !== id));
      } catch (error) {
        console.error(`Restore failed for ${type}:`, error);
        toast.error(`Failed to restore ${type}`);
      }
    });
  };

  const handleHardDelete = async () => {
    if (!confirmDelete) return;
    const { id, type, extraInfo } = confirmDelete;

    startTransition(async () => {
      try {
        if (type === 'products') {
          await hardDeleteProduct(id);
          setProducts(prev => prev.filter(p => p.id !== id));
          toast.success('Product permanently deleted');
        } else if (type === 'categories') {
          await hardDeleteCategory(id);
          setCategories(prev => prev.filter(c => c.id !== id));
          toast.success('Category permanently deleted');
        } else if (type === 'reviews') {
          await hardDeleteReview(id);
          setReviews(prev => prev.filter(r => r.id !== id));
          toast.success('Review permanently deleted');
        } else if (type === 'orders') {
          await hardDeleteOrder(id);
          setOrders(prev => prev.filter(o => o.id !== id));
          toast.success('Order permanently deleted');
        } else if (type === 'customers') {
          await hardDeleteCustomer(id);
          setCustomers(prev => prev.filter(c => c.id !== id));
          toast.success('Customer permanently deleted');
        } else if (type === 'media') {
          await hardDeleteMedia(id, extraInfo?.fileUrl || '');
          setMedia(prev => prev.filter(m => m.id !== id));
          toast.success('Media permanently deleted');
          } else if (type === 'leads') {
            if (extraInfo?.leadType === 'whatsapp') {
              await hardDeleteWhatsAppSubscriber(id);
              setWhatsappSubscribers(prev => prev.filter(s => s.id !== id));
            } else {
              await hardDeleteEmailSubscriber(id);
              setEmailSubscribers(prev => prev.filter(s => s.id !== id));
            }
            toast.success('Lead permanently deleted');
          } else if (type === 'size_guides') {
            await hardDeleteSizeGuide(id);
            setSizeGuides(prev => prev.filter(x => x.id !== id));
            toast.success('Size guide permanently deleted');
          } else if (type === 'variant_presets') {
            await hardDeleteVariantPreset(id);
            setVariantPresets(prev => prev.filter(x => x.id !== id));
            toast.success('Variant preset permanently deleted');
          }
        setSelectedIds(prev => prev.filter(x => x !== id));
        setConfirmDelete(null);
      } catch (error) {
        console.error(`Permanent delete failed for ${type}:`, error);
        toast.error(`Failed to delete ${type}`);
      }
    });
  };

  const handleBulkRestore = async () => {
    if (selectedIds.length === 0) return;
    startTransition(async () => {
      try {
        const idsToRestore = [...selectedIds];
        if (activeTab === 'products') {
          await bulkRestoreProducts(idsToRestore);
          setProducts(prev => prev.filter(p => !idsToRestore.includes(p.id)));
        } else if (activeTab === 'categories') {
          await bulkRestoreCategories(idsToRestore);
          setCategories(prev => prev.filter(c => !idsToRestore.includes(c.id)));
        } else if (activeTab === 'reviews') {
          await bulkRestoreReviews(idsToRestore);
          setReviews(prev => prev.filter(r => !idsToRestore.includes(r.id)));
        } else if (activeTab === 'orders') {
          await bulkRestoreOrders(idsToRestore);
          setOrders(prev => prev.filter(o => !idsToRestore.includes(o.id)));
        } else if (activeTab === 'customers') {
          await bulkRestoreCustomers(idsToRestore);
          setCustomers(prev => prev.filter(c => !idsToRestore.includes(c.id)));
        } else if (activeTab === 'media') {
          await bulkRestoreMedia(idsToRestore);
          setMedia(prev => prev.filter(m => !idsToRestore.includes(m.id)));
        } else if (activeTab === 'leads') {
          const whatsappIds = idsToRestore.filter(id => {
            const lead = combinedLeads.find(l => l.id === id);
            return lead?.type === 'whatsapp';
          });
          const emailIds = idsToRestore.filter(id => {
            const lead = combinedLeads.find(l => l.id === id);
            return lead?.type === 'email';
          });
          await bulkRestoreLeads(whatsappIds, emailIds);
          setWhatsappSubscribers(prev => prev.filter(s => !whatsappIds.includes(s.id)));
          setEmailSubscribers(prev => prev.filter(s => !emailIds.includes(s.id)));
        } else if (activeTab === 'size_guides') {
          await bulkRestoreSizeGuides(idsToRestore);
          setSizeGuides(prev => prev.filter(sg => !idsToRestore.includes(sg.id)));
        } else if (activeTab === 'variant_presets') {
          await bulkRestoreVariantPresets(idsToRestore);
          setVariantPresets(prev => prev.filter(vp => !idsToRestore.includes(vp.id)));
        }
        setSelectedIds([]);
        toast.success(`Restored ${idsToRestore.length} item(s) successfully`);
      } catch (error) {
        console.error('Bulk restore failed:', error);
        toast.error('Failed to restore selected items');
      }
    });
  };

  const handleBulkHardDelete = async () => {
    if (selectedIds.length === 0) return;
    startTransition(async () => {
      try {
        const idsToDelete = [...selectedIds];
        if (activeTab === 'products') {
          await bulkHardDeleteProducts(idsToDelete);
          setProducts(prev => prev.filter(p => !idsToDelete.includes(p.id)));
        } else if (activeTab === 'categories') {
          await bulkHardDeleteCategories(idsToDelete);
          setCategories(prev => prev.filter(c => !idsToDelete.includes(c.id)));
        } else if (activeTab === 'reviews') {
          await bulkHardDeleteReviews(idsToDelete);
          setReviews(prev => prev.filter(r => !idsToDelete.includes(r.id)));
        } else if (activeTab === 'orders') {
          await bulkHardDeleteOrders(idsToDelete);
          setOrders(prev => prev.filter(o => !idsToDelete.includes(o.id)));
        } else if (activeTab === 'customers') {
          await bulkHardDeleteCustomers(idsToDelete);
          setCustomers(prev => prev.filter(c => !idsToDelete.includes(c.id)));
        } else if (activeTab === 'media') {
          const mediaItems = idsToDelete.map(id => {
            const m = media.find(item => item.id === id);
            return { id, url: m?.file_url || '' };
          });
          await bulkHardDeleteMedia(mediaItems);
          setMedia(prev => prev.filter(m => !idsToDelete.includes(m.id)));
        } else if (activeTab === 'leads') {
          const whatsappIds = idsToDelete.filter(id => {
            const lead = combinedLeads.find(l => l.id === id);
            return lead?.type === 'whatsapp';
          });
          const emailIds = idsToDelete.filter(id => {
            const lead = combinedLeads.find(l => l.id === id);
            return lead?.type === 'email';
          });
          await bulkHardDeleteLeads(whatsappIds, emailIds);
          setWhatsappSubscribers(prev => prev.filter(s => !whatsappIds.includes(s.id)));
          setEmailSubscribers(prev => prev.filter(s => !emailIds.includes(s.id)));
        } else if (activeTab === 'size_guides') {
          await bulkHardDeleteSizeGuides(idsToDelete);
          setSizeGuides(prev => prev.filter(sg => !idsToDelete.includes(sg.id)));
        } else if (activeTab === 'variant_presets') {
          await bulkHardDeleteVariantPresets(idsToDelete);
          setVariantPresets(prev => prev.filter(vp => !idsToDelete.includes(vp.id)));
        }
        setSelectedIds([]);
        setConfirmBulkDelete(false);
        toast.success(`Permanently deleted ${idsToDelete.length} item(s)`);
      } catch (error) {
        console.error('Bulk permanent delete failed:', error);
        toast.error('Failed to permanently delete selected items');
      }
    });
  };

  const handleEmptyTab = async () => {
    const items = getActiveTabItems();
    if (items.length === 0) return;
    startTransition(async () => {
      try {
        const idsToDelete = items.map(x => x.id);
        if (activeTab === 'products') {
          await bulkHardDeleteProducts(idsToDelete);
          setProducts(prev => prev.filter(p => !idsToDelete.includes(p.id)));
        } else if (activeTab === 'categories') {
          await bulkHardDeleteCategories(idsToDelete);
          setCategories(prev => prev.filter(c => !idsToDelete.includes(c.id)));
        } else if (activeTab === 'reviews') {
          await bulkHardDeleteReviews(idsToDelete);
          setReviews(prev => prev.filter(r => !idsToDelete.includes(r.id)));
        } else if (activeTab === 'orders') {
          await bulkHardDeleteOrders(idsToDelete);
          setOrders(prev => prev.filter(o => !idsToDelete.includes(o.id)));
        } else if (activeTab === 'customers') {
          await bulkHardDeleteCustomers(idsToDelete);
          setCustomers(prev => prev.filter(c => !idsToDelete.includes(c.id)));
        } else if (activeTab === 'media') {
          const mediaItems = idsToDelete.map(id => {
            const m = media.find(item => item.id === id);
            return { id, url: m?.file_url || '' };
          });
          await bulkHardDeleteMedia(mediaItems);
          setMedia(prev => prev.filter(m => !idsToDelete.includes(m.id)));
        } else if (activeTab === 'leads') {
          const whatsappIds = idsToDelete.filter(id => {
            const lead = combinedLeads.find(l => l.id === id);
            return lead?.type === 'whatsapp';
          });
          const emailIds = idsToDelete.filter(id => {
            const lead = combinedLeads.find(l => l.id === id);
            return lead?.type === 'email';
          });
          await bulkHardDeleteLeads(whatsappIds, emailIds);
          setWhatsappSubscribers(prev => prev.filter(s => !whatsappIds.includes(s.id)));
          setEmailSubscribers(prev => prev.filter(s => !emailIds.includes(s.id)));
        } else if (activeTab === 'size_guides') {
          await bulkHardDeleteSizeGuides(idsToDelete);
          setSizeGuides(prev => prev.filter(sg => !idsToDelete.includes(sg.id)));
        } else if (activeTab === 'variant_presets') {
          await bulkHardDeleteVariantPresets(idsToDelete);
          setVariantPresets(prev => prev.filter(vp => !idsToDelete.includes(vp.id)));
        }
        setSelectedIds([]);
        setConfirmEmptyTab(false);
        toast.success(`Successfully emptied all items in this tab`);
      } catch (error) {
        console.error('Empty tab failed:', error);
        toast.error('Failed to empty tab trash');
      }
    });
  };

  const handleEmptyCompleteTrash = async () => {
    startTransition(async () => {
      try {
        // 1. Products
        if (products.length > 0) {
          const ids = products.map(p => p.id);
          await bulkHardDeleteProducts(ids);
          setProducts([]);
        }
        // 2. Categories
        if (categories.length > 0) {
          const ids = categories.map(c => c.id);
          await bulkHardDeleteCategories(ids);
          setCategories([]);
        }
        // 3. Reviews
        if (reviews.length > 0) {
          const ids = reviews.map(r => r.id);
          await bulkHardDeleteReviews(ids);
          setReviews([]);
        }
        // 4. Orders
        if (orders.length > 0) {
          const ids = orders.map(o => o.id);
          await bulkHardDeleteOrders(ids);
          setOrders([]);
        }
        // 5. Customers
        if (customers.length > 0) {
          const ids = customers.map(c => c.id);
          await bulkHardDeleteCustomers(ids);
          setCustomers([]);
        }
        // 6. Media
        if (media.length > 0) {
          const mediaItems = media.map(m => ({ id: m.id, url: m.file_url }));
          await bulkHardDeleteMedia(mediaItems);
          setMedia([]);
        }
        // 7. Leads (WhatsApp + Email)
        const whatsappIds = whatsappSubscribers.map(w => w.id);
        const emailIds = emailSubscribers.map(e => e.id);
        if (whatsappIds.length > 0 || emailIds.length > 0) {
          await bulkHardDeleteLeads(whatsappIds, emailIds);
          setWhatsappSubscribers([]);
          setEmailSubscribers([]);
        }
        // 8. Size Guides
        if (sizeGuides.length > 0) {
          const ids = sizeGuides.map(sg => sg.id);
          await bulkHardDeleteSizeGuides(ids);
          setSizeGuides([]);
        }
        // 9. Variant Presets
        if (variantPresets.length > 0) {
          const ids = variantPresets.map(vp => vp.id);
          await bulkHardDeleteVariantPresets(ids);
          setVariantPresets([]);
        }

        setSelectedIds([]);
        setConfirmEmptyCompleteTrash(false);
        toast.success('All trash bins emptied successfully!');
      } catch (error) {
        console.error('Empty complete trash failed:', error);
        toast.error('Failed to empty all trash');
      }
    });
  };

  const renderProductTab = () => {
    if (filteredProducts.length === 0) {
      return (
        <EmptyState 
          title="No trashed products" 
          description={searchTerm ? "No products matching your search term." : "Your trash bin is clean of products."} 
        />
      );
    }

    return (
      <div className="space-y-4">
        {/* Mobile View: Cards */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {filteredProducts.map(product => {
            const primaryImg = product.images?.find(i => i.isPrimary) || product.images?.[0];
            const isSelected = selectedIds.includes(product.id);
            return (
              <div 
                key={product.id} 
                className={`bg-white dark:bg-[#16162a] p-4 rounded-2xl border shadow-sm flex flex-col space-y-3 transition-colors ${
                  isSelected ? 'border-[#e94560] bg-[#e94560]/5 dark:bg-[#e94560]/5' : 'border-gray-100 dark:border-gray-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(product.id)}
                    className="h-4.5 w-4.5 rounded-md border-gray-300 text-[#e94560] focus:ring-[#e94560] cursor-pointer"
                  />
                  <div className="relative h-14 w-14 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 dark:border-gray-850 flex-shrink-0">
                    {primaryImg ? (
                      <img 
                        src={primaryImg.url} 
                        alt={product.name} 
                        className="h-full w-full object-cover" 
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-gray-800">
                        <ShoppingBag className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-gray-900 dark:text-white truncate">{product.name}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-450 truncate">
                      SKU: {product.sku || 'N/A'} | Price: PKR {product.price}
                    </p>
                    {product.deletedAt && (
                      <p suppressHydrationWarning={true} className="text-[10px] text-gray-400 mt-0.5">
                        Deleted: {new Date(product.deletedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-2 border-t border-gray-50 dark:border-gray-800/50">
                  <button
                    onClick={() => handleRestore(product.id, 'products')}
                    disabled={isPending}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Restore
                  </button>
                  <button
                    onClick={() => setConfirmDelete({ id: product.id, type: 'products', name: product.name })}
                    disabled={isPending}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Forever
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-hidden bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="w-12 py-4 px-6">
                  <input
                    type="checkbox"
                    checked={filteredProducts.length > 0 && filteredProducts.every(p => selectedIds.includes(p.id))}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4.5 w-4.5 rounded-md border-gray-300 text-[#e94560] focus:ring-[#e94560] cursor-pointer"
                  />
                </th>
                <th className="py-4 px-6">Product</th>
                <th className="py-4 px-6">SKU</th>
                <th className="py-4 px-6">Price</th>
                <th className="py-4 px-6">Deleted At</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80 text-sm">
              {filteredProducts.map(product => {
                const primaryImg = product.images?.find(i => i.isPrimary) || product.images?.[0];
                const isSelected = selectedIds.includes(product.id);
                return (
                  <tr key={product.id} className={`hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors ${isSelected ? 'bg-[#e94560]/2 dark:bg-[#e94560]/2' : ''}`}>
                    <td className="py-4 px-6">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(product.id)}
                        className="h-4.5 w-4.5 rounded-md border-gray-300 text-[#e94560] focus:ring-[#e94560] cursor-pointer"
                      />
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-gray-50 border border-gray-150 dark:border-gray-800 flex-shrink-0">
                          {primaryImg ? (
                            <img 
                              src={primaryImg.url} 
                              alt={product.name} 
                              className="h-full w-full object-cover" 
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-gray-800">
                              <ShoppingBag className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">{product.name}</p>
                          <p className="text-xs text-gray-500 truncate max-w-xs">{product.category?.name || 'No Category'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-500 dark:text-gray-400">{product.sku || 'N/A'}</td>
                    <td className="py-4 px-6 font-semibold text-gray-900 dark:text-white">PKR {product.price}</td>
                    <td suppressHydrationWarning={true} className="py-4 px-6 text-gray-500 dark:text-gray-400 text-xs">
                      {product.deletedAt ? new Date(product.deletedAt).toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleRestore(product.id, 'products')}
                          disabled={isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all active:scale-95 disabled:opacity-50"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Restore
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ id: product.id, type: 'products', name: product.name })}
                          disabled={isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all active:scale-95 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete Forever
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderCategoryTab = () => {
    if (filteredCategories.length === 0) {
      return (
        <EmptyState 
          title="No trashed categories" 
          description={searchTerm ? "No categories matching your search term." : "Your trash bin is clean of categories."} 
        />
      );
    }

    return (
      <div className="space-y-4">
        {/* Mobile View: Cards */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {filteredCategories.map(category => {
            const isSelected = selectedIds.includes(category.id);
            return (
              <div 
                key={category.id} 
                className={`bg-white dark:bg-[#16162a] p-4 rounded-2xl border shadow-sm flex flex-col space-y-3 transition-colors ${
                  isSelected ? 'border-[#e94560] bg-[#e94560]/5 dark:bg-[#e94560]/5' : 'border-gray-100 dark:border-gray-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(category.id)}
                    className="h-4.5 w-4.5 rounded-md border-gray-300 text-[#e94560] focus:ring-[#e94560] cursor-pointer"
                  />
                  <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 dark:border-gray-850 flex-shrink-0 flex items-center justify-center">
                    {category.imageUrl ? (
                      <img 
                        src={category.imageUrl} 
                        alt={category.name} 
                        className="h-full w-full object-cover" 
                      />
                    ) : (
                      <FolderOpen className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-gray-900 dark:text-white truncate">{category.name}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-450 truncate">
                      Slug: {category.slug}
                    </p>
                    {category.deletedAt && (
                      <p suppressHydrationWarning={true} className="text-[10px] text-gray-400 mt-0.5">
                        Deleted: {new Date(category.deletedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-2 border-t border-gray-50 dark:border-gray-800/50">
                  <button
                    onClick={() => handleRestore(category.id, 'categories')}
                    disabled={isPending}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Restore
                  </button>
                  <button
                    onClick={() => setConfirmDelete({ id: category.id, type: 'categories', name: category.name })}
                    disabled={isPending}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Forever
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-hidden bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="w-12 py-4 px-6">
                  <input
                    type="checkbox"
                    checked={filteredCategories.length > 0 && filteredCategories.every(c => selectedIds.includes(c.id))}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4.5 w-4.5 rounded-md border-gray-300 text-[#e94560] focus:ring-[#e94560] cursor-pointer"
                  />
                </th>
                <th className="py-4 px-6">Category</th>
                <th className="py-4 px-6">Slug</th>
                <th className="py-4 px-6">Deleted At</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80 text-sm">
              {filteredCategories.map(category => {
                const isSelected = selectedIds.includes(category.id);
                return (
                  <tr key={category.id} className={`hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors ${isSelected ? 'bg-[#e94560]/2 dark:bg-[#e94560]/2' : ''}`}>
                    <td className="py-4 px-6">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(category.id)}
                        className="h-4.5 w-4.5 rounded-md border-gray-300 text-[#e94560] focus:ring-[#e94560] cursor-pointer"
                      />
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-gray-50 border border-gray-150 dark:border-gray-800 flex-shrink-0 flex items-center justify-center">
                          {category.imageUrl ? (
                            <img 
                              src={category.imageUrl} 
                              alt={category.name} 
                              className="h-full w-full object-cover" 
                            />
                          ) : (
                            <FolderOpen className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <p className="font-bold text-gray-900 dark:text-white">{category.name}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-500 dark:text-gray-400">{category.slug}</td>
                    <td suppressHydrationWarning={true} className="py-4 px-6 text-gray-500 dark:text-gray-400 text-xs">
                      {category.deletedAt ? new Date(category.deletedAt).toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleRestore(category.id, 'categories')}
                          disabled={isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all active:scale-95 disabled:opacity-50"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Restore
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ id: category.id, type: 'categories', name: category.name })}
                          disabled={isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all active:scale-95 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete Forever
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderReviewTab = () => {
    if (filteredReviews.length === 0) {
      return (
        <EmptyState 
          title="No trashed reviews" 
          description={searchTerm ? "No reviews matching your search term." : "Your trash bin is clean of reviews."} 
        />
      );
    }

    return (
      <div className="space-y-4">
        {/* Mobile View: Cards */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {filteredReviews.map(review => {
            const isSelected = selectedIds.includes(review.id);
            return (
              <div 
                key={review.id} 
                className={`bg-white dark:bg-[#16162a] p-4 rounded-2xl border shadow-sm flex flex-col space-y-3 transition-colors ${
                  isSelected ? 'border-[#e94560] bg-[#e94560]/5 dark:bg-[#e94560]/5' : 'border-gray-100 dark:border-gray-800'
                }`}
              >
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(review.id)}
                        className="h-4.5 w-4.5 rounded-md border-gray-300 text-[#e94560] focus:ring-[#e94560] cursor-pointer"
                      />
                      <h4 className="font-bold text-gray-900 dark:text-white truncate">{review.customerName}</h4>
                    </div>
                    <div className="flex items-center text-amber-400 gap-0.5">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-bold">{review.rating}</span>
                    </div>
                  </div>
                  {review.productName && (
                    <p className="text-xs text-[#e94560] font-medium truncate">
                      Product: {review.productName}
                    </p>
                  )}
                  {review.comment && (
                    <p className="text-xs text-gray-650 dark:text-gray-400 italic line-clamp-3">
                      "{review.comment}"
                    </p>
                  )}
                  {review.deletedAt && (
                    <p suppressHydrationWarning={true} className="text-[10px] text-gray-400 mt-1">
                      Deleted: {new Date(review.deletedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 justify-end pt-2 border-t border-gray-50 dark:border-gray-800/50">
                  <button
                    onClick={() => handleRestore(review.id, 'reviews')}
                    disabled={isPending}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Restore
                  </button>
                  <button
                    onClick={() => setConfirmDelete({ id: review.id, type: 'reviews', name: `Review by ${review.customerName}` })}
                    disabled={isPending}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Forever
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-hidden bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="w-12 py-4 px-6">
                  <input
                    type="checkbox"
                    checked={filteredReviews.length > 0 && filteredReviews.every(r => selectedIds.includes(r.id))}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4.5 w-4.5 rounded-md border-gray-300 text-[#e94560] focus:ring-[#e94560] cursor-pointer"
                  />
                </th>
                <th className="py-4 px-6">Customer</th>
                <th className="py-4 px-6">Product</th>
                <th className="py-4 px-6">Rating & Comment</th>
                <th className="py-4 px-6">Deleted At</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80 text-sm">
              {filteredReviews.map(review => {
                const isSelected = selectedIds.includes(review.id);
                return (
                  <tr key={review.id} className={`hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors ${isSelected ? 'bg-[#e94560]/2 dark:bg-[#e94560]/2' : ''}`}>
                    <td className="py-4 px-6">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(review.id)}
                        className="h-4.5 w-4.5 rounded-md border-gray-300 text-[#e94560] focus:ring-[#e94560] cursor-pointer"
                      />
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">{review.customerName}</p>
                        {review.customerPhone && (
                          <p className="text-xs text-gray-500 truncate max-w-xs">{review.customerPhone}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-500 dark:text-gray-400 font-medium">
                      {review.productName || 'Unknown Product'}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col space-y-1 max-w-md">
                        <div className="flex items-center text-amber-400 gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`h-3.5 w-3.5 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-700'}`} 
                            />
                          ))}
                        </div>
                        {review.comment && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 italic line-clamp-2">
                            "{review.comment}"
                          </p>
                        )}
                      </div>
                    </td>
                    <td suppressHydrationWarning={true} className="py-4 px-6 text-gray-500 dark:text-gray-400 text-xs">
                      {review.deletedAt ? new Date(review.deletedAt).toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleRestore(review.id, 'reviews')}
                          disabled={isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all active:scale-95 disabled:opacity-50"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Restore
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ id: review.id, type: 'reviews', name: `Review by ${review.customerName}` })}
                          disabled={isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all active:scale-95 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete Forever
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderOrderTab = () => {
    if (filteredOrders.length === 0) {
      return (
        <EmptyState 
          title="No trashed orders" 
          description={searchTerm ? "No orders matching your search term." : "Your trash bin is clean of orders."} 
        />
      );
    }

    return (
      <div className="space-y-4">
        {/* Mobile View: Cards */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {filteredOrders.map(order => {
            const isSelected = selectedIds.includes(order.id);
            return (
              <div 
                key={order.id} 
                className={`bg-white dark:bg-[#16162a] p-4 rounded-2xl border shadow-sm flex flex-col space-y-3 transition-colors ${
                  isSelected ? 'border-[#e94560] bg-[#e94560]/5 dark:bg-[#e94560]/5' : 'border-gray-100 dark:border-gray-800'
                }`}
              >
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(order.id)}
                        className="h-4.5 w-4.5 rounded-md border-gray-300 text-[#e94560] focus:ring-[#e94560] cursor-pointer"
                      />
                      <h4 className="font-bold text-gray-900 dark:text-white truncate">#{order.orderNumber}</h4>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 uppercase">
                      {order.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Customer: {order.customerName || 'Guest'} ({order.customerPhone || 'N/A'})
                  </p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">
                    Total: PKR {order.total}
                  </p>
                  {order.deletedAt && (
                    <p suppressHydrationWarning={true} className="text-[10px] text-gray-400 mt-1">
                      Deleted: {new Date(order.deletedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 justify-end pt-2 border-t border-gray-50 dark:border-gray-800/50">
                  <button
                    onClick={() => handleRestore(order.id, 'orders')}
                    disabled={isPending}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Restore
                  </button>
                  <button
                    onClick={() => setConfirmDelete({ id: order.id, type: 'orders', name: `Order #${order.orderNumber}` })}
                    disabled={isPending}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Forever
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-hidden bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="w-12 py-4 px-6">
                  <input
                    type="checkbox"
                    checked={filteredOrders.length > 0 && filteredOrders.every(o => selectedIds.includes(o.id))}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4.5 w-4.5 rounded-md border-gray-300 text-[#e94560] focus:ring-[#e94560] cursor-pointer"
                  />
                </th>
                <th className="py-4 px-6">Order Number</th>
                <th className="py-4 px-6">Customer</th>
                <th className="py-4 px-6">Total</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80 text-sm">
              {filteredOrders.map(order => {
                const isSelected = selectedIds.includes(order.id);
                return (
                  <tr key={order.id} className={`hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors ${isSelected ? 'bg-[#e94560]/2 dark:bg-[#e94560]/2' : ''}`}>
                    <td className="py-4 px-6">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(order.id)}
                        className="h-4.5 w-4.5 rounded-md border-gray-300 text-[#e94560] focus:ring-[#e94560] cursor-pointer"
                      />
                    </td>
                    <td className="py-4 px-6 font-bold text-gray-900 dark:text-white">#{order.orderNumber}</td>
                    <td className="py-4 px-6">
                      <p className="font-semibold text-gray-900 dark:text-white">{order.customerName || 'Guest'}</p>
                      <p className="text-xs text-gray-500">{order.customerPhone || 'N/A'}</p>
                    </td>
                    <td className="py-4 px-6 font-semibold text-gray-900 dark:text-white">PKR {order.total}</td>
                    <td className="py-4 px-6">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 uppercase">
                        {order.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleRestore(order.id, 'orders')}
                          disabled={isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all active:scale-95 disabled:opacity-50"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Restore
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ id: order.id, type: 'orders', name: `Order #${order.orderNumber}` })}
                          disabled={isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all active:scale-95 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete Forever
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderCustomerTab = () => {
    if (filteredCustomers.length === 0) {
      return (
        <EmptyState 
          title="No trashed customers" 
          description={searchTerm ? "No customers matching your search term." : "Your trash bin is clean of customers."} 
        />
      );
    }

    return (
      <div className="space-y-4">
        {/* Mobile View: Cards */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {filteredCustomers.map(customer => {
            const isSelected = selectedIds.includes(customer.id);
            return (
              <div 
                key={customer.id} 
                className={`bg-white dark:bg-[#16162a] p-4 rounded-2xl border shadow-sm flex flex-col space-y-3 transition-colors ${
                  isSelected ? 'border-[#e94560] bg-[#e94560]/5 dark:bg-[#e94560]/5' : 'border-gray-100 dark:border-gray-800'
                }`}
              >
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(customer.id)}
                      className="h-4.5 w-4.5 rounded-md border-gray-300 text-[#e94560] focus:ring-[#e94560] cursor-pointer"
                    />
                    <h4 className="font-bold text-gray-900 dark:text-white truncate">{customer.name}</h4>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-450 truncate">
                    Email: {customer.email || 'N/A'} | Phone: {customer.phone || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-450 truncate">
                    Orders: {customer.ordersCount} | Spent: PKR {customer.totalSpent}
                  </p>
                  {customer.deletedAt && (
                    <p suppressHydrationWarning={true} className="text-[10px] text-gray-400 mt-1">
                      Deleted: {new Date(customer.deletedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 justify-end pt-2 border-t border-gray-50 dark:border-gray-800/50">
                  <button
                    onClick={() => handleRestore(customer.id, 'customers')}
                    disabled={isPending}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Restore
                  </button>
                  <button
                    onClick={() => setConfirmDelete({ id: customer.id, type: 'customers', name: customer.name })}
                    disabled={isPending}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Forever
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-hidden bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="w-12 py-4 px-6">
                  <input
                    type="checkbox"
                    checked={filteredCustomers.length > 0 && filteredCustomers.every(c => selectedIds.includes(c.id))}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4.5 w-4.5 rounded-md border-gray-300 text-[#e94560] focus:ring-[#e94560] cursor-pointer"
                  />
                </th>
                <th className="py-4 px-6">Name</th>
                <th className="py-4 px-6">Contact Details</th>
                <th className="py-4 px-6">Orders Count</th>
                <th className="py-4 px-6">Total Spent</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80 text-sm">
              {filteredCustomers.map(customer => {
                const isSelected = selectedIds.includes(customer.id);
                return (
                  <tr key={customer.id} className={`hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors ${isSelected ? 'bg-[#e94560]/2 dark:bg-[#e94560]/2' : ''}`}>
                    <td className="py-4 px-6">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(customer.id)}
                        className="h-4.5 w-4.5 rounded-md border-gray-300 text-[#e94560] focus:ring-[#e94560] cursor-pointer"
                      />
                    </td>
                    <td className="py-4 px-6 font-bold text-gray-900 dark:text-white">{customer.name}</td>
                    <td className="py-4 px-6">
                      <p className="text-gray-900 dark:text-white font-medium">{customer.email || 'No Email'}</p>
                      <p className="text-xs text-gray-500">{customer.phone || 'No Phone'}</p>
                    </td>
                    <td className="py-4 px-6 font-semibold text-gray-900 dark:text-white">{customer.ordersCount}</td>
                    <td className="py-4 px-6 font-semibold text-gray-900 dark:text-white">PKR {customer.totalSpent}</td>
                    <td className="py-4 px-6">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleRestore(customer.id, 'customers')}
                          disabled={isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all active:scale-95 disabled:opacity-50"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Restore
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ id: customer.id, type: 'customers', name: customer.name })}
                          disabled={isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all active:scale-95 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete Forever
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderMediaTab = () => {
    if (filteredMedia.length === 0) {
      return (
        <EmptyState 
          title="No trashed media files" 
          description={searchTerm ? "No media matching your search term." : "Your trash bin is clean of media files."} 
        />
      );
    }

    const deletedMediaBytes = filteredMedia.reduce((sum, m) => sum + (m.file_size || 0), 0);
    const totalCapacityBytes = 1_000_000_000;
    const deletedPercentage = Math.min(100, (deletedMediaBytes / totalCapacityBytes) * 100);
    const formatBytes = (bytes: number) => {
      if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
      if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} KB`;
      return `${bytes} B`;
    };

    return (
      <div className="space-y-4">
        {/* Storage Bar */}
        <div className="bg-white dark:bg-[#16162a] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <span className="font-bold text-gray-700 dark:text-gray-300">Junk Storage:</span>
            <span>{formatBytes(deletedMediaBytes)} wasted in trash of 1 GB ({deletedPercentage.toFixed(2)}%)</span>
          </div>
          <div className="w-full sm:max-w-xs bg-gray-200 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
            <div className="bg-[#e94560] h-full rounded-full transition-all duration-500" style={{ width: `${deletedPercentage}%` }} />
          </div>
        </div>
        {/* Mobile View: Cards */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {filteredMedia.map(m => {
            const isSelected = selectedIds.includes(m.id);
            return (
              <div 
                key={m.id} 
                className={`bg-white dark:bg-[#16162a] p-4 rounded-2xl border shadow-sm flex flex-col space-y-3 transition-colors ${
                  isSelected ? 'border-[#e94560] bg-[#e94560]/5 dark:bg-[#e94560]/5' : 'border-gray-100 dark:border-gray-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(m.id)}
                    className="h-4.5 w-4.5 rounded-md border-gray-300 text-[#e94560] focus:ring-[#e94560] cursor-pointer"
                  />
                  <div className="relative h-14 w-14 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 dark:border-gray-850 flex-shrink-0">
                    {m.file_url ? (
                      <img 
                        src={m.file_url} 
                        alt={m.title || m.original_filename || 'Media'} 
                        className="h-full w-full object-cover" 
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-gray-800">
                        <Images className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-gray-900 dark:text-white truncate">{m.title || m.original_filename || 'Untitled'}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-450 truncate">
                      Type: {m.mime_type || 'N/A'} | Size: {m.file_size ? `${(m.file_size / 1024).toFixed(1)} KB` : 'N/A'}
                    </p>
                    {m.deleted_at && (
                      <p suppressHydrationWarning={true} className="text-[10px] text-gray-400 mt-0.5">
                        Deleted: {new Date(m.deleted_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-2 border-t border-gray-50 dark:border-gray-800/50">
                  <button
                    onClick={() => handleRestore(m.id, 'media')}
                    disabled={isPending}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Restore
                  </button>
                  <button
                    onClick={() => setConfirmDelete({ id: m.id, type: 'media', name: m.original_filename || 'Media file', extraInfo: { fileUrl: m.file_url } })}
                    disabled={isPending}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Forever
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop View: Grid for Media Items */}
        <div className="hidden md:block">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredMedia.map(item => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <div 
                  key={item.id} 
                  className={`bg-white dark:bg-[#16162a] rounded-2xl border overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col ${
                    isSelected ? 'border-[#e94560] bg-[#e94560]/1 dark:bg-[#e94560]/1' : 'border-gray-200 dark:border-gray-800'
                  }`}
                >
                  <div className="relative aspect-video w-full bg-gray-100 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-850 flex items-center justify-center overflow-hidden">
                    <div className="absolute top-2 left-2 z-10">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(item.id)}
                        className="h-4.5 w-4.5 rounded-md border-gray-300 text-[#e94560] focus:ring-[#e94560] cursor-pointer bg-white"
                      />
                    </div>
                    {item.file_url ? (
                      <img 
                        src={item.file_url} 
                        alt={item.title || item.original_filename || 'Media'} 
                        className="h-full w-full object-cover" 
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-gray-800">
                        <Images className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 dark:text-white truncate" title={item.original_filename || 'Untitled'}>
                        {item.original_filename || 'Untitled'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-450 mt-1 truncate">
                        Size: {item.file_size ? `${(item.file_size / 1024).toFixed(1)} KB` : 'Unknown'}
                      </p>
                      <p suppressHydrationWarning={true} className="text-[10px] text-gray-400 mt-0.5">
                        Deleted: {item.deleted_at ? new Date(item.deleted_at).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    <div className="flex gap-2 pt-2 border-t border-gray-50 dark:border-gray-800/50">
                      <button
                        onClick={() => handleRestore(item.id, 'media')}
                        disabled={isPending}
                        className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Restore
                      </button>
                      <button
                        onClick={() => setConfirmDelete({ id: item.id, type: 'media', name: item.original_filename || 'Media file', extraInfo: { fileUrl: item.file_url } })}
                        disabled={isPending}
                        className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderLeadTab = () => {
    if (filteredLeads.length === 0) {
      return (
        <EmptyState 
          title="No trashed leads" 
          description={searchTerm ? "No leads matching your search term." : "Your trash bin is clean of subscriber leads."} 
        />
      );
    }

    return (
      <div className="space-y-4">
        {/* Mobile View: Cards */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {filteredLeads.map(lead => {
            const isSelected = selectedIds.includes(lead.id);
            return (
              <div 
                key={`${lead.type}-${lead.id}`} 
                className={`bg-white dark:bg-[#16162a] p-4 rounded-2xl border shadow-sm flex flex-col space-y-3 transition-colors ${
                  isSelected ? 'border-[#e94560] bg-[#e94560]/5 dark:bg-[#e94560]/5' : 'border-gray-100 dark:border-gray-800'
                }`}
              >
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(lead.id)}
                        className="h-4.5 w-4.5 rounded-md border-gray-300 text-[#e94560] focus:ring-[#e94560] cursor-pointer"
                      />
                      <h4 className="font-bold text-gray-900 dark:text-white truncate">{lead.name}</h4>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      lead.type === 'whatsapp' 
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-450' 
                        : 'bg-blue-500/10 text-blue-600 dark:text-blue-450'
                    }`}>
                      {lead.type === 'whatsapp' ? 'WhatsApp' : 'Email'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-450 truncate">
                    Contact: {lead.contact}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-450 truncate">
                    Source: {lead.source}
                  </p>
                  {lead.createdAt && (
                    <p suppressHydrationWarning={true} className="text-[10px] text-gray-400 mt-1">
                      Joined: {new Date(lead.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 justify-end pt-2 border-t border-gray-50 dark:border-gray-800/50">
                  <button
                    onClick={() => handleRestore(lead.id, 'leads', { leadType: lead.type })}
                    disabled={isPending}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Restore
                  </button>
                  <button
                    onClick={() => setConfirmDelete({ id: lead.id, type: 'leads', name: lead.contact, extraInfo: { leadType: lead.type } })}
                    disabled={isPending}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Forever
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-hidden bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="w-12 py-4 px-6">
                  <input
                    type="checkbox"
                    checked={filteredLeads.length > 0 && filteredLeads.every(l => selectedIds.includes(l.id))}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4.5 w-4.5 rounded-md border-gray-300 text-[#e94560] focus:ring-[#e94560] cursor-pointer"
                  />
                </th>
                <th className="py-4 px-6">Name / Source</th>
                <th className="py-4 px-6">Contact Info</th>
                <th className="py-4 px-6">Channel</th>
                <th className="py-4 px-6">Created At</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80 text-sm">
              {filteredLeads.map(lead => {
                const isSelected = selectedIds.includes(lead.id);
                return (
                  <tr key={`${lead.type}-${lead.id}`} className={`hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors ${isSelected ? 'bg-[#e94560]/2 dark:bg-[#e94560]/2' : ''}`}>
                    <td className="py-4 px-6">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(lead.id)}
                        className="h-4.5 w-4.5 rounded-md border-gray-300 text-[#e94560] focus:ring-[#e94560] cursor-pointer"
                      />
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-bold text-gray-900 dark:text-white">{lead.name}</p>
                      <p className="text-xs text-gray-500">{lead.source}</p>
                    </td>
                    <td className="py-4 px-6 font-semibold text-gray-900 dark:text-white">
                      <div className="flex items-center gap-1.5">
                        {lead.type === 'whatsapp' ? (
                          <Phone className="h-3.5 w-3.5 text-gray-400" />
                        ) : (
                          <Mail className="h-3.5 w-3.5 text-gray-400" />
                        )}
                        <span>{lead.contact}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        lead.type === 'whatsapp' 
                          ? 'bg-emerald-500/10 text-emerald-650 dark:text-emerald-450' 
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-450'
                      }`}>
                        {lead.type === 'whatsapp' ? 'WhatsApp' : 'Email'}
                      </span>
                    </td>
                    <td suppressHydrationWarning={true} className="py-4 px-6 text-gray-500 dark:text-gray-400 text-xs">
                      {lead.createdAt ? new Date(lead.createdAt).toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleRestore(lead.id, 'leads', { leadType: lead.type })}
                          disabled={isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all active:scale-95 disabled:opacity-50"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Restore
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ id: lead.id, type: 'leads', name: lead.contact, extraInfo: { leadType: lead.type } })}
                          disabled={isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all active:scale-95 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete Forever
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderSizeGuideTab = () => {
    if (filteredSizeGuides.length === 0) {
      return (
        <EmptyState 
          title="No trashed size guides" 
          description={searchTerm ? "No size guides matching your search term." : "Your trash bin is clean of size guides."} 
        />
      );
    }

    return (
      <div className="space-y-4">
        {/* Mobile View: Cards */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {filteredSizeGuides.map(sg => {
            const isSelected = selectedIds.includes(sg.id);
            return (
              <div 
                key={sg.id} 
                className={`bg-white dark:bg-[#16162a] p-4 rounded-2xl border shadow-sm flex flex-col space-y-3 transition-colors ${
                  isSelected ? 'border-[#e94560] bg-[#e94560]/5 dark:bg-[#e94560]/5' : 'border-gray-100 dark:border-gray-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(sg.id)}
                    className="h-4.5 w-4.5 rounded-md border-gray-300 text-[#e94560] focus:ring-[#e94560] cursor-pointer"
                  />
                  <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 dark:border-gray-850 flex-shrink-0 flex items-center justify-center">
                    <Ruler className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-gray-900 dark:text-white truncate">{sg.name}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-450 truncate">
                      {sg.chart_data?.length || 0} rows
                    </p>
                    {sg.deletedAt && (
                      <p suppressHydrationWarning={true} className="text-[10px] text-gray-400 mt-0.5">
                        Deleted: {new Date(sg.deletedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-2 border-t border-gray-50 dark:border-gray-800/50">
                  <button
                    onClick={() => handleRestore(sg.id, 'size_guides')}
                    disabled={isPending}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Restore
                  </button>
                  <button
                    onClick={() => setConfirmDelete({ id: sg.id, type: 'size_guides', name: sg.name })}
                    disabled={isPending}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Forever
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-hidden bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="w-12 py-4 px-6">
                  <input
                    type="checkbox"
                    checked={filteredSizeGuides.length > 0 && filteredSizeGuides.every(x => selectedIds.includes(x.id))}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4.5 w-4.5 rounded-md border-gray-300 text-[#e94560] focus:ring-[#e94560] cursor-pointer"
                  />
                </th>
                <th className="py-4 px-6">Size Guide</th>
                <th className="py-4 px-6">Rows</th>
                <th className="py-4 px-6">Deleted At</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80 text-sm">
              {filteredSizeGuides.map(sg => {
                const isSelected = selectedIds.includes(sg.id);
                return (
                  <tr key={sg.id} className={`hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors ${isSelected ? 'bg-[#e94560]/2 dark:bg-[#e94560]/2' : ''}`}>
                    <td className="py-4 px-6">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(sg.id)}
                        className="h-4.5 w-4.5 rounded-md border-gray-300 text-[#e94560] focus:ring-[#e94560] cursor-pointer"
                      />
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-gray-50 border border-gray-150 dark:border-gray-800 flex-shrink-0 flex items-center justify-center">
                          <Ruler className="h-5 w-5 text-gray-400" />
                        </div>
                        <p className="font-bold text-gray-900 dark:text-white">{sg.name}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-500 dark:text-gray-400">{sg.chart_data?.length || 0}</td>
                    <td suppressHydrationWarning={true} className="py-4 px-6 text-gray-500 dark:text-gray-400 text-xs">
                      {sg.deletedAt ? new Date(sg.deletedAt).toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleRestore(sg.id, 'size_guides')}
                          disabled={isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all active:scale-95 disabled:opacity-50"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Restore
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ id: sg.id, type: 'size_guides', name: sg.name })}
                          disabled={isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all active:scale-95 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete Forever
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderVariantPresetTab = () => {
    if (filteredVariantPresets.length === 0) {
      return (
        <EmptyState 
          title="No trashed variant presets" 
          description={searchTerm ? "No variant presets matching your search term." : "Your trash bin is clean of variant presets."} 
        />
      );
    }

    return (
      <div className="space-y-4">
        {/* Mobile View: Cards */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {filteredVariantPresets.map(vp => {
            const isSelected = selectedIds.includes(vp.id);
            return (
              <div 
                key={vp.id} 
                className={`bg-white dark:bg-[#16162a] p-4 rounded-2xl border shadow-sm flex flex-col space-y-3 transition-colors ${
                  isSelected ? 'border-[#e94560] bg-[#e94560]/5 dark:bg-[#e94560]/5' : 'border-gray-100 dark:border-gray-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(vp.id)}
                    className="h-4.5 w-4.5 rounded-md border-gray-300 text-[#e94560] focus:ring-[#e94560] cursor-pointer"
                  />
                  <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 dark:border-gray-850 flex-shrink-0 flex items-center justify-center">
                    <Layers className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-gray-900 dark:text-white truncate">{vp.name}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-450 truncate">
                      {vp.attribute} · {vp.values?.length || 0} values
                    </p>
                    {vp.deletedAt && (
                      <p suppressHydrationWarning={true} className="text-[10px] text-gray-400 mt-0.5">
                        Deleted: {new Date(vp.deletedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-2 border-t border-gray-50 dark:border-gray-800/50">
                  <button
                    onClick={() => handleRestore(vp.id, 'variant_presets')}
                    disabled={isPending}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Restore
                  </button>
                  <button
                    onClick={() => setConfirmDelete({ id: vp.id, type: 'variant_presets', name: vp.name })}
                    disabled={isPending}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Forever
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-hidden bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="w-12 py-4 px-6">
                  <input
                    type="checkbox"
                    checked={filteredVariantPresets.length > 0 && filteredVariantPresets.every(x => selectedIds.includes(x.id))}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4.5 w-4.5 rounded-md border-gray-300 text-[#e94560] focus:ring-[#e94560] cursor-pointer"
                  />
                </th>
                <th className="py-4 px-6">Variant Preset</th>
                <th className="py-4 px-6">Attribute</th>
                <th className="py-4 px-6">Values</th>
                <th className="py-4 px-6">Deleted At</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80 text-sm">
              {filteredVariantPresets.map(vp => {
                const isSelected = selectedIds.includes(vp.id);
                return (
                  <tr key={vp.id} className={`hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors ${isSelected ? 'bg-[#e94560]/2 dark:bg-[#e94560]/2' : ''}`}>
                    <td className="py-4 px-6">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(vp.id)}
                        className="h-4.5 w-4.5 rounded-md border-gray-300 text-[#e94560] focus:ring-[#e94560] cursor-pointer"
                      />
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-gray-50 border border-gray-150 dark:border-gray-800 flex-shrink-0 flex items-center justify-center">
                          <Layers className="h-5 w-5 text-gray-400" />
                        </div>
                        <p className="font-bold text-gray-900 dark:text-white">{vp.name}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-500 dark:text-gray-400 capitalize">{vp.attribute}</td>
                    <td className="py-4 px-6 text-gray-500 dark:text-gray-400">{vp.values?.length || 0}</td>
                    <td suppressHydrationWarning={true} className="py-4 px-6 text-gray-500 dark:text-gray-400 text-xs">
                      {vp.deletedAt ? new Date(vp.deletedAt).toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleRestore(vp.id, 'variant_presets')}
                          disabled={isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all active:scale-95 disabled:opacity-50"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Restore
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ id: vp.id, type: 'variant_presets', name: vp.name })}
                          disabled={isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all active:scale-95 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete Forever
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Search and Tab header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-800 gap-2 p-1 bg-gray-100 dark:bg-gray-900 rounded-2xl w-full xl:w-fit whitespace-nowrap scroll-smooth touch-pan-x scrollbar-none" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => handleTabChange('products')}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'products'
                ? 'bg-white dark:bg-[#16162a] text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            Products
            <span className="text-xs bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded-full font-bold">
              {products.length}
            </span>
          </button>
          <button
            onClick={() => handleTabChange('categories')}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'categories'
                ? 'bg-white dark:bg-[#16162a] text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <FolderOpen className="h-4 w-4" />
            Categories
            <span className="text-xs bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded-full font-bold">
              {categories.length}
            </span>
          </button>
          <button
            onClick={() => handleTabChange('reviews')}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'reviews'
                ? 'bg-white dark:bg-[#16162a] text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Star className="h-4 w-4" />
            Reviews
            <span className="text-xs bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded-full font-bold">
              {reviews.length}
            </span>
          </button>
          <button
            onClick={() => handleTabChange('orders')}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'orders'
                ? 'bg-white dark:bg-[#16162a] text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            Orders
            <span className="text-xs bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded-full font-bold">
              {orders.length}
            </span>
          </button>
          <button
            onClick={() => handleTabChange('customers')}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'customers'
                ? 'bg-white dark:bg-[#16162a] text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Users className="h-4 w-4" />
            Customers
            <span className="text-xs bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded-full font-bold">
              {customers.length}
            </span>
          </button>
          <button
            onClick={() => handleTabChange('media')}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'media'
                ? 'bg-white dark:bg-[#16162a] text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Images className="h-4 w-4" />
            Media
            <span className="text-xs bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded-full font-bold">
              {media.length}
            </span>
          </button>
          <button
            onClick={() => handleTabChange('leads')}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'leads'
                ? 'bg-white dark:bg-[#16162a] text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            Leads
            <span className="text-xs bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded-full font-bold">
              {whatsappSubscribers.length + emailSubscribers.length}
            </span>
          </button>
          <button
            onClick={() => handleTabChange('size_guides')}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'size_guides'
                ? 'bg-white dark:bg-[#16162a] text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Ruler className="h-4 w-4" />
            Size Guides
            <span className="text-xs bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded-full font-bold">
              {sizeGuides.length}
            </span>
          </button>
          <button
            onClick={() => handleTabChange('variant_presets')}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'variant_presets'
                ? 'bg-white dark:bg-[#16162a] text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Layers className="h-4 w-4" />
            Variant Presets
            <span className="text-xs bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded-full font-bold">
              {variantPresets.length}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full xl:w-80">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </span>
          <input
            type="text"
            placeholder={
              activeTab === 'products' ? 'Search by name or SKU...' :
              activeTab === 'categories' ? 'Search by name or slug...' :
              activeTab === 'reviews' ? 'Search by customer, comment...' :
              activeTab === 'orders' ? 'Search by number or customer...' :
              activeTab === 'customers' ? 'Search by name, email or phone...' :
              activeTab === 'media' ? 'Search by filename or title...' :
              activeTab === 'size_guides' ? 'Search size guides...' :
              activeTab === 'variant_presets' ? 'Search variant presets...' :
              'Search leads...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#e94560] dark:text-white shadow-xs"
          />
        </div>
      </div>

      {/* Bulk Action / Empty Trash Controls */}
      {(products.length > 0 || categories.length > 0 || reviews.length > 0 || orders.length > 0 || customers.length > 0 || media.length > 0 || whatsappSubscribers.length > 0 || emailSubscribers.length > 0 || sizeGuides.length > 0 || variantPresets.length > 0) && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white dark:bg-[#16162a] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xs">
          {getActiveTabItems().length > 0 ? (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={getActiveTabItems().length > 0 && getActiveTabItems().every(item => selectedIds.includes(item.id))}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="h-4.5 w-4.5 rounded-md border-gray-300 text-[#e94560] focus:ring-[#e94560] cursor-pointer"
              />
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                {selectedIds.length > 0 ? `${selectedIds.length} Selected` : 'Select All'}
              </span>
            </div>
          ) : (
            <div className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
              No Trashed {activeTab.toUpperCase()}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2.5">
            {selectedIds.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleBulkRestore}
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all active:scale-95 disabled:opacity-50 cursor-pointer min-h-[36px]"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Restore Selected
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmBulkDelete(true)}
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all active:scale-95 disabled:opacity-50 cursor-pointer min-h-[36px]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Selected Forever
                </button>
              </>
            )}
            {getActiveTabItems().length > 0 && (
              <button
                type="button"
                onClick={() => setConfirmEmptyTab(true)}
                disabled={isPending}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#e94560] hover:bg-[#e94560]/90 text-white transition-all active:scale-95 disabled:opacity-50 shadow-xs cursor-pointer min-h-[36px]"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Empty {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Trash
              </button>
            )}
            {(products.length > 0 || categories.length > 0 || reviews.length > 0 || orders.length > 0 || customers.length > 0 || media.length > 0 || whatsappSubscribers.length > 0 || emailSubscribers.length > 0 || sizeGuides.length > 0 || variantPresets.length > 0) && (
              <button
                type="button"
                onClick={() => setConfirmEmptyCompleteTrash(true)}
                disabled={isPending}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#e94560] hover:bg-[#e94560]/95 text-white transition-all active:scale-95 disabled:opacity-50 shadow-xs cursor-pointer min-h-[36px]"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Empty Complete Trash Bin
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Tab content */}
      <div className="transition-all duration-300">
        {activeTab === 'products' && renderProductTab()}
        {activeTab === 'categories' && renderCategoryTab()}
        {activeTab === 'reviews' && renderReviewTab()}
        {activeTab === 'orders' && renderOrderTab()}
        {activeTab === 'customers' && renderCustomerTab()}
        {activeTab === 'media' && renderMediaTab()}
        {activeTab === 'leads' && renderLeadTab()}
        {activeTab === 'size_guides' && renderSizeGuideTab()}
        {activeTab === 'variant_presets' && renderVariantPresetTab()}
      </div>

      {/* Confirmation modal for single hard delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-350">
          <div className="relative w-full max-w-md bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden overscroll-contain animate-in fade-in-50 zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
              Confirm Permanent Deletion
            </h3>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Are you sure you want to permanently delete <strong className="text-gray-900 dark:text-white font-bold">{confirmDelete.name}</strong>? 
              This action cannot be undone and will delete all associated database data.
            </p>
            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                disabled={isPending}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleHardDelete}
                disabled={isPending}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-600! hover:bg-red-700! text-white! shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isPending && <RefreshCw className="h-4 w-4 animate-spin" />}
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation modal for bulk hard delete */}
      {confirmBulkDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-350">
          <div className="relative w-full max-w-md bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden overscroll-contain animate-in fade-in-50 zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
              Confirm Permanent Deletion
            </h3>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Are you sure you want to permanently delete <strong className="text-gray-900 dark:text-white font-bold">{selectedIds.length} item(s)</strong>? 
              This action cannot be undone and will delete all associated database data.
            </p>
            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                onClick={() => setConfirmBulkDelete(false)}
                disabled={isPending}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkHardDelete}
                disabled={isPending}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-red-500 hover:bg-red-600 text-white shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isPending && <RefreshCw className="h-4 w-4 animate-spin" />}
                Delete Selected Forever
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation modal for emptying complete tab */}
      {confirmEmptyTab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-350">
          <div className="relative w-full max-w-md bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden overscroll-contain animate-in fade-in-50 zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
              Confirm Emptying Tab Trash
            </h3>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Are you sure you want to permanently delete all trashed <strong className="text-gray-900 dark:text-white font-bold">{activeTab}</strong> items? 
              This action cannot be undone and will delete all associated data and files.
            </p>
            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                onClick={() => setConfirmEmptyTab(false)}
                disabled={isPending}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEmptyTab}
                disabled={isPending}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-600! hover:bg-red-700! text-white! shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isPending && <RefreshCw className="h-4 w-4 animate-spin" />}
                Empty Trash Bin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation modal for emptying complete trash bin */}
      {confirmEmptyCompleteTrash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-350">
          <div className="relative w-full max-w-md bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden overscroll-contain animate-in fade-in-50 zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
              Confirm Emptying Entire Trash Bin
            </h3>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Are you sure you want to permanently delete all items in ALL trash bins? 
              This action will permanently delete all soft-deleted products, categories, reviews, orders, customers, media files, and subscriber leads. 
              <strong className="text-red-600 font-bold block mt-2">This action is absolute and cannot be undone.</strong>
            </p>
            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                onClick={() => setConfirmEmptyCompleteTrash(false)}
                disabled={isPending}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEmptyCompleteTrash}
                disabled={isPending}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-600! hover:bg-red-700! text-white! shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isPending && <RefreshCw className="h-4 w-4 animate-spin" />}
                Empty Entire Trash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
