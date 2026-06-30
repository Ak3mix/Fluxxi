import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, AlertTriangle, Hash, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';
import { cn } from '../utils/cn';
import { Skeleton } from './Skeleton';
import type { DashboardData } from '../types';

const paymentLabels: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  split: 'Mixto',
};

export function DashboardTab() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboardData().then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton.Box key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton.Box className="h-48 rounded-2xl" />
        <Skeleton.Box className="h-40 rounded-2xl" />
        <Skeleton.Box className="h-32 rounded-2xl" />
      </div>
    );
  }

  if (!data) return null;

  const { todayStats, topProducts, lowStockCount, recentSales, weeklySales } = data;
  const maxWeekly = Math.max(...weeklySales.map(w => w.total), 1);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-stone-800">Resumen del día</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard icon={DollarSign} label="Ventas" value={formatCurrency(todayStats.totalSales)} color="emerald" />
        <SummaryCard icon={TrendingUp} label="Ganancia Neta" value={formatCurrency(todayStats.totalNet)} color="blue" />
        <SummaryCard icon={ShoppingBag} label="Ticket Promedio" value={todayStats.ticketCount > 0 ? formatCurrency(todayStats.totalSales / todayStats.ticketCount) : formatCurrency(0)} color="violet" />
        <SummaryCard icon={Hash} label="Tickets" value={String(todayStats.ticketCount)} color="amber" />
      </div>

      {weeklySales.some(w => w.total > 0) && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">Ventas semanales</h3>
          <div className="flex items-end gap-2 h-32">
            {weeklySales.map((w, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-medium text-stone-500">{formatCurrency(w.total)}</span>
                <div
                  className="w-full bg-emerald-500 rounded-t-md transition-all"
                  style={{ height: Math.max((w.total / maxWeekly) * 100, w.total > 0 ? 4 : 1) + 'px' }}
                />
                <span className="text-[10px] font-medium text-stone-500 uppercase">{w.day}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {topProducts.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">Top 5 Productos</h3>
          <div className="space-y-2">
            {topProducts.map((p, i) => (
              <div key={i} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-stone-400 w-5 shrink-0">#{i + 1}</span>
                  <span className="text-sm text-stone-700 truncate">{p.name}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-semibold text-stone-500">{p.quantity} uds</span>
                  <span className="text-sm font-bold text-stone-800">{formatCurrency(p.total)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {lowStockCount > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">Alertas</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertTriangle size={16} />
              <span className="text-sm">{lowStockCount} producto{lowStockCount !== 1 ? 's' : ''} con stock bajo</span>
            </div>
          </div>
        </div>
      )}

      {recentSales.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">Últimas ventas</h3>
          <div className="space-y-2">
            {recentSales.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-stone-400 shrink-0" />
                  <span className="text-sm text-stone-600">
                    {new Date(s.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-600 capitalize">
                    {paymentLabels[s.payment_method] || s.payment_method}
                  </span>
                </div>
                <span className="text-sm font-bold text-stone-800">{formatCurrency(s.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {todayStats.cancelledCount > 0 && (
        <div className="flex items-center gap-2 justify-center text-stone-400 text-xs py-2">
          <TrendingDown size={14} />
          <span>{todayStats.cancelledCount} venta{todayStats.cancelledCount !== 1 ? 's' : ''} cancelada{todayStats.cancelledCount !== 1 ? 's' : ''} hoy</span>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ size?: number }>; label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700',
    blue: 'bg-blue-100 text-blue-700',
    violet: 'bg-violet-100 text-violet-700',
    amber: 'bg-amber-100 text-amber-700',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-4 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", colorMap[color])}>
          <Icon size={16} />
        </div>
        <span className="text-xs font-medium text-stone-500">{label}</span>
      </div>
      <p className="text-xl font-black text-stone-800">{value}</p>
    </motion.div>
  );
}
