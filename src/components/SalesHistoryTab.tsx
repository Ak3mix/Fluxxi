import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronDown, XCircle, Clock, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import { api } from '../services/api';
import { exportSessionExcel } from '../services/excelExportService';
import { useToast } from '../contexts/ToastContext';
import { Skeleton } from './Skeleton';
import { Modal } from './Modal';
import { cn } from '../utils/cn';
import { formatCurrency } from '../utils/formatCurrency';
import { groupSessionsByMonth } from '../utils/groupSessions';
import type { Sale, Session, Card, Product } from '../types';
import type { GroupedSessions } from '../utils/groupSessions';

interface Props {
  products: Product[];
  businessName?: string;
  currencySymbol?: string;
}

export function SalesHistoryTab({ products, businessName = 'Fluxxi', currencySymbol = '$' }: Props) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionSales, setActiveSessionSales] = useState<Sale[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [selectedSales, setSelectedSales] = useState<Sale[]>([]);
  const [cancelSaleId, setCancelSaleId] = useState<number | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      try {
        const [current, history] = await Promise.all([
          api.getCurrentReport(),
          api.getSessionHistory(),
        ]);
        const currentSession = current.session;
        setActiveSessionSales(current.sales.filter((s: Sale) => !s.cancelled));
        const allSessions = [currentSession, ...history.filter((s: Session) => s.id !== currentSession.id)];
        setSessions(allSessions);
        const closedSessions = history.filter((s: Session) => s.is_closed);
        if (closedSessions.length > 0) {
          const groups = groupSessionsByMonth(closedSessions);
          if (groups.length > 0) {
            setExpandedGroups(new Set([groups[0].key]));
          }
        }
      } catch (e) {
        console.error('Error loading sales history', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSelectSession = async (session: Session) => {
    setSelectedSession(session);
    try {
      const data = await api.getSessionReport(session.id);
      setSelectedSales(data.sales.filter((s: Sale) => !s.cancelled));
    } catch (e) {
      console.error('Error loading session sales', e);
      setSelectedSales([]);
    }
  };

  const handleCancelSale = async () => {
    if (cancelSaleId === null) return;
    try {
      await api.cancelSale(cancelSaleId);
      setCancelSaleId(null);
      if (selectedSession) {
        const data = await api.getSessionReport(selectedSession.id);
        setSelectedSales(data.sales.filter((s: Sale) => !s.cancelled));
      }
      addToast('Venta anulada correctamente', 'success');
    } catch (e) {
      console.error(e);
      addToast('Error al anular la venta', 'error');
    }
  };

  const handleExportExcel = async (session: Session) => {
    try {
      const data = await api.getSessionReport(session.id);
      const cards: Card[] = await api.getCards();
      await exportSessionExcel({
        sessionId: session.id,
        sessionDate: format(new Date(session.start_time), 'yyyy-MM-dd'),
        sessionName: session.name,
        sales: data.sales,
        movements: data.movements,
        products,
        cards,
        businessName,
        currencySymbol,
      });
    } catch (e: any) {
      addToast('Error al exportar Excel: ' + (e.message || 'Error'), 'error');
    }
  };

  const isActiveSession = (s: Session) => !s.is_closed;

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton.Box className="h-16 rounded-2xl" />
        <Skeleton.Box className="h-16 rounded-2xl" />
        <Skeleton.Box className="h-16 rounded-2xl" />
      </div>
    );
  }

  if (selectedSession) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => { setSelectedSession(null); setSelectedSales([]); }}
            className="p-2 -ml-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Volver"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black">{selectedSession.name || `Jornada #${selectedSession.id}`}</h2>
              {isActiveSession(selectedSession) && (
                <span className="text-[9px] font-black uppercase bg-violet-200 text-violet-800 px-1.5 py-0.5 rounded-full">Activa</span>
              )}
            </div>
            <p className="text-xs text-stone-500">
              {isActiveSession(selectedSession) ? 'Jornada en curso' : `Cerrada: ${selectedSession.end_time ? format(new Date(selectedSession.end_time), 'dd/MM/yyyy HH:mm') : ''}`}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {selectedSales.length === 0 ? (
            <div className="text-center py-12 text-stone-400 text-sm">No hay ventas en esta jornada</div>
          ) : (
            selectedSales.map(sale => {
              const itemSummary = sale.items?.map(i => `${i.quantity}x ${i.product_name || 'Producto'}`).join(', ') || '';
              const paymentLabel = sale.payment_method === 'cash' ? 'Efectivo' : sale.payment_method === 'transfer' ? 'Transferencia' : 'Combinado';
              return (
                <div key={sale.id} className="flex items-center justify-between p-3 bg-white rounded-2xl border border-stone-200">
                  <div className="min-w-0 flex-1 mr-2">
                    <div className="text-xs font-bold text-stone-800 truncate">{itemSummary}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock size={12} className="text-stone-400 shrink-0" />
                      <span className="text-[10px] text-stone-500">
                        {formatCurrency(sale.total)} · {paymentLabel}
                        {sale.created_at && ` · ${format(new Date(sale.created_at), 'HH:mm')}`}
                      </span>
                    </div>
                  </div>
                  {isActiveSession(selectedSession) && (
                    <button
                      onClick={() => setCancelSaleId(sale.id)}
                      className="text-rose-400 p-3 bg-rose-50 rounded-xl active:scale-90 transition-transform min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
                      aria-label="Anular venta"
                    >
                      <XCircle size={18} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        <Modal isOpen={!!cancelSaleId} onClose={() => setCancelSaleId(null)} title="Anular Venta">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-6">
              <XCircle size={32} />
            </div>
            <p className="text-stone-500 text-sm mb-8">¿Anular esta venta? Se restaurará el stock de los productos.</p>
            <div className="flex flex-col gap-3 w-full">
              <button onClick={handleCancelSale} className="w-full py-4 bg-rose-600 text-white rounded-2xl font-bold shadow-lg shadow-rose-100 active:scale-95 transition-transform">Sí, Anular</button>
              <button onClick={() => setCancelSaleId(null)} className="w-full py-4 text-stone-500 font-bold active:scale-95 transition-transform">Cancelar</button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  const activeSession = sessions.find(isActiveSession);
  const closedSessions = sessions.filter(s => !isActiveSession(s));
  const grouped = groupSessionsByMonth(closedSessions);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div>
      <h2 className="text-lg font-black mb-4">Historial de Ventas</h2>
      <p className="text-xs text-stone-500 mb-6">Selecciona una jornada para ver sus ventas</p>

      <div className="space-y-3">
        {activeSession && (
          <div className="rounded-2xl border p-4 bg-violet-50 border-violet-200">
            <div className="flex items-center justify-between">
              <button
                onClick={() => handleSelectSession(activeSession)}
                className="flex-1 text-left min-h-[44px]"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-violet-900">
                    {activeSession.name || `Jornada #${activeSession.id}`}
                  </span>
                  <span className="text-[9px] font-black uppercase bg-violet-200 text-violet-800 px-1.5 py-0.5 rounded-full">Activa</span>
                </div>
                <div className="text-[10px] mt-0.5 text-violet-600">Jornada en curso</div>
              </button>
              <button
                onClick={() => handleExportExcel(activeSession)}
                className="text-violet-700 bg-violet-100 rounded-xl active:scale-90 transition-transform min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
                aria-label={`Exportar Excel de ${activeSession.name || 'jornada'}`}
              >
                <FileSpreadsheet size={18} />
              </button>
            </div>
          </div>
        )}

        {grouped.map(group => {
          const isExpanded = expandedGroups.has(group.key);
          return (
            <div key={group.key} className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              <button
                onClick={() => toggleGroup(group.key)}
                className="flex items-center justify-between w-full p-4 text-left min-h-[44px] active:bg-stone-50 transition-colors"
              >
                <span className="font-bold text-stone-700 text-sm">{group.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-stone-400">{group.sessions.length} jornadas</span>
                  <ChevronDown
                    size={16}
                    className={cn(
                      "text-stone-400 transition-transform",
                      isExpanded && "rotate-180"
                    )}
                  />
                </div>
              </button>
              {isExpanded && (
                <div className="border-t border-stone-100">
                  {group.sessions.map(session => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between px-4 py-3 border-b border-stone-50 last:border-0 active:bg-stone-50 transition-colors"
                    >
                      <button
                        onClick={() => handleSelectSession(session)}
                        className="flex-1 text-left min-h-[44px]"
                      >
                        <div className="text-sm font-bold text-stone-800">{session.name || `Jornada #${session.id}`}</div>
                        <div className="text-[10px] text-stone-500">
                          {session.end_time ? format(new Date(session.end_time), 'dd/MM/yyyy HH:mm') : ''}
                        </div>
                      </button>
                      <button
                        onClick={() => handleExportExcel(session)}
                        className="text-violet-600 p-3 bg-violet-50 rounded-xl active:scale-90 transition-transform min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
                        aria-label={`Exportar Excel de ${session.name || 'jornada'}`}
                      >
                        <FileSpreadsheet size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {grouped.length === 0 && !activeSession && (
          <div className="text-center py-12 text-stone-400 text-sm">No hay jornadas registradas</div>
        )}
      </div>
    </div>
  );
}