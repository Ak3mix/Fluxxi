import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, List, ShoppingCart, Package, MoreHorizontal, Settings, FileSpreadsheet, Clock, User, Lock, Download, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from './services/api';
import { dbService } from './services/database';
import { MigrationService } from './services/migration';
import { formatCurrency, setCurrencySymbol } from './utils/formatCurrency';
import { usePersistedCart } from './hooks/usePersistedCart';
import { useToast } from './contexts/ToastContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NavButton } from './components/NavButton';
import { InventoryTab } from './components/InventoryTab';
import { ReportsTab } from './components/ReportsTab';
import { DashboardTab } from './components/DashboardTab';
import { VenderGrid } from './components/VenderGrid';
import { CartTab } from './components/CartTab';
import { SalesHistoryTab } from './components/SalesHistoryTab';
import { PaymentModal } from './components/PaymentModal';
import { SettingsModal } from './components/SettingsModal';
import { Modal } from './components/Modal';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { App as CapacitorApp } from '@capacitor/app';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { dataTransferService } from './services/dataTransferService';
import type { Product, Session, Card, SaleInput } from './types';
import type { SettingsMap } from './services/settingsRepository';

const tabLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  catalogo: 'Catálogo',
  carrito: 'Carrito',
  inventario: 'Inventario',
  mas: 'Más',
};

