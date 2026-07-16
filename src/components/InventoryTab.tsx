import React, { useState, useEffect } from 'react';
import {
  Plus,
  ShoppingCart,
  ArrowUpCircle,
  ArrowDownCircle,
  Trash2,
  Edit,
  Image as ImageIcon,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useDebounce } from '../hooks/useDebounce';
import { formatCurrency } from '../utils/formatCurrency';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { Skeleton } from './Skeleton';
import { ProductFormModal } from './ProductFormModal';
import type { ProductFormData } from './ProductFormModal';
import { CardFormModal } from './CardFormModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { MoveInventoryModal } from './MoveInventoryModal';
import { Modal } from './Modal';
import type { Product, Card } from '../types';

export function InventoryTab({ products, loading = false, onUpdate, lowStockThreshold = 5, onAddToCart }: { products: Product[]; loading?: boolean; onUpdate: () => void; lowStockThreshold?: number; onAddToCart?: (product: Product) => void }) {
  const { addToast } = useToast();
  const [activeInventoryTab, setActiveInventoryTab] = useState<'products' | 'cards'>('products');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [movingProduct, setMovingProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const debouncedSearch = useDebounce(searchQuery, 300);

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))] as string[];
  const filteredProducts = products
    .filter(p => selectedCategory === 'all' || p.category === selectedCategory)
    .filter(p => debouncedSearch === '' || p.name.toLowerCase().includes(debouncedSearch.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [cards, setCards] = useState<Card[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [showCardForm, setShowCardForm] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [deletingCardId, setDeletingCardId] = useState<number | null>(null);
  const [isDeletingCard, setIsDeletingCard] = useState(false);

  const fetchCards = async () => {
    setCardsLoading(true);
    const data = await api.getCards();
    setCards(data);
    setCardsLoading(false);
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const handleSaveCard = async (data: { name: string; bank: string; account_number: string }) => {
    if (editingCard) {
      await api.updateCard(editingCard.id, data);
    } else {
      await api.addCard(data);
    }
    setShowCardForm(false);
    setEditingCard(null);
    fetchCards();
  };

  const handleDeleteCardConfirm = async () => {
    if (deletingCardId === null) return;
    setIsDeletingCard(true);
    try {
      await api.deleteCard(deletingCardId);
      setDeletingCardId(null);
      fetchCards();
    } catch (e) {
      console.error(e);
      addToast('Error al eliminar la tarjeta', 'error');
    } finally {
      setIsDeletingCard(false);
    }
  };

  const handleSaveProduct = async (data: ProductFormData) => {
    setIsSaving(true);
    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, data);
        setEditingProduct(null);
        setShowAddProduct(false);
      } else {
        await api.addProduct(data);
        setShowAddProduct(false);
      }
      onUpdate();
    } catch (error: any) {
      const errorMsg = error.message || error.code || (typeof error === 'string' ? error : JSON.stringify(error));
      addToast('Error al guardar el producto: ' + errorMsg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deletingProduct || isDeleting) return;
    setIsDeleting(true);
    try {
      await api.deleteProduct(deletingProduct.id);
      setDeletingProduct(null);
      onUpdate();
    } catch (error: any) {
      const errorMsg = error.message || error.code || (typeof error === 'string' ? error : JSON.stringify(error));
      addToast('Error al eliminar el producto: ' + errorMsg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMove = async (data: { type: 'entry' | 'waste'; quantity: number; reason: string }) => {
    if (!movingProduct) return;
    try {
      const res = await api.moveInventory({
        product_id: movingProduct.id,
        type: data.type,
        quantity: data.quantity,
        reason: data.reason || (data.type === 'entry' ? 'Reabastecimiento' : 'Merma'),
      });
      if (res) {
        setMovingProduct(null);
        onUpdate();
      } else {
        addToast('Error en el movimiento', 'error');
      }
    } catch (error: any) {
      const errorMsg = error.message || error.code || (typeof error === 'string' ? error : JSON.stringify(error));
      addToast('Error en el movimiento: ' + errorMsg, 'error');
    }
  };

  return (
    <div className="space-y-6 pb-4">
      <div className="flex p-1 bg-stone-100 rounded-xl">
        <button
          onClick={() => setActiveInventoryTab('products')}
          className={cn(
            'flex-1 py-2 text-xs font-bold rounded-lg transition-all',
            activeInventoryTab === 'products' ? 'bg-white shadow' : 'text-stone-500'
          )}
        >
          Productos
        </button>
        <button
          onClick={() => setActiveInventoryTab('cards')}
          className={cn(
            'flex-1 py-2 text-xs font-bold rounded-lg transition-all',
            activeInventoryTab === 'cards' ? 'bg-white shadow' : 'text-stone-500'
          )}
        >
          Tarjetas
        </button>
      </div>

      {activeInventoryTab === 'products' ? (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black text-stone-900">Inventario</h2>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setShowAddProduct(true);
                }}
                className="bg-stone-900 text-white p-3 rounded-xl shadow-lg active:scale-95 transition-transform shrink-0"
                aria-label="Añadir producto"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          <input
            type="text"
            placeholder="Buscar producto..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm"
          />

          {categories.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    'text-[10px] uppercase font-bold px-3 py-1.5 rounded-full shrink-0 transition-colors',
                    selectedCategory === cat ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-500'
                  )}
                >
                  {cat === 'all' ? 'Todos' : cat}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex items-start gap-4">
                  <Skeleton.Box className="w-20 h-20 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton.Box className="h-5 w-3/4" />
                    <Skeleton.Box className="h-4 w-1/2" />
                    <div className="flex gap-2 justify-end mt-3">
                      <Skeleton.Box className="h-10 w-16 rounded-xl" />
                      <Skeleton.Box className="h-10 w-16 rounded-xl" />
                      <Skeleton.Box className="h-10 w-16 rounded-xl" />
                      <Skeleton.Box className="h-10 w-16 rounded-xl" />
                    </div>
                  </div>
                </div>
              ))
            ) : filteredProducts.length === 0 && products.length > 0 ? (
              <div className="text-center py-12 text-stone-500">
                <p className="font-medium">No se encontraron productos</p>
              </div>
            ) : (
              (() => {
                const maxStock = Math.max(...filteredProducts.map(p => p.initial_stock || p.stock * 2), 1);
                return filteredProducts.map(product => {
                  const barPct = Math.min(100, ((product.stock ?? 0) / maxStock) * 100);
                  const isLow = (product.stock ?? 0) <= lowStockThreshold;
                  const isCritical = (product.stock ?? 0) <= 0;
                  return (
                    <button
                      key={product.id}
                      onClick={() => setSelectedProduct(product)}
                      className="w-full bg-white px-4 py-3 border-b border-stone-100 text-left active:bg-stone-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-11 h-11 object-contain rounded-lg shrink-0 bg-stone-100" loading="lazy"
                          />
                        ) : (
                          <div className="w-11 h-11 bg-stone-100 rounded-lg shrink-0 flex items-center justify-center">
                            <ImageIcon size={20} className="text-stone-300" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-stone-900 text-sm leading-tight truncate flex items-center gap-2">
                            {product.name}
                            {isCritical && (
                              <span className="text-[9px] bg-rose-100 text-rose-700 font-black px-1.5 py-0.5 rounded-full uppercase">Agotado</span>
                            )}
                            {!isCritical && isLow && (
                              <span className="text-[9px] bg-amber-100 text-amber-700 font-black px-1.5 py-0.5 rounded-full uppercase">Stock Bajo</span>
                            )}
                          </div>
                          <div className="text-[11px] text-stone-500 mt-0.5">
                            {product.category && <span className="font-medium">{product.category}</span>}
                            {product.category && <span className="mx-1">•</span>}
                            {formatCurrency(product.price)}
                            {(product.cost || 0) > 0 && <span className="text-stone-400"> • costo {formatCurrency(product.cost || 0)}</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={cn("text-base font-black leading-none", isCritical ? "text-rose-600" : isLow ? "text-amber-600" : "text-stone-900")}>
                            {product.stock ?? 0}
                          </div>
                          <div className={cn("mt-1.5 w-16 h-1.5 rounded-full overflow-hidden", isCritical ? "bg-rose-100" : isLow ? "bg-amber-100" : "bg-stone-100")}>
                            <div
                              className={cn("h-full rounded-full transition-all", isCritical ? "bg-rose-400" : isLow ? "bg-amber-400" : "bg-violet-500")}
                              style={{ width: `${barPct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                });
              })()
            )}
          </div>
        </>
      ) : (
        <div className="p-4 bg-white rounded-2xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg">Tarjetas de Pago</h3>
            <button
              onClick={() => {
                setEditingCard(null);
                setShowCardForm(true);
              }}
              className="bg-stone-900 text-white p-3 rounded-xl"
              aria-label="Añadir tarjeta"
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="space-y-2">
            {cardsLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="p-3 bg-stone-50 rounded-xl flex justify-between items-center">
                  <div className="space-y-1.5 flex-1">
                    <Skeleton.Box className="h-4 w-1/2" />
                    <Skeleton.Box className="h-3 w-2/3" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton.Box className="h-9 w-9 rounded-lg" />
                    <Skeleton.Box className="h-9 w-9 rounded-lg" />
                  </div>
                </div>
              ))
            ) : (
              cards.map(card => (
                <div key={card.id} className="p-3 bg-stone-50 rounded-xl flex justify-between items-center">
                  <div>
                    <div className="font-bold">{card.name}</div>
                    <div className="text-xs text-stone-500">
                      {card.bank} - {card.account_number}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingCard(card);
                        setShowCardForm(true);
                      }}
                      className="text-stone-600 p-2.5"
                      aria-label={`Editar ${card.name}`}
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => setDeletingCardId(card.id)}
                      className="text-rose-500 p-2.5"
                      aria-label={`Eliminar ${card.name}`}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
            {!cardsLoading && cards.length === 0 && (
              <div className="text-center py-8 text-stone-500 text-sm italic">
                No hay tarjetas registradas
              </div>
            )}
          </div>
        </div>
      )}

      <CardFormModal
        isOpen={showCardForm}
        initialData={editingCard}
        onSave={handleSaveCard}
        onClose={() => {
          setShowCardForm(false);
          setEditingCard(null);
        }}
      />

      <ProductFormModal
        isOpen={showAddProduct}
        initialData={editingProduct}
        isSaving={isSaving}
        onSave={handleSaveProduct}
        onClose={() => {
          setShowAddProduct(false);
          setEditingProduct(null);
        }}
      />

      <DeleteConfirmModal
        isOpen={!!deletingProduct}
        itemName={deletingProduct?.name || ''}
        isDeleting={isDeleting}
        onConfirm={handleDeleteProduct}
        onClose={() => setDeletingProduct(null)}
      />

      <DeleteConfirmModal
        isOpen={!!deletingCardId}
        itemName="esta tarjeta"
        title="¿Eliminar Tarjeta?"
        message="Esta acción no se puede deshacer."
        isDeleting={isDeletingCard}
        onConfirm={handleDeleteCardConfirm}
        onClose={() => setDeletingCardId(null)}
      />

      <MoveInventoryModal
        isOpen={!!movingProduct}
        product={movingProduct}
        onConfirm={handleMove}
        onClose={() => setMovingProduct(null)}
      />

      <Modal
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        title={selectedProduct?.name || ''}
        variant="bottom-sheet"
      >
        <div className="space-y-2 pb-4">
          <button
            onClick={() => {
              const p = selectedProduct;
              setSelectedProduct(null);
              if (p && onAddToCart) onAddToCart(p);
            }}
            className="flex items-center gap-4 w-full p-4 text-left rounded-xl hover:bg-stone-50 active:scale-95 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
              <ShoppingCart size={20} />
            </div>
            <div>
              <div className="font-bold text-stone-800 text-sm">Agregar al Carrito</div>
              <div className="text-[11px] text-stone-500">Añadir producto a la venta</div>
            </div>
          </button>
          <button
            onClick={() => {
              const p = selectedProduct;
              setSelectedProduct(null);
              if (p) setMovingProduct(p);
            }}
            className="flex items-center gap-4 w-full p-4 text-left rounded-xl hover:bg-stone-50 active:scale-95 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
              <ArrowUpCircle size={20} />
            </div>
            <div>
              <div className="font-bold text-stone-800 text-sm">Entrada (Reabastecer)</div>
              <div className="text-[11px] text-stone-500">Aumentar el stock del producto</div>
            </div>
          </button>
          <button
            onClick={() => {
              const p = selectedProduct;
              setSelectedProduct(null);
              if (p) setMovingProduct(p);
            }}
            className="flex items-center gap-4 w-full p-4 text-left rounded-xl hover:bg-stone-50 active:scale-95 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <ArrowDownCircle size={20} />
            </div>
            <div>
              <div className="font-bold text-stone-800 text-sm">Merma</div>
              <div className="text-[11px] text-stone-500">Registrar pérdida o desperdicio</div>
            </div>
          </button>
          <button
            onClick={() => {
              const p = selectedProduct;
              setSelectedProduct(null);
              if (p) {
                setEditingProduct(p);
                setShowAddProduct(true);
              }
            }}
            className="flex items-center gap-4 w-full p-4 text-left rounded-xl hover:bg-stone-50 active:scale-95 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Edit size={20} />
            </div>
            <div>
              <div className="font-bold text-stone-800 text-sm">Editar</div>
              <div className="text-[11px] text-stone-500">Modificar datos del producto</div>
            </div>
          </button>
          <button
            onClick={() => {
              const p = selectedProduct;
              setSelectedProduct(null);
              if (p) setDeletingProduct(p);
            }}
            className="flex items-center gap-4 w-full p-4 text-left rounded-xl hover:bg-stone-50 active:scale-95 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-stone-100 text-rose-500 flex items-center justify-center shrink-0">
              <Trash2 size={20} />
            </div>
            <div>
              <div className="font-bold text-stone-800 text-sm">Eliminar</div>
              <div className="text-[11px] text-stone-500">Quitar producto del inventario</div>
            </div>
          </button>
        </div>
      </Modal>
    </div>
  );
}
