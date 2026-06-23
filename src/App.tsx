import React, { useState, useEffect } from 'react';
import { ShoppingCart, Package, ClipboardList, Plus, Minus, Trash2, DollarSign, CreditCard, XCircle, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from './services/api';
import { dbService } from './services/database';
import { MigrationService } from './services/migration';
import { cn } from './utils/cn';
import { NavButton } from './components/NavButton';
import { InventoryTab } from './components/InventoryTab';
import { ReportsTab } from './components/ReportsTab';
import type { Product, CartItem, Session } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'vender' | 'inventario' | 'reportes'>('vender');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'split' | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [cards, setCards] = useState<any[]>([]);

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

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

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
        await fetchProducts();
        await fetchSession();
      } catch (e) {
        console.error("Error initializing app:", e);
      }
    };
    init();
  }, []);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateCartQuantity = (productId: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(1, Math.min(item.quantity + delta, item.stock));
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Helper function to initialize split payments when selecting payment method
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

  // Helper function to handle cash input change
  const handleCashInputChange = (value: string) => {
    setCashInput(value);
    const cashNum = parseFloat(value) || 0;
    const transferNum = Math.max(0, Math.round((cartTotal - cashNum) * 100) / 100);
    setSplitPayments({ cash: cashNum, transfer: transferNum });
    setTransferInput(transferNum.toFixed(2));
  };

  // Helper function to handle transfer input change
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
      alert("Por favor selecciona una tarjeta de destino.");
      return;
    }
    setLoading(true);
    try {
      // Calculate final amounts based on payment method
      let finalPaymentMethod = paymentMethod;
      let finalPayments = undefined;
      
      if (paymentMethod === 'split') {
        // For split payment, use the actual values from splitPayments state
        finalPayments = [
          { method: 'cash' as const, amount: splitPayments.cash },
          { method: 'transfer' as const, amount: splitPayments.transfer }
        ];
      } else if (paymentMethod === 'cash') {
        finalPayments = [{ method: 'cash' as const, amount: cartTotal }];
      } else if (paymentMethod === 'transfer') {
        finalPayments = [{ method: 'transfer' as const, amount: cartTotal }];
      }
      
      const saleData: any = {
        items: cart,
        payment_method: finalPaymentMethod,
        total: cartTotal,
        payments: finalPayments,
        timestamp: new Date().toISOString(),
        card_id: (paymentMethod === 'transfer' || paymentMethod === 'split') ? selectedCardId : null
      };
      
      const res = await api.createSale(saleData);
      if (res) {
        setCart([]);
        setShowPaymentModal(false);
        setPaymentMethod(null);
        setSelectedCardId(null);
        setSplitPayments({ cash: 0, transfer: 0 });
        setCashInput('');
        setTransferInput('');
        await fetchProducts();
        alert("¡Venta realizada con éxito!");
      } else {
        alert("Error al procesar la venta");
      }
    } catch (error: any) {
      console.error("handlePay error:", error);
      const errorMsg = error.message || error.code || (typeof error === 'string' ? error : JSON.stringify(error));
      alert("Error al procesar el pago: " + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-stone-100 font-sans text-stone-900 pb-safe">
      <header className="bg-white border-b border-stone-200 p-4 pt-safe sticky top-0 z-30 shadow-sm">
        <div className="w-full max-w-md md:max-w-3xl lg:max-w-5xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold tracking-tight text-stone-800">VentasPro</h1>
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-3 h-3 rounded-full",
              "bg-emerald-500"
            )} />
            <span className="text-xs font-medium uppercase tracking-widest text-stone-500">
              {activeTab}
            </span>
          </div>
        </div>
      </header>

      <main className="w-full max-w-md md:max-w-3xl lg:max-w-5xl mx-auto p-4 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'vender' && (
            <motion.div
              key="vender"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar producto..."
                    className="w-full bg-white border border-stone-200 rounded-xl p-3 pl-10 focus:ring-2 ring-stone-900 font-medium text-sm"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Category Filter */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        "px-4 py-2 rounded-full text-xs font-black uppercase whitespace-nowrap transition-all shrink-0",
                        selectedCategory === cat 
                          ? "bg-stone-900 text-white" 
                          : "bg-white text-stone-500 border border-stone-200"
                      )}
                    >
                      {cat === 'all' ? 'Todos' : cat}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {products
                    .filter(p => selectedCategory === 'all' || p.category === selectedCategory)
                    .filter(p => searchQuery === '' || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(product => (
                      <button
                        key={product.id}
                        onClick={() => addToCart(product)}
                        disabled={product.stock <= 0}
                        className={cn(
                          "p-3 sm:p-4 rounded-3xl border text-left transition-all active:scale-95 flex flex-col justify-between min-h-[140px]",
                          product.stock > 0 
                            ? "bg-white border-stone-200 shadow-sm hover:border-emerald-200" 
                            : "bg-stone-50 border-stone-100 opacity-60 grayscale"
                        )}
                      >
                        <div className="w-full">
                          {product.image ? (
                            <img 
                              src={product.image} 
                              alt={product.name}
                              className="w-full aspect-square object-contain rounded-2xl mb-2 bg-stone-100"
                            />
                          ) : (
                            <div className="w-full aspect-square bg-stone-100 rounded-2xl mb-2 flex items-center justify-center">
                              <ImageIcon size={28} className="text-stone-300" />
                            </div>
                          )}
                          <div className="font-black text-stone-900 text-sm leading-tight mb-1 line-clamp-2">{product.name}</div>
                          <div className="text-emerald-600 font-black text-base">${product.price.toFixed(2)}</div>
                          {product.category && (
                            <div className="text-[8px] uppercase font-bold text-stone-400 mt-1">{product.category}</div>
                          )}
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <div className="text-[8px] uppercase font-black text-stone-400">
                            Stock: {product.stock}
                          </div>
                          {product.stock <= 2 && product.stock > 0 && (
                            <div className="bg-amber-500 text-white text-[7px] font-black px-1 py-0.5 rounded-full uppercase">
                              Low
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                </div>
              </div>

              {/* Empty state */}
              {products.length === 0 && (
                <div className="text-center py-20 text-stone-400">
                  <Package className="mx-auto mb-4 opacity-20" size={48} />
                  <p className="font-medium">No hay productos registrados</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'inventario' && (
            <motion.div
              key="inventario"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <InventoryTab products={products} onUpdate={fetchProducts} />
            </motion.div>
          )}

          {activeTab === 'reportes' && (
            <motion.div
              key="reportes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ReportsTab products={products} onSessionClose={() => { fetchSession(); fetchProducts(); }} onProductsChange={fetchProducts} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 p-2 pb-safe flex justify-around items-center z-40">
        <NavButton active={activeTab === 'vender'} onClick={() => setActiveTab('vender')} icon={<ShoppingCart size={20} />} label="Vender" />
        <NavButton active={activeTab === 'inventario'} onClick={() => setActiveTab('inventario')} icon={<Package size={20} />} label="Inventario" />
        <NavButton active={activeTab === 'reportes'} onClick={() => setActiveTab('reportes')} icon={<ClipboardList size={20} />} label="Cierre" />
      </nav>

      {/* Sticky Cart Summary */}
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
                className="w-full bg-stone-900 text-white p-4 rounded-2xl shadow-2xl flex justify-between items-center active:scale-95 transition-transform"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black">
                    {cart.reduce((acc, item) => acc + item.quantity, 0)}
                  </div>
                  <span className="font-bold">Ver Carrito</span>
                </div>
                <div className="text-xl font-black">${cartTotal.toFixed(2)}</div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {/* Cart Modal */}
        {showCartModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }} 
              className="bg-white w-full max-w-md rounded-t-[40px] p-6 pb-8 shadow-2xl max-h-[90vh] max-h-[90dvh] flex flex-col"
            >
              <div className="w-12 h-1.5 bg-stone-200 rounded-full mx-auto mb-6 shrink-0" />
              <div className="flex justify-between items-center mb-6 shrink-0">
                <h3 className="text-2xl font-black">Tu Carrito</h3>
                <button onClick={() => setShowCartModal(false)} className="text-stone-400 p-2"><XCircle size={24} /></button>
              </div>
              
              <div className="overflow-y-auto flex-1 space-y-3 mb-6 pr-1">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl">
                    {item.image ? (
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="w-16 h-16 object-contain rounded-xl bg-stone-100 shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-stone-100 rounded-xl shrink-0 flex items-center justify-center">
                        <ImageIcon size={24} className="text-stone-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-stone-800 truncate">{item.name}</div>
                      <div className="text-xs text-stone-500">${item.price.toFixed(2)} c/u</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center bg-white rounded-xl border border-stone-200 p-1">
                        <button onClick={() => updateCartQuantity(item.id, -1)} className="p-1 text-stone-400 hover:text-stone-600">
                          <Minus size={16} />
                        </button>
                        <span className="w-8 text-center font-bold">{item.quantity}</span>
                        <button onClick={() => updateCartQuantity(item.id, 1)} className="p-1 text-stone-400 hover:text-stone-600">
                          <Plus size={16} />
                        </button>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="text-rose-400 p-1">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-stone-100 shrink-0">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-stone-500 font-bold uppercase text-xs tracking-widest">Total a pagar</span>
                  <span className="text-3xl font-black text-stone-900">${cartTotal.toFixed(2)}</span>
                </div>
                <button 
                  onClick={() => { setShowCartModal(false); setShowPaymentModal(true); }}
                  className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-emerald-100 active:scale-95 transition-transform"
                >
                  Continuar al Pago
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-white w-full max-w-md rounded-t-[40px] p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="w-12 h-1.5 bg-stone-200 rounded-full mx-auto mb-6" />
              <h3 className="text-2xl font-black text-center mb-2">Método de Pago</h3>
              <p className="text-stone-500 text-center mb-6">Selecciona cómo pagará el cliente</p>
              
              {/* Payment Method Selection */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <button 
                  onClick={() => initializeSplitPayments('cash')} 
                  className={cn("flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all", paymentMethod === 'cash' ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-stone-100 bg-stone-50 text-stone-500")}
                >
                  <DollarSign size={28} />
                  <span className="font-bold text-xs">Efectivo</span>
                </button>
                <button 
                  onClick={() => initializeSplitPayments('transfer')} 
                  className={cn("flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all", paymentMethod === 'transfer' ? "border-blue-500 bg-blue-50 text-blue-700" : "border-stone-100 bg-stone-50 text-stone-500")}
                >
                  <CreditCard size={28} />
                  <span className="font-bold text-xs">Transferencia</span>
                </button>
                <button 
                  onClick={() => initializeSplitPayments('split')} 
                  className={cn("flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all", paymentMethod === 'split' ? "border-purple-500 bg-purple-50 text-purple-700" : "border-stone-100 bg-stone-50 text-stone-500")}
                >
                  <div className="flex items-center gap-1">
                    <DollarSign size={14} />
                    <span className="text-xs font-black">+</span>
                    <CreditCard size={14} />
                  </div>
                  <span className="font-bold text-xs">Combinado</span>
                </button>
              </div>

              {/* Card Selection */}
              {(paymentMethod === 'transfer' || paymentMethod === 'split') && (
                <div className="mb-6">
                  <label className="text-[10px] uppercase font-bold text-stone-500 mb-1 block">Tarjeta Destino</label>
                  <select
                    value={selectedCardId || ''}
                    onChange={(e) => setSelectedCardId(Number(e.target.value))}
                    className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 ring-stone-900 font-bold"
                  >
                    <option value="">Seleccionar tarjeta</option>
                    {cards.map(card => (
                      <option key={card.id} value={card.id}>{card.name} - {card.bank}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Split Payment Inputs */}
              {paymentMethod === 'split' && (
                <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-4 mb-6 space-y-4">
                  <div className="text-center mb-2">
                    <p className="text-xs font-bold text-purple-600 uppercase tracking-widest">Total a pagar</p>
                    <p className="text-2xl font-black text-purple-700">${cartTotal.toFixed(2)}</p>
                  </div>
                  
                  <div>
                    <label className="text-[10px] uppercase font-bold text-stone-500 mb-1 block flex items-center gap-2">
                      <DollarSign size={12} /> Efectivo
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={cashInput}
                      onChange={(e) => handleCashInputChange(e.target.value)}
                      className="w-full bg-white border-2 border-purple-200 rounded-xl p-3 focus:ring-2 ring-purple-500 font-bold text-lg"
                    />
                  </div>
                  
                  <div>
                    <label className="text-[10px] uppercase font-bold text-stone-500 mb-1 block flex items-center gap-2">
                      <CreditCard size={12} /> Transferencia
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={transferInput}
                      onChange={(e) => handleTransferInputChange(e.target.value)}
                      className="w-full bg-white border-2 border-blue-200 rounded-xl p-3 focus:ring-2 ring-blue-500 font-bold text-lg"
                    />
                  </div>

                  <div className="pt-3 border-t border-purple-200">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-purple-600 uppercase">Suma:</span>
                      <span className={cn("text-lg font-black", Math.abs((splitPayments.cash + splitPayments.transfer) - cartTotal) < 0.01 ? "text-emerald-600" : "text-rose-500")}>
                        ${(splitPayments.cash + splitPayments.transfer).toFixed(2)}
                      </span>
                    </div>
                    {Math.abs((splitPayments.cash + splitPayments.transfer) - cartTotal) >= 0.01 && (
                      <p className="text-xs text-rose-500 font-bold mt-1">
                        La suma debe ser igual al total (${cartTotal.toFixed(2)})
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button onClick={() => setShowPaymentModal(false)} className="flex-1 py-4 rounded-2xl font-bold text-stone-500 bg-stone-100">Cancelar</button>
                <button 
                  disabled={!paymentMethod || loading || (paymentMethod === 'split' && Math.abs((splitPayments.cash + splitPayments.transfer) - cartTotal) >= 0.01)} 
                  onClick={handleProcessSale} 
                  className="flex-[2] py-4 rounded-2xl font-bold text-white bg-emerald-600 shadow-lg shadow-emerald-100 disabled:opacity-50"
                >
                  {loading ? "Procesando..." : "Confirmar Venta"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