export default function App() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'catalogo' | 'carrito' | 'inventario' | 'mas'>('dashboard');
  const [masSection, setMasSection] = useState<'menu' | 'reportes' | 'historial' | 'datos'>('menu');
  const [products, setProducts] = useState<Product[]>([]);
  const { cart, addToCart, removeFromCart, updateCartQuantity, clearCart, cartTotal, cartQuantity } = usePersistedCart();
  const [isLoading, setIsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'split' | null>(null);
  const [cartPulse, setCartPulse] = useState(false);
  const [showCloseSessionConfirm, setShowCloseSessionConfirm] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [cards, setCards] = useState<Card[]>([]);

  const [settings, setSettings] = useState<SettingsMap>({});
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  useEffect(() => {
    api.getCards().then(setCards);
  }, []);

  useEffect(() => {
    if (showPaymentModal) {
      api.getCards().then(setCards);
    }
  }, [showPaymentModal]);

  const [splitPayments, setSplitPayments] = useState<{ cash: number; transfer: number }>({ cash: 0, transfer: 0 });
  const [cashInput, setCashInput] = useState('');
  const [transferInput, setTransferInput] = useState('');
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const processingRef = useRef(false);

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))] as string[];

  const loadSettings = async () => {
    const s = await api.getAllSettings();
    setSettings(s);
    setCurrencySymbol(s.currency_symbol || '$');
    const photo = await api.getProfilePhoto();
    setProfilePhoto(photo);
  };

  const handleSettingsChange = (s: SettingsMap) => {
    setSettings(s);
    setCurrencySymbol(s.currency_symbol || '$');
    api.getProfilePhoto().then(setProfilePhoto);
  };

  const fetchProducts = async () => {
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (e) { console.error(e); }
  };

  const fetchSession = async () => {
    try {
      const data = await api.getCurrentReport();
      setCurrentSession(data.session);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    const init = async () => {
      try {
        await dbService.initializeDatabase();
        await loadSettings();
        await MigrationService.migrate();
        await Promise.all([fetchProducts(), fetchSession()]);
      } catch (e) {
        console.error("Error initializing app:", e);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const promise = CapacitorApp.addListener('backButton', () => {
      if (showSettings) {
        setShowSettings(false);
      } else if (showPaymentModal) {
        setShowPaymentModal(false);
      } else if (activeTab === 'mas' && masSection !== 'menu') {
        setMasSection('menu');
      } else if (activeTab !== 'dashboard') {
        setActiveTab('dashboard');
      } else {
        CapacitorApp.exitApp();
      }
    });
    return () => { promise.then(h => h.remove()); };
  }, [showSettings, showPaymentModal, activeTab, masSection]);

  const handleAddToCart = async (product: Product) => {
    addToCart(product);
    setCartPulse(true);
    setTimeout(() => setCartPulse(false), 600);
    try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch {}
  };

  const handleMasSelect = (section: 'reportes' | 'historial' | 'datos') => {
    setActiveTab('mas');
    setMasSection(section);
  };

  const handleCloseSession = async () => {
    setShowCloseSessionConfirm(false);
    try {
      await api.closeSession();
      await fetchProducts();
      await fetchSession();
      addToast('Jornada cerrada correctamente. Se ha iniciado una nueva.', 'success');
    } catch {
      addToast('Error al cerrar la jornada', 'error');
    }
  };

  const handleExport = async () => {
    try {
      await dataTransferService.exportDatabase();
      addToast('Exportación exitosa', 'success');
    } catch (e: any) {
      addToast('Error al exportar: ' + (e.message || e.code || JSON.stringify(e)), 'error');
    }
  };

  const handleImport = async () => {
    try {
      const result = await FilePicker.pickFiles({
        types: ['application/zip', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      });
      if (result.files.length > 0) {
        const file = result.files[0];
        if (!file.path) throw new Error('No se pudo obtener la ruta del archivo');
        const fileRead = await Filesystem.readFile({ path: file.path });
        await dataTransferService.importDatabase(fileRead.data as string);
        addToast('Importación exitosa, la app se reiniciará', 'success');
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (e: any) {
      addToast('Error al importar: ' + (e.message || JSON.stringify(e)), 'error');
    }
  };

  const initializeSplitPayments = (method: 'cash' | 'transfer' | 'split') => {
    setPaymentMethod(method);
    if (method === 'cash') {
      setSplitPayments({ cash: cartTotal, transfer: 0 });
      setCashInput(cartTotal.toFixed(2));
      setTransferInput('');
    } else if (method === 'transfer') {
      setSplitPayments({ cash: 0, transfer: cartTotal });
      setCashInput('');
      setTransferInput(cartTotal.toFixed(2));
    } else if (method === 'split') {
      const halfCash = Math.round((cartTotal / 2) * 100) / 100;
      const halfTransfer = Math.round((cartTotal - halfCash) * 100) / 100;
      setSplitPayments({ cash: halfCash, transfer: halfTransfer });
      setCashInput(halfCash.toFixed(2));
      setTransferInput(halfTransfer.toFixed(2));
    }
  };

  const handleCashInputChange = (value: string) => {
    setCashInput(value);
    const cashNum = parseFloat(value) || 0;
    const transferNum = Math.max(0, Math.round((cartTotal - cashNum) * 100) / 100);
    setSplitPayments({ cash: cashNum, transfer: transferNum });
    setTransferInput(transferNum.toFixed(2));
  };

  const handleTransferInputChange = (value: string) => {
    setTransferInput(value);
    const transferNum = parseFloat(value) || 0;
    const cashNum = Math.max(0, Math.round((cartTotal - transferNum) * 100) / 100);
    setSplitPayments({ cash: cashNum, transfer: transferNum });
    setCashInput(cashNum.toFixed(2));
  };

  const handleProcessSale = async () => {
    if (processingRef.current) return;
    if (!paymentMethod) return;
    if ((paymentMethod === 'transfer' || paymentMethod === 'split') && !selectedCardId) {
      addToast("Por favor selecciona una tarjeta de destino.", 'error');
      return;
    }
    processingRef.current = true;
    setLoading(true);
    try {
      let finalPaymentMethod = paymentMethod;
      let finalPayments = undefined;

      if (paymentMethod === 'split') {
        finalPayments = [
          { method: 'cash' as const, amount: splitPayments.cash },
          { method: 'transfer' as const, amount: splitPayments.transfer }
        ];
      } else if (paymentMethod === 'cash') {
        finalPayments = [{ method: 'cash' as const, amount: cartTotal }];
      } else if (paymentMethod === 'transfer') {
        finalPayments = [{ method: 'transfer' as const, amount: cartTotal }];
      }

      const saleData: SaleInput = {
        items: cart,
        payment_method: finalPaymentMethod,
        total: cartTotal,
        payments: finalPayments,
        timestamp: new Date().toISOString(),
        card_id: (paymentMethod === 'transfer' || paymentMethod === 'split') ? selectedCardId : null
      };

      const res = await api.createSale(saleData);
      if (res) {
        clearCart();
        setShowPaymentModal(false);
        setPaymentMethod(null);
        setSelectedCardId(null);
        setSplitPayments({ cash: 0, transfer: 0 });
        setCashInput('');
        setTransferInput('');
        await fetchProducts();
        addToast("¡Venta realizada con éxito!", 'success');
      } else {
        addToast("Error al procesar la venta", 'error');
      }
    } catch (error: any) {
      console.error("handlePay error:", error);
      const errorMsg = error.message || error.code || (typeof error === 'string' ? error : JSON.stringify(error));
      addToast("Error al procesar el pago: " + errorMsg, 'error');
    } finally {
      setLoading(false);
      processingRef.current = false;
    }
  };

  const businessName = settings.business_name || 'Fluxxi';
  const initial = businessName[0].toUpperCase();
  const lowStockThreshold = parseInt(settings.low_stock_threshold || '5', 10);
  const defaultPaymentMethod = (settings.default_payment_method || 'cash') as 'cash' | 'transfer' | 'split';

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <ErrorBoundary label="Dashboard">
              <DashboardTab lowStockThreshold={lowStockThreshold} appLoading={isLoading} />
            </ErrorBoundary>
          </motion.div>
        );
      case 'catalogo':
        return (
          <motion.div
            key="catalogo"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <ErrorBoundary label="Catálogo">
              <VenderGrid
                products={products}
                loading={isLoading}
                searchQuery={searchQuery}
                selectedCategory={selectedCategory}
                categories={categories}
                onSearchChange={setSearchQuery}
                onCategoryChange={setSelectedCategory}
                onAddToCart={handleAddToCart}
                lowStockThreshold={lowStockThreshold}
              />
            </ErrorBoundary>
          </motion.div>
        );
      case 'carrito':
        return (
          <motion.div
            key="carrito"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col h-full"
          >
            <ErrorBoundary label="Carrito">
              <h2 className="text-lg font-bold text-stone-800 mb-4">Tu Carrito</h2>
              <CartTab
                cart={cart}
                cartTotal={cartTotal}
                onRemove={removeFromCart}
                onUpdateQuantity={updateCartQuantity}
                onProceedToPayment={() => setShowPaymentModal(true)}
              />
            </ErrorBoundary>
          </motion.div>
        );
      case 'inventario':
        return (
          <motion.div
            key="inventario"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <ErrorBoundary label="Inventario">
              <InventoryTab products={products} loading={isLoading} onUpdate={fetchProducts} lowStockThreshold={lowStockThreshold} onAddToCart={handleAddToCart} />
            </ErrorBoundary>
          </motion.div>
        );
      case 'mas':
        if (masSection === 'reportes') {
          return (
            <motion.div
              key="mas-reportes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ErrorBoundary label="Reportes">
                <div className="flex items-center gap-3 mb-6">
                  <button
                    onClick={() => setMasSection('menu')}
                    className="p-2 -ml-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label="Volver"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                  </button>
                  <h2 className="text-lg font-black">Reportes</h2>
                </div>
                <ReportsTab
                  products={products}
                  onProductsChange={fetchProducts}
                  businessName={businessName}
                  currencySymbol={settings.currency_symbol || '$'}
                />
              </ErrorBoundary>
            </motion.div>
          );
        }
        if (masSection === 'historial') {
          return (
            <motion.div
              key="mas-historial"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ErrorBoundary label="Historial">
                <div className="flex items-center gap-3 mb-6">
                  <button
                    onClick={() => setMasSection('menu')}
                    className="p-2 -ml-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label="Volver"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                  </button>
                  <h2 className="text-lg font-black">Historial</h2>
                </div>
                <SalesHistoryTab
                  products={products}
                  businessName={businessName}
                  currencySymbol={settings.currency_symbol || '$'}
                />
              </ErrorBoundary>
            </motion.div>
          );
        }
        if (masSection === 'datos') {
          return (
            <motion.div
              key="mas-datos"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ErrorBoundary label="Datos">
                <div className="flex items-center gap-3 mb-6">
                  <button
                    onClick={() => setMasSection('menu')}
                    className="p-2 -ml-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label="Volver"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                  </button>
                  <h2 className="text-lg font-black">Exportar / Importar</h2>
                </div>
                <div className="space-y-3">
                  <button onClick={handleExport} className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold bg-violet-50 text-violet-700 border-2 border-violet-200 active:scale-95 transition-all">
                    <Download size={20} /> Exportar Base de Datos
                  </button>
                  <button onClick={handleImport} className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold bg-blue-50 text-blue-700 border-2 border-blue-200 active:scale-95 transition-all">
                    <Upload size={20} /> Importar Base de Datos
                  </button>
                </div>
              </ErrorBoundary>
            </motion.div>
          );
        }
        return (
          <motion.div
            key="mas-menu"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <h2 className="text-lg font-black mb-6">Más</h2>
            <div className="space-y-3">
              <button
                onClick={() => handleMasSelect('reportes')}
                className="flex items-center gap-4 w-full p-4 bg-white rounded-2xl border border-stone-200 text-left active:scale-95 transition-transform min-h-[56px]"
              >
                <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <div className="font-bold text-stone-800">Reportes</div>
                  <div className="text-[11px] text-stone-500">Cierre de jornada e historial</div>
                </div>
              </button>
              <button
                onClick={() => handleMasSelect('historial')}
                className="flex items-center gap-4 w-full p-4 bg-white rounded-2xl border border-stone-200 text-left active:scale-95 transition-transform min-h-[56px]"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Clock size={20} />
                </div>
                <div>
                  <div className="font-bold text-stone-800">Historial de ventas</div>
                  <div className="text-[11px] text-stone-500">Ventas agrupadas por jornada</div>
                </div>
              </button>
              <button
                onClick={() => setShowCloseSessionConfirm(true)}
                className="flex items-center gap-4 w-full p-4 bg-white rounded-2xl border border-stone-200 text-left active:scale-95 transition-transform min-h-[56px]"
              >
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <Lock size={20} />
                </div>
                <div>
                  <div className="font-bold text-stone-800">Cerrar Jornada</div>
                  <div className="text-[11px] text-stone-500">Finalizar la jornada actual</div>
                </div>
              </button>
              <button
                onClick={() => handleMasSelect('datos')}
                className="flex items-center gap-4 w-full p-4 bg-white rounded-2xl border border-stone-200 text-left active:scale-95 transition-transform min-h-[56px]"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Download size={20} />
                </div>
                <div>
                  <div className="font-bold text-stone-800">Exportar / Importar</div>
                  <div className="text-[11px] text-stone-500">Respaldar o restaurar información</div>
                </div>
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-4 w-full p-4 bg-white rounded-2xl border border-stone-200 text-left active:scale-95 transition-transform min-h-[56px]"
              >
                <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                  <User size={20} />
                </div>
                <div>
                  <div className="font-bold text-stone-800">Perfil y ajustes</div>
                  <div className="text-[11px] text-stone-500">Configuración del negocio</div>
                </div>
              </button>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-stone-100 font-sans text-stone-900 pb-safe">
      <header className="bg-white border-b border-stone-200 p-4 pt-safe sticky top-0 z-30 shadow-sm">
        <div className="w-full max-w-md md:max-w-3xl lg:max-w-5xl mx-auto flex justify-between items-center">
          <button onClick={() => setShowSettings(true)} className="flex items-center gap-2" aria-label="Abrir configuración">
            {profilePhoto ? (
              <img src={profilePhoto} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-violet-100 text-violet-700 text-sm font-bold flex items-center justify-center shrink-0">
                {initial}
              </div>
            )}
            <h1 className="text-xl font-bold tracking-tight text-stone-800">{businessName}</h1>
            <Settings size={16} className="text-stone-400 shrink-0 -ml-1" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-violet-500" />
            <span className="text-xs font-medium uppercase tracking-widest text-stone-500">
              {tabLabels[activeTab]}
            </span>
          </div>
        </div>
      </header>

      <main className="w-full max-w-md md:max-w-3xl lg:max-w-5xl mx-auto p-4 pb-24">
        <AnimatePresence mode="wait">
          {renderTabContent()}
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 p-2 pb-safe flex justify-around items-center z-40">
        <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label="Dashboard" ariaLabel="Ir a Dashboard" />
        <NavButton active={activeTab === 'catalogo'} onClick={() => setActiveTab('catalogo')} icon={<List size={20} />} label="Catálogo" ariaLabel="Ir a Catálogo" />
        <NavButton active={activeTab === 'carrito'} onClick={() => setActiveTab('carrito')} icon={<ShoppingCart size={24} />} label="Carrito" ariaLabel="Ir a Carrito" badge={cartQuantity > 0 ? cartQuantity : undefined} center pulse={cartPulse} />
        <NavButton active={activeTab === 'inventario'} onClick={() => setActiveTab('inventario')} icon={<Package size={20} />} label="Inventario" ariaLabel="Ir a Inventario" />
        <NavButton active={activeTab === 'mas'} onClick={() => { setActiveTab('mas'); setMasSection('menu'); }} icon={<MoreHorizontal size={20} />} label="Más" ariaLabel="Más opciones" />
      </nav>

      <PaymentModal
        show={showPaymentModal}
        cartTotal={cartTotal}
        cards={cards}
        paymentMethod={paymentMethod}
        selectedCardId={selectedCardId}
        splitPayments={splitPayments}
        cashInput={cashInput}
        transferInput={transferInput}
        loading={loading}
        defaultPaymentMethod={defaultPaymentMethod}
        onClose={() => setShowPaymentModal(false)}
        onPaymentMethodChange={initializeSplitPayments}
        onCardChange={setSelectedCardId}
        onCashInputChange={handleCashInputChange}
        onTransferInputChange={handleTransferInputChange}
        onProcessSale={handleProcessSale}
      />

      <Modal isOpen={showCloseSessionConfirm} onClose={() => setShowCloseSessionConfirm(false)} title="¿Cerrar Jornada?">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-6">
            <Lock size={32} />
          </div>
          <p className="text-stone-500 text-sm mb-8">
            Esta acción bloqueará las ventas actuales y reiniciará los totales para una nueva jornada.
          </p>
          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={handleCloseSession}
              className="w-full py-4 bg-rose-600 text-white rounded-2xl font-bold shadow-lg shadow-rose-100 active:scale-95 transition-transform"
            >
              Sí, Cerrar Jornada
            </button>
            <button
              onClick={() => setShowCloseSessionConfirm(false)}
              className="w-full py-4 text-stone-500 font-bold active:scale-95 transition-transform"
            >
              No, Continuar Vendiendo
            </button>
          </div>
        </div>
      </Modal>

      <SettingsModal
        isOpen={showSettings}
        profilePhoto={profilePhoto}
        onClose={() => setShowSettings(false)}
        onSettingsChange={handleSettingsChange}
      />
    </div>
  );
}