import { Plus, Minus, Trash2, Image as ImageIcon, ShoppingCart } from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency';
import type { CartItem } from '../types';

interface CartTabProps {
  cart: CartItem[];
  cartTotal: number;
  onRemove: (id: number) => void;
  onUpdateQuantity: (id: number, delta: number) => void;
  onProceedToPayment: () => void;
}

export function CartTab({ cart, cartTotal, onRemove, onUpdateQuantity, onProceedToPayment }: CartTabProps) {
  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-stone-400">
        <ShoppingCart size={48} className="mb-4 opacity-40" />
        <h3 className="text-lg font-bold text-stone-500 mb-1">Carrito vacío</h3>
        <p className="text-sm">Agrega productos desde el catálogo</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="overflow-y-auto flex-1 space-y-3 pr-1">
        {cart.map(item => (
          <div key={item.id} className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl">
            {item.image ? (
              <img
                src={item.image}
                alt={item.name}
                className="w-16 h-16 object-contain rounded-xl bg-stone-100 shrink-0" loading="lazy"
              />
            ) : (
              <div className="w-16 h-16 bg-stone-100 rounded-xl shrink-0 flex items-center justify-center">
                <ImageIcon size={24} className="text-stone-300" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-bold text-stone-800 truncate">{item.name}</div>
              <div className="text-xs text-stone-500">{formatCurrency(item.price)} c/u</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-white rounded-xl border border-stone-200">
                <button
                  onClick={() => onUpdateQuantity(item.id, -1)}
                  className="p-3 text-stone-500 hover:text-stone-600 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Reducir cantidad"
                >
                  <Minus size={16} />
                </button>
                <span className="w-8 text-center font-bold">{item.quantity}</span>
                <button
                  onClick={() => onUpdateQuantity(item.id, 1)}
                  className="p-3 text-stone-500 hover:text-stone-600 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Aumentar cantidad"
                >
                  <Plus size={16} />
                </button>
              </div>
              <button
                onClick={() => onRemove(item.id)}
                className="text-rose-400 p-3 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label={`Eliminar ${item.name} del carrito`}
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-6 border-t border-stone-100 shrink-0 mt-auto">
        <div className="flex justify-between items-center mb-6">
          <span className="text-stone-500 font-bold uppercase text-xs tracking-widest">Total a pagar</span>
          <span className="text-3xl font-black text-stone-900">{formatCurrency(cartTotal)}</span>
        </div>
        <button
          onClick={onProceedToPayment}
          className="w-full bg-violet-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-violet-100 active:scale-95 transition-transform"
        >
          Continuar al Pago
        </button>
      </div>
    </div>
  );
}