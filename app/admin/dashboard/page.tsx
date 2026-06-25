import React from 'react';
import Link from 'next/link';
import { ShoppingBag, FolderOpen, ClipboardList, TrendingUp } from '@/components/common/Icons';
import { getProducts } from '@/lib/services/products';
import { getCategories } from '@/lib/services/categories';
import { getOrders } from '@/lib/services/orders';
import { getSettings } from '@/lib/services/settings';
import { formatPrice } from '@/lib/utils/whatsapp';
import ReportingDashboard from '@/components/admin/ReportingDashboard';

export const revalidate = 0; // Dynamic server component

export default async function DashboardPage() {
  const [products, categories, orders, settings] = await Promise.all([
    getProducts(),
    getCategories(),
    getOrders(),
    getSettings()
  ]);

  const totalSales = orders
    .filter(o => o.status === 'confirmed' || o.status === 'delivered')
    .reduce((sum, o) => sum + o.total, 0);

  const stats = [
    { label: 'Total Products', value: products.length, icon: ShoppingBag, color: 'bg-blue-500/10 text-blue-600', href: '/admin/products' },
    { label: 'Total Categories', value: categories.length, icon: FolderOpen, color: 'bg-amber-500/10 text-amber-600', href: '/admin/categories' },
    { label: 'Total Orders Logged', value: orders.length, icon: ClipboardList, color: 'bg-emerald-500/10 text-emerald-600', href: '/admin/orders' },
    { label: 'Total Sales (All Time)', value: formatPrice(totalSales, settings.currencySymbol), icon: TrendingUp, color: 'bg-indigo-500/10 text-indigo-600', href: '/admin/orders' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Link
              key={i}
              href={stat.href}
              className="bg-white dark:bg-[#16162a] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all flex items-center justify-between group text-gray-900 dark:text-white"
            >
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {stat.label}
                </span>
                <p className="text-2xl font-black text-gray-900 dark:text-white">{stat.value}</p>
              </div>
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${stat.color} group-hover:scale-110 transition-transform`}>
                <Icon className="h-6 w-6" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Financial Reporting Section (Shopify Style) */}
      <ReportingDashboard orders={orders} settings={settings} isEmbed={true} />

      {/* Recent Orders log */}
      <div className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 space-y-4 text-gray-900 dark:text-white transition-colors">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Recent Orders (Supabase Log)</h3>
          <Link href="/admin/orders" className="text-sm font-semibold text-[#e94560] hover:underline">
            View All
          </Link>
        </div>
        
        {orders.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">
            No orders logged yet. Orders are logged when customers click &quot;Confirm via WhatsApp&quot;.
          </div>
        ) : (
          <>
            {/* Desktop Recent Orders Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-750 dark:text-gray-300">
                <thead className="text-xs font-bold text-gray-400 uppercase border-b border-gray-100 dark:border-gray-800 bg-gray-50/20 dark:bg-white/5">
                  <tr>
                    <th className="py-3 px-4">Order No.</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">{orders.slice(0, 5).map(order => (
                    <tr key={order.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 font-bold text-[#1a1a2e] dark:text-white">{order.orderNumber}</td>
                      <td className="py-3 px-4 font-semibold">{order.customerName || 'N/A'}</td>
                      <td className="py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">{order.customerPhone || 'N/A'}</td>
                      <td className="py-3 px-4 font-bold">{formatPrice(order.total, settings.currencySymbol)}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          order.status === 'delivered' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                          order.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                          order.status === 'cancelled' ? 'bg-red-50 text-red-600 border-red-200' :
                          'bg-blue-50 text-blue-600 border-blue-200'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400 font-medium">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Recent Orders Cards */}
            <div className="md:hidden space-y-3">
              {orders.slice(0, 5).map(order => (
                <div key={order.id} className="bg-white dark:bg-[#16162a] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-[#1a1a2e] dark:text-white">{order.orderNumber}</span>
                    <span className="text-sm font-black text-[#1a1a2e] dark:text-white">{formatPrice(order.total, settings.currencySymbol)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white truncate">{order.customerName || 'N/A'}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{order.customerPhone || 'N/A'}</p>
                    </div>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                      order.status === 'delivered' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                      order.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                      order.status === 'cancelled' ? 'bg-red-50 text-red-600 border-red-200' :
                      'bg-blue-50 text-blue-600 border-blue-200'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
