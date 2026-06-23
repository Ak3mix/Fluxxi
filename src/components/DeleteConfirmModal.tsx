import React from 'react';
import { Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  isOpen: boolean;
  itemName: string;
  title?: string;
  message?: string;
  isDeleting?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeleteConfirmModal({
  isOpen,
  itemName,
  title = '¿Eliminar?',
  message = 'Esta acción no se puede deshacer.',
  isDeleting = false,
  onConfirm,
  onClose,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl text-center"
      >
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Trash2 size={32} />
        </div>
        <h3 className="text-xl font-black mb-2">{title}</h3>
        <p className="text-stone-500 text-sm mb-8">
          ¿Estás seguro de eliminar <span className="font-bold text-stone-800">{itemName}</span>? {message}
        </p>

        <div className="flex flex-col gap-3">
          <button
            disabled={isDeleting}
            onClick={onConfirm}
            className="w-full py-4 bg-rose-600 text-white rounded-2xl font-bold shadow-lg shadow-rose-100 active:scale-95 transition-transform disabled:opacity-50"
          >
            {isDeleting ? 'Eliminando...' : 'Sí, Eliminar'}
          </button>
          <button
            disabled={isDeleting}
            onClick={onClose}
            className="w-full py-4 text-stone-500 font-bold active:scale-95 transition-transform disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
