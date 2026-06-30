import React, { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, ShoppingCart, Package, ClipboardList, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from './services/api';
import { dbService } from './services/database';
import { MigrationService } from './services/migration';
import { cn } from './utils/cn';
import { formatCurrency, setCurrencySymbol } from './utils/formatCurrency';
import { usePersistedCart } from './hooks/usePersistedCart';
import { useToast } from './contexts/ToastContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NavButton } from './components/NavButton';
import { InventoryTab } from './components/InventoryTab';
import { ReportsTab } from './components/ReportsTab';
import { DashboardTab } from './components/DashboardTab';
import { VenderGrid } from './components/VenderGrid';
import { CartModal } from './components/CartModal';
import { PaymentModal } from './components/PaymentModal';
import { SettingsModal } from './components/SettingsModal';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { App as CapacitorApp } from '@capacitor/app';
import type { Product, Session, Card, SaleInput } from './types';
import type { SettingsMap } from './services/settingsRepository';

const tabLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  vender: 'Vender',
  inventario: 'Inventario',
  reportes: 'Cierre',
};

export default function App() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'vender' | 'inventario' | 'reportes'>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const { cart, addToCart, removeFromCart, updateCartQuantity, clearCart, cartTotal, cartQuantity } = usePersistedCart();
  const [isLoading, setIsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'split' | null>(null);
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
  const [cartPulse, setCartPulse] = useState(false);

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
        await MigrationService.migrate();
        await Promise.all([loadSettings(), fetchProducts(), fetchSession()]);
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
      } else if (showCartModal) {
        setShowCartModal(false);
      } else if (activeTab !== 'dashboard') {
        setActiveTab('dashboard');
      } else {
        CapacitorApp.exitApp();
      }
    });
    return () => { promise.then(h => h.remove()); };
  }, [showSettings, showPaymentModal, showCartModal, activeTab]);

  const handleAddToCart = async (product: Product) => {
    addToCart(product);
    setCartPulse(true);
    try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch {}
    setTimeout(() => setCartPulse(false), 600);
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
    if (!paymentMethod) return;
    if ((paymentMethod === 'transfer' || paymentMethod === 'split') && !selectedCardId) {
      addToast("Por favor selecciona una tarjeta de destino.", 'error');
      return;
    }
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
    }
  };

  const businessName = settings.business_name || 'VentasPro';
  const initial = businessName[0].toUpperCase();
  const lowStockThreshold = parseInt(settings.low_stock_threshold || '5', 10);
  const defaultPaymentMethod = (settings.default_payment_method || 'cash') as 'cash' | 'transfer' | 'split';

  return (
    <div className="min-h-screen min-h-[100dvh] bg-stone-100 font-sans text-stone-900 pb-safe">
      <header className="bg-white border-b border-stone-200 p-4 pt-safe sticky top-0 z-30 shadow-sm">
        <div className="w-full max-w-md md:max-w-3xl lg:max-w-5xl mx-auto flex justify-between items-center">
          <button onClick={() => setShowSettings(true)} className="flex items-center gap-2" aria-label="Abrir configuración">
            {profilePhoto ? (
              <img src={profilePhoto} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold flex items-center justify-center shrink-0">
                {initial}
              </div>
            )}
            <h1 className="text-xl font-bold tracking-tight text-stone-800">{businessName}</h1>
            <Settings size={16} className="text-stone-400 shrink-0 -ml-1" />
          </button>
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-3 h-3 rounded-full",
              "bg-emerald-500"
            )} />
            <span className="text-xs font-medium uppercase tracking-widest text-stone-500">
              {tabLabels[activeTab]}
            </span>
          </div>
        </div>
      </header>

      <main className="w-full max-w-md md:max-w-3xl lg:max-w-5xl mx-auto p-4 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ErrorBoundary label="Dashboard">
                <DashboardTab lowStockThreshold={lowStockThreshold} />
              </ErrorBoundary>
            </motion.div>
          )}

          {activeTab === 'vender' && (
            <motion.div
              key="vender"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ErrorBoundary label="Vender">
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
          )}

          {activeTab === 'inventario' && (
            <motion.div
              key="inventario"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ErrorBoundary label="Inventario">
                <InventoryTab products={products} loading={isLoading} onUpdate={fetchProducts} lowStockThreshold={lowStockThreshold} />
              </ErrorBoundary>
            </motion.div>
          )}

          {activeTab === 'reportes' && (
            <motion.div
              key="reportes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ErrorBoundary label="Cierre">
                <ReportsTab products={products} onSessionClose={() => { fetchSession(); fetchProducts(); }} onProductsChange={fetchProducts} businessName={businessName} currencySymbol={settings.currency_symbol || '$'} />
              </ErrorBoundary>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 p-2 pb-safe flex justify-around items-center z-40">
        <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label="Dashboard" ariaLabel="Ir a Dashboard" />
        <NavButton active={activeTab === 'vender'} onClick={() => setActiveTab('vender')} icon={<ShoppingCart size={20} />} label="Vender" ariaLabel="Ir a Vender" />
        <NavButton active={activeTab === 'inventario'} onClick={() => setActiveTab('inventario')} icon={<Package size={20} />} label="Inventario" ariaLabel="Ir a Inventario" />
        <NavButton active={activeTab === 'reportes'} onClick={() => setActiveTab('reportes')} icon={<ClipboardList size={20} />} label="Cierre" ariaLabel="Ir a Cierre" />
      </nav>

      <AnimatePresence>
        {activeTab === 'vender' && cart.length > 0 && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-[calc(64px+env(safe-area-inset-bottom))] left-0 right-0 p-4 z-30 pointer-events-none"
          >
            <div className="max-w-md md:max-w-3xl lg:max-w-5xl mx-auto pointer-events-auto">
              <button
                onClick={() => setShowCartModal(true)}
                className={cn(
                  "w-full p-4 rounded-2xl shadow-2xl flex justify-between items-center active:scale-95 transition-transform",
                  cartPulse ? "bg-emerald-600 scale-105 text-white" : "bg-stone-900 text-white"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black">
                    {cartQuantity}
                  </div>
                  <span className="font-bold">Ver Carrito</span>
                </div>
                <div className="text-xl font-black">{formatCurrency(cartTotal)}</div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CartModal
        show={showCartModal}
        cart={cart}
        cartTotal={cartTotal}
        onClose={() => setShowCartModal(false)}
        onRemove={removeFromCart}
        onUpdateQuantity={updateCartQuantity}
        onProceedToPayment={() => { setShowCartModal(false); setShowPaymentModal(true); }}
      />

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

      <SettingsModal
        isOpen={showSettings}
        profilePhoto={profilePhoto}
        onClose={() => setShowSettings(false)}
        onSettingsChange={handleSettingsChange}
      />
    </div>
  );
}
