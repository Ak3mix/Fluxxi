import React, { useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '../utils/cn';
import type { Product } from '../types';

interface MoveData {
  type: 'entry' | 'waste';
  quantity: number;
  reason: string;
}

interface Props {
  isOpen: boolean;
  product: Product | null;
  onConfirm: (data: MoveData) => Promise<void>;
  onClose: () => void;
}

export function MoveInventoryModal({ isOpen, product, onConfirm, onClose }: Props) {
  const [moveType, setMoveType] = useState<'entry' | 'waste'>('entry');
  const [moveQty, setMoveQty] = useState(1);
  const [moveReason, setMoveReason] = useState<string>('');

  const handleConfirm = async () => {
    await onConfirm({ type: moveType, quantity: moveQty, reason: moveReason });
    setMoveQty(1);
    setMoveReason('');
  };

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl"
      >
        <h3 className="text-xl font-black mb-2">
          {moveType === 'entry' ? 'Reabastecer' : 'Registrar Merma'}
        </h3>
        <p className="text-stone-500 text-sm mb-6">{product.name}</p>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMoveType('entry')}
            className={cn(
              "flex-1 py-2 rounded-xl text-xs font-bold transition-all",
              moveType === 'entry' ? "bg-blue-600 text-white" : "bg-stone-100 text-stone-500"
            )}
          >
            Entrada
          </button>
          <button
            type="button"
            onClick={() => setMoveType('waste')}
            className={cn(
              "flex-1 py-2 rounded-xl text-xs font-bold transition-all",
              moveType === 'waste' ? "bg-rose-600 text-white" : "bg-stone-100 text-stone-500"
            )}
          >
            Merma
          </button>
        </div>

        <div className="space-y-4 mb-8">
          <div>
            <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Cantidad</label>
            <input
              type="number"
              value={moveQty}
              onChange={e => setMoveQty(parseInt(e.target.value) || 0)}
              className="w-full bg-stone-50 border-none rounded-xl p-3"
            />
          </div>
          {moveType === 'waste' && (
            <div>
              <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Motivo (Opcional)</label>
              <input
                placeholder="Ej: Caducidad, Daño..."
                value={moveReason}
                onChange={e => setMoveReason(e.target.value)}
                className="w-full bg-stone-50 border-none rounded-xl p-3"
              />
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 font-bold text-stone-500">Cancelar</button>
          <button
            onClick={handleConfirm}
            className={cn(
              "flex-1 py-3 text-white rounded-xl font-bold",
              moveType === 'entry' ? "bg-blue-600" : "bg-rose-600"
            )}
          >
            Confirmar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
