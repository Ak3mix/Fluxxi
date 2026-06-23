import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { cn } from '../utils/cn';
import { ImagePicker } from './ImagePicker';
import { MigrationService } from '../services/migration';
import type { Product } from '../types';

export interface ProductFormData {
  name: string;
  price: number;
  cost: number;
  stock: number;
  category: string;
  image: string | null;
}

interface Props {
  isOpen: boolean;
  initialData?: Product | null;
  isSaving?: boolean;
  onSave: (data: ProductFormData) => Promise<void>;
  onClose: () => void;
}

export function ProductFormModal({ isOpen, initialData, isSaving = false, onSave, onClose }: Props) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [stock, setStock] = useState('');
  const [category, setCategory] = useState('');
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setPrice(initialData.price.toString());
      setCost((initialData.cost || 0).toString());
      setStock(initialData.stock.toString());
      setCategory(initialData.category || '');
      setImage(initialData.image || null);
    } else {
      setName('');
      setPrice('');
      setCost('');
      setStock('');
      setCategory('');
      setImage(null);
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const priceNum = parseFloat(price);
    const costNum = parseFloat(cost) || 0;
    const stockNum = parseInt(stock);

    if (isNaN(priceNum) || isNaN(stockNum)) {
      alert('Por favor ingresa valores numéricos válidos (Precio y Stock)');
      return;
    }

    if (!name.trim()) {
      alert('El nombre del producto es obligatorio');
      return;
    }

    const processedImage = image && image.startsWith('data:image')
      ? await MigrationService.saveImage(image)
      : image;

    await onSave({
      name: name.trim(),
      price: priceNum,
      cost: costNum,
      stock: stockNum,
      category: category.trim(),
      image: processedImage,
    });
  };

  if (!isOpen) return null;

  const isEditing = !!initialData;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl"
      >
        <form onSubmit={handleSubmit}>
          <h3 className="text-xl font-black mb-6">{isEditing ? 'Editar Producto' : 'Nuevo Producto'}</h3>
          <div className="space-y-4 mb-8">
            <div>
              <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Nombre</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full bg-stone-50 border-none rounded-xl p-3 font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Categoría</label>
              <input
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="Ej: Bebidas, Snacks, etc."
                className="w-full bg-stone-50 border-none rounded-xl p-3"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Foto del producto</label>
              <ImagePicker
                currentImage={image}
                onImageCapture={setImage}
                onImageClear={() => setImage(null)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Precio</label>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  required
                  className="w-full bg-stone-50 border-none rounded-xl p-3"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Costo</label>
                <input
                  type="number"
                  step="0.01"
                  value={cost}
                  onChange={e => setCost(e.target.value)}
                  placeholder="0"
                  className="w-full bg-stone-50 border-none rounded-xl p-3"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">
                  {isEditing ? 'Stock' : 'Stock Inicial'}
                </label>
                <input
                  type="number"
                  value={stock}
                  onChange={e => setStock(e.target.value)}
                  required
                  className="w-full bg-stone-50 border-none rounded-xl p-3"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 font-bold text-stone-500">Cancelar</button>
            <button type="submit" disabled={isSaving} className={cn(
              "flex-1 py-3 text-white rounded-xl font-bold disabled:opacity-50",
              isEditing ? "bg-emerald-600" : "bg-stone-900"
            )}>
              {isSaving ? (isEditing ? 'Actualizando...' : 'Guardando...') : (isEditing ? 'Actualizar' : 'Guardar')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}


