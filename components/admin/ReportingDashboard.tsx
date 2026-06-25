'use client';

import React, { useState, useMemo } from 'react';
import { Order, StoreSettings } from '@/lib/types';
import { formatPrice } from '@/lib/utils/whatsapp';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Calendar,
  Layers,
  ArrowUpRight
} from '@/components/common/Icons';

interface ReportingDashboardProps {
  orders: Order[];
  settings: StoreSettings;
  isEmbed?: boolean; // true if embedded in dashboard, hides header/title
}

export default function ReportingDashboard({ orders, settings, isEmbed = false }: ReportingDashboardProps) {
  const [dateFilter, setDateFilter] = useState<string>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // 1. Filter orders based on date range
  const filteredOrders = useMemo(() => {
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

    return orders.filter(o => {
      const orderDate = new Date(o.createdAt);
      const orderTime = orderDate.getTime();

      if (dateFilter === 'today') {
        const start = getStartOfDay(now);
        const end = getEndOfDay(now);
        return orderTime >= start && orderTime <= end;
      } else if (dateFilter === 'yesterday') {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const start = getStartOfDay(yesterday);
        const end = getEndOfDay(yesterday);
        return orderTime >= start && orderTime <= end;
      } else if (dateFilter === 'tomorrow') {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const start = getStartOfDay(tomorrow);
        const end = getEndOfDay(tomorrow);
        return orderTime >= start && orderTime <= end;
      } else if (dateFilter === 'last7') {
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return orderTime >= getStartOfDay(sevenDaysAgo) && orderTime <= getEndOfDay(now);
      } else if (dateFilter === 'last30') {
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return orderTime >= getStartOfDay(thirtyDaysAgo) && orderTime <= getEndOfDay(now);
      } else if (dateFilter === 'custom') {
        const start = customStartDate ? getStartOfDay(new Date(customStartDate)) : 0;
        const end = customEndDate ? getEndOfDay(new Date(customEndDate)) : Infinity;
        return orderTime >= start && orderTime <= end;
      }

      return true; // 'all' filter
    });
  }, [orders, dateFilter, customStartDate, customEndDate]);

  // 2. Financial Metrics Calculations
  const metrics = useMemo(() => {
    // Only count non-cancelled orders for revenue reporting
    const reportingOrders = filteredOrders.filter(o => o.status !== 'cancelled');
    
    let totalSales = 0;
    let totalCOGS = 0;

    reportingOrders.forEach(order => {
      totalSales += order.total;
      
      // Calculate COGS from item products
      order.items.forEach(item => {
        const cost = item.product.cost ? parseFloat(item.product.cost.toString()) : 0;
        totalCOGS += cost * item.quantity;
      });
    });

    const grossProfit = totalSales - totalCOGS;
    const grossMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;
    const orderCount = reportingOrders.length;
    const aov = orderCount > 0 ? totalSales / orderCount : 0;

    return {
      sales: totalSales,
      cogs: totalCOGS,
      profit: grossProfit,
      margin: grossMargin,
      count: orderCount,
      aov: aov
    };
  }, [filteredOrders]);

  // 3. Top Selling Products in Period
  const topProducts = useMemo(() => {
    const productMap: Record<string, { id: string; name: string; qty: number; sales: number; profit: number }> = {};

    filteredOrders.filter(o => o.status !== 'cancelled').forEach(order => {
      order.items.forEach(item => {
        const pId = item.product.id;
        const name = item.product.name;
        const qty = item.quantity;
        const sales = item.total;
        const cost = item.product.cost ? parseFloat(item.product.cost.toString()) : 0;
        const profit = sales - (cost * qty);

        if (!productMap[pId]) {
          productMap[pId] = { id: pId, name, qty: 0, sales: 0, profit: 0 };
        }
        productMap[pId].qty += qty;
        productMap[pId].sales += sales;
        productMap[pId].profit += profit;
      });
    });

    return Object.values(productMap)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
  }, [filteredOrders]);

  // 4. Sales by Status breakdown
  const statusBreakdown = useMemo(() => {
    const statusMap: Record<string, { count: number; sales: number }> = {
      pending: { count: 0, sales: 0 },
      confirmed: { count: 0, sales: 0 },
      shipped: { count: 0, sales: 0 },
      delivered: { count: 0, sales: 0 },
      cancelled: { count: 0, sales: 0 }
    };

    filteredOrders.forEach(o => {
      if (statusMap[o.status]) {
        statusMap[o.status].count += 1;
        statusMap[o.status].sales += o.total;
      }
    });

    return Object.entries(statusMap).map(([status, data]) => ({
      status,
      ...data
    }));
  }, [filteredOrders]);

  return (
    <div className="space-y-6">
      {/* Date filter bar (Shopify style) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#16162a] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 transition-colors shadow-xs">
        <div>
          {!isEmbed && (
            <>
              <h1 className="text-xl font-black text-gray-900 dark:text-white">Financial & Sales Reporting</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mt-0.5">Track revenue, product costs, and profit margins</p>
            </>
          )}
          {isEmbed && (
            <div className="text-sm font-bold text-gray-900 dark:text-white">Financial Summary & Performance Report</div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-1.5">
            <Calendar className="h-4 w-4 text-gray-400" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent border-0 text-xs font-bold focus:outline-none text-gray-900 dark:text-white cursor-pointer py-1.5"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="last7">Last 7 Days</option>
              <option value="last30">Last 30 Days</option>
              <option value="all">All Time</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
        </div>
      </div>

      {/* Custom Range calendars */}
      {dateFilter === 'custom' && (
        <div className="flex flex-wrap items-center gap-3 p-4 bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400">Start Date:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-3 py-1.5 text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400">End Date:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-3 py-1.5 text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Total Sales */}
        <div className="bg-white dark:bg-[#16162a] p-4.5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col justify-between min-h-[100px]">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Net Sales</span>
          <div>
            <span className="text-lg font-black text-gray-950 dark:text-white block mt-1">{formatPrice(metrics.sales, settings.currencySymbol)}</span>
            <span className="text-[9px] text-[#10b981] font-bold">Non-cancelled orders</span>
          </div>
        </div>

        {/* Cost of Goods Sold */}
        <div className="bg-white dark:bg-[#16162a] p-4.5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col justify-between min-h-[100px]">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Product Cost (COGS)</span>
          <div>
            <span className="text-lg font-black text-gray-950 dark:text-white block mt-1">{formatPrice(metrics.cogs, settings.currencySymbol)}</span>
            <span className="text-[9px] text-gray-400 font-bold">Sum of variant costs</span>
          </div>
        </div>

        {/* Gross Profit */}
        <div className="bg-white dark:bg-[#16162a] p-4.5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col justify-between min-h-[100px]">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Gross Profit</span>
          <div>
            <span className="text-lg font-black text-[#10b981] block mt-1">{formatPrice(metrics.profit, settings.currencySymbol)}</span>
            <span className="text-[9px] text-gray-400 font-bold">Sales minus costs</span>
          </div>
        </div>

        {/* Margin percentage */}
        <div className="bg-white dark:bg-[#16162a] p-4.5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col justify-between min-h-[100px]">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Gross Margin</span>
          <div>
            <span className="text-lg font-black text-indigo-500 block mt-1">{metrics.margin.toFixed(1)}%</span>
            <span className="text-[9px] text-gray-400 font-bold">Profit % of sales</span>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white dark:bg-[#16162a] p-4.5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col justify-between min-h-[100px]">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Orders</span>
          <div>
            <span className="text-lg font-black text-gray-950 dark:text-white block mt-1">{metrics.count}</span>
            <span className="text-[9px] text-gray-400 font-bold">Count of period</span>
          </div>
        </div>

        {/* AOV */}
        <div className="bg-white dark:bg-[#16162a] p-4.5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col justify-between min-h-[100px]">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Average Order Value</span>
          <div>
            <span className="text-lg font-black text-gray-950 dark:text-white block mt-1">{formatPrice(metrics.aov, settings.currencySymbol)}</span>
            <span className="text-[9px] text-gray-400 font-bold">AOV in period</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left/Main Card - Top Selling Products (2 Cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800/80">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4.5 w-4.5 text-gray-400" />
              <h3 className="text-sm font-black text-gray-900 dark:text-white">Top Selling Products</h3>
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Sort by Sales</span>
          </div>

          {topProducts.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">No items sold in the selected time period.</div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 text-[10px] font-black uppercase tracking-wider text-gray-400">
                      <th className="py-3">Product Name</th>
                      <th className="py-3 text-center">Qty Sold</th>
                      <th className="py-3 text-right">Revenue</th>
                      <th className="py-3 text-right">Profit Contribution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50 font-semibold text-gray-700 dark:text-gray-300">{topProducts.map((p, idx) => (
                      <tr key={p.id || idx} className="hover:bg-gray-50/30 dark:hover:bg-white/2 transition-colors">
                        <td className="py-3 font-bold text-gray-900 dark:text-white truncate max-w-xs">{p.name}</td>
                        <td className="py-3 text-center font-bold text-gray-800 dark:text-gray-200">{p.qty}</td>
                        <td className="py-3 text-right font-black text-gray-900 dark:text-white">{formatPrice(p.sales, settings.currencySymbol)}</td>
                        <td className="py-3 text-right text-emerald-600 dark:text-emerald-400 font-black">{formatPrice(p.profit, settings.currencySymbol)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="md:hidden space-y-3">
                {topProducts.map((p, idx) => (
                  <div key={p.id || idx} className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-xs space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xs font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug">{p.name}</span>
                      <span className="shrink-0 rounded-full bg-gray-100 dark:bg-gray-800/80 px-2 py-0.5 text-[9px] font-bold text-gray-700 dark:text-gray-300">
                        Qty: {p.qty}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100/50 dark:border-gray-800/50">
                      <div>
                        <span className="text-[9px] font-bold text-gray-400 block uppercase tracking-wider">Revenue</span>
                        <span className="font-extrabold text-gray-900 dark:text-white">{formatPrice(p.sales, settings.currencySymbol)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-bold text-gray-400 block uppercase tracking-wider">Profit</span>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{formatPrice(p.profit, settings.currencySymbol)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right Card - Status & Conversion breakdown (1 Col) */}
        <div className="bg-white dark:bg-[#16162a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-800/80">
            <Layers className="h-4.5 w-4.5 text-gray-400" />
            <h3 className="text-sm font-black text-gray-900 dark:text-white">Order Status breakdown</h3>
          </div>

          <div className="space-y-4">
            {statusBreakdown.map((row) => {
              const count = row.count;
              const totalOrders = filteredOrders.length;
              const percentage = totalOrders > 0 ? (count / totalOrders) * 100 : 0;
              
              return (
                <div key={row.status} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="capitalize font-bold text-gray-800 dark:text-gray-200">{row.status}</span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {count} order{count !== 1 ? 's' : ''} ({formatPrice(row.sales, settings.currencySymbol)})
                    </span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        row.status === 'delivered' ? 'bg-emerald-500' :
                        row.status === 'confirmed' ? 'bg-blue-500' :
                        row.status === 'pending' ? 'bg-amber-500' :
                        row.status === 'cancelled' ? 'bg-red-500' :
                        'bg-purple-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
