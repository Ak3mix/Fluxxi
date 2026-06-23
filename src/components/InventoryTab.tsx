import React, { useState, useEffect } from 'react';
import {
  Plus,
  ArrowUpCircle,
  ArrowDownCircle,
  XCircle,
  FileSpreadsheet,
  Trash2,
  Edit,
  Camera as CameraIcon,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils/cn';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { dataTransferService } from '../services/dataTransferService';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { api } from '../services/api';
import { MigrationService } from '../services/migration';
import type { Product } from '../types';

export function InventoryTab({ products, onUpdate }: { products: Product[], onUpdate: () => void }) {
  const [activeInventoryTab, setActiveInventoryTab] = useState<'products' | 'cards'>('products');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showEditProduct, setShowEditProduct] = useState<Product | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Product | null>(null);
  const [showMoveModal, setShowMoveModal] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [moveType, setMoveType] = useState<'entry' | 'waste'>('entry');
  const [moveQty, setMoveQty] = useState(1);
  const [moveReason, setMoveReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  const categories = ['all', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];
  const filteredProducts = products
    .filter(p => selectedCategory === 'all' || p.category === selectedCategory)
    .filter(p => searchQuery === '' || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));
  
  const [cards, setCards] = useState<any[]>([]);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showEditCard, setShowEditCard] = useState<any>(null);
  const [cardFormName, setCardFormName] = useState('');
  const [cardFormBank, setCardFormBank] = useState('');
  const [cardFormAccount, setCardFormAccount] = useState('');

  const fetchCards = async () => {
    const data = await api.getCards();
    setCards(data);
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.addCard({ name: cardFormName, bank: cardFormBank, account_number: cardFormAccount });
    setShowAddCard(false);
    setCardFormName('');
    setCardFormBank('');
    setCardFormAccount('');
    fetchCards();
  };

  const handleEditCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditCard) return;
    await api.updateCard(showEditCard.id, { name: cardFormName, bank: cardFormBank, account_number: cardFormAccount });
    setShowEditCard(null);
    setCardFormName('');
    setCardFormBank('');
    setCardFormAccount('');
    fetchCards();
  };

  const handleDeleteCard = async (id: number) => {
    if (confirm('¿Eliminar esta tarjeta?')) {
      await api.deleteCard(id);
      fetchCards();
    }
  };

  useEffect(() => {
    if (showEditCard) {
      setCardFormName(showEditCard.name);
      setCardFormBank(showEditCard.bank || '');
      setCardFormAccount(showEditCard.account_number || '');
    } else if (showAddCard) {
      setCardFormName('');
      setCardFormBank('');
      setCardFormAccount('');
    }
  }, [showAddCard, showEditCard]);

  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCost, setFormCost] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formImage, setFormImage] = useState<string | null>(null);

  const takePhoto = async () => {
    try {
      const photo = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        preserveAspectRatio: true,
        correctOrientation: true,
      });
      
      if (photo.webPath) {
        const response = await fetch(photo.webPath);
        const blob = await response.blob();
        
        const base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        
        setFormImage(base64Data);
      }
    } catch (error: any) {
      console.error('Error al tomar foto:', error);
      alert('Error al tomar la foto.');
    }
  };

  const selectFile = async () => {
    try {
      const result = await FilePicker.pickImages({
        multiple: false
      });
      
      if (result.files && result.files.length > 0) {
        const file = result.files[0];
        
        if (Capacitor.isNativePlatform()) {
          if (!file.path) {
            alert('No se pudo obtener la ruta del archivo.');
            return;
          }
          
          const fileRead = await Filesystem.readFile({
            path: file.path,
          });
          
          const mimeType = file.mimeType || 'image/jpeg';
          setFormImage(`data:${mimeType};base64,${fileRead.data}`);
        } else {
          const path = file.webPath || file.path;
          if (!path) return;

          const response = await fetch(path);
          const blob = await response.blob();
          
          const base64Data = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          
          setFormImage(base64Data);
        }
      }
    } catch (error) {
      console.error('Error al seleccionar archivo:', error);
      alert('Error al seleccionar el archivo.');
    }
  };

  useEffect(() => {
    if (showEditProduct) {
      setFormName(showEditProduct.name);
      setFormPrice(showEditProduct.price.toString());
      setFormCost((showEditProduct.cost || 0).toString());
      setFormStock(showEditProduct.stock.toString());
      setFormCategory(showEditProduct.category || '');
      setFormImage(showEditProduct.image || null);
    } else if (showAddProduct) {
      setFormName('');
      setFormPrice('');
      setFormCost('');
      setFormStock('');
      setFormCategory('');
      setFormImage(null);
    }
  }, [showEditProduct, showAddProduct]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("handleAddProduct: Start");
    if (isSaving) {
      console.log("handleAddProduct: Already saving, skipping");
      return;
    }
    
    const price = parseFloat(formPrice);
    const cost = parseFloat(formCost) || 0;
    const stock = parseInt(formStock);

    if (isNaN(price) || isNaN(stock)) {
      console.log("handleAddProduct: Validation failed (NaN)");
      alert("Por favor ingresa valores numéricos válidos (Precio y Stock)");
      return;
    }

    if (!formName.trim()) {
      console.log("handleAddProduct: Validation failed (empty name)");
      alert("El nombre del producto es obligatorio");
      return;
    }

    const data = {
      name: formName.trim(),
      price,
      cost,
      stock,
      initial_stock: stock,
      category: formCategory.trim(),
      image: formImage && formImage.startsWith('data:image') ? await MigrationService.saveImage(formImage) : formImage
    };

    console.log("handleAddProduct: Sending data:", data);
    setIsSaving(true);
    try {
      const res = await api.addProduct(data);

      console.log("handleAddProduct: Response received");
      if (res) {
        console.log("handleAddProduct: Success, closing modal and updating");
        setShowAddProduct(false);
        onUpdate();
        setTimeout(() => alert("¡Producto guardado con éxito!"), 100);
      } else {
        alert("Error al guardar el producto");
      }
    } catch (error: any) {
      console.error("handleAddProduct: Catch error:", error);
      const errorMsg = error.message || error.code || (typeof error === 'string' ? error : JSON.stringify(error));
      alert("Error al guardar el producto: " + errorMsg);
    } finally {
      console.log("handleAddProduct: Finally block reached");
      setIsSaving(false);
    }
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("handleEditProduct: Start");
    if (!showEditProduct || isSaving) {
      console.log("handleEditProduct: Not editing or already saving, skipping");
      return;
    }

    const price = parseFloat(formPrice);
    const cost = parseFloat(formCost) || 0;
    const stock = parseInt(formStock);

    if (isNaN(price) || isNaN(stock)) {
      console.log("handleEditProduct: Validation failed (NaN)");
      alert("Por favor ingresa valores numéricos válidos");
      return;
    }

    const data = {
      name: formName.trim(),
      price,
      cost,
      stock,
      category: formCategory.trim(),
      image: formImage && formImage.startsWith('data:image') ? await MigrationService.saveImage(formImage) : formImage
    };

    console.log("handleEditProduct: Sending data", data);
    setIsSaving(true);
    try {
      const res = await api.updateProduct(showEditProduct.id, data);

      console.log("handleEditProduct: Response received");
      if (res) {
        console.log("handleEditProduct: Success, closing modal and updating");
        setShowEditProduct(null);
        onUpdate();
        setTimeout(() => alert("¡Producto actualizado con éxito!"), 100);
      } else {
        alert("Error al actualizar el producto");
      }
    } catch (error: any) {
      console.error("handleEditProduct: Catch error:", error);
      const errorMsg = error.message || error.code || (typeof error === 'string' ? error : JSON.stringify(error));
      alert("Error al actualizar el producto: " + errorMsg);
    } finally {
      console.log("handleEditProduct: Finally block reached");
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!showDeleteConfirm || isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await api.deleteProduct(showDeleteConfirm.id);
      if (res) {
        setShowDeleteConfirm(null);
        onUpdate();
      } else {
        alert("No se pudo eliminar el producto");
      }
    } catch (error: any) {
      console.error("handleDeleteProduct error:", error);
      const errorMsg = error.message || error.code || (typeof error === 'string' ? error : JSON.stringify(error));
      alert("Error al eliminar el producto: " + errorMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMove = async () => {
    if (!showMoveModal) return;
    try {
      const res = await api.moveInventory({
        product_id: showMoveModal.id,
        type: moveType,
        quantity: moveQty,
        reason: moveReason || (moveType === 'entry' ? 'Reabastecimiento' : 'Merma')
      });
      if (res) {
        setShowMoveModal(null);
        setMoveQty(1);
        setMoveReason('');
        onUpdate();
      } else {
        alert("Error en el movimiento");
      }
    } catch (error: any) {
      console.error("handleMove error:", error);
      const errorMsg = error.message || error.code || (typeof error === 'string' ? error : JSON.stringify(error));
      alert("Error en el movimiento: " + errorMsg);
    }
  };

  return (
    <div className="space-y-6 pb-4">
      <div className="flex p-1 bg-stone-100 rounded-xl">
        <button 
          onClick={() => setActiveInventoryTab('products')}
          className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all", activeInventoryTab === 'products' ? "bg-white shadow" : "text-stone-500")}
        >Productos</button>
        <button 
          onClick={() => setActiveInventoryTab('cards')}
          className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all", activeInventoryTab === 'cards' ? "bg-white shadow" : "text-stone-500")}
        >Tarjetas</button>
      </div>

          {activeInventoryTab === 'products' ? (
            <>
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-stone-900">Inventario</h2>
                <div className="flex gap-2">
                  <button 
                    onClick={async () => {
                      try {
                        await dataTransferService.exportDatabase();
                        alert('Exportación exitosa');
                      } catch (e: any) {
                        console.error('Export error:', e);
                        alert('Error al exportar: ' + (e.message || e.code || JSON.stringify(e)));
                      }
                    }}
                    className="bg-stone-100 text-stone-900 p-2 rounded-xl active:scale-95 transition-transform"
                    title="Exportar Datos"
                  >
                    <FileSpreadsheet size={20} />
                  </button>
                  <button 
                    onClick={async () => {
                      try {
                          const result = await FilePicker.pickFiles({ types: ['application/zip', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'], multiple: false });
                        if (result.files.length > 0) {
                          const file = result.files[0];
                          if (!file.path) throw new Error('No se pudo obtener la ruta del archivo');
                          const fileRead = await Filesystem.readFile({ path: file.path });
                          
                          await dataTransferService.importDatabase(fileRead.data as string);
                          alert('Importación exitosa, la app se reiniciará');
                          window.location.reload();
                        }
                      } catch (e: any) {
                        console.error('Import error:', e);
                        alert('Error al importar: ' + (e.message || JSON.stringify(e)));
                      }
                    }}
                    className="bg-stone-100 text-stone-900 p-2 rounded-xl active:scale-95 transition-transform"
                    title="Importar Datos"
                  >
                    <ArrowDownCircle size={20} />
                  </button>
                  <button 
                    onClick={() => { setShowAddProduct(true); }}
                    className="bg-stone-900 text-white p-2 rounded-xl shadow-lg active:scale-95 transition-transform shrink-0"
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
                        "text-[10px] uppercase font-bold px-3 py-1.5 rounded-full shrink-0 transition-colors",
                        selectedCategory === cat ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-500"
                      )}
                    >
                      {cat === 'all' ? 'Todos' : cat}
                    </button>
                  ))}
                </div>
              )}
              <div className="space-y-3">
                {filteredProducts.map(product => (
                  <div key={product.id} className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col gap-4">
                    <div className="flex items-start gap-4">
                      {product.image ? (
                        <img 
                          src={product.image} 
                          alt={product.name}
                          className="w-20 h-20 object-contain rounded-xl shrink-0 bg-stone-100"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-stone-100 rounded-xl shrink-0 flex items-center justify-center">
                          <ImageIcon size={32} className="text-stone-300" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-stone-900 text-lg leading-tight truncate">{product.name}</div>
                        <div className="text-xs text-stone-400 mt-1">
                          {product.category && (
                            <span className="inline-block bg-stone-100 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold mr-2">{product.category}</span>
                          )}
                          Stock: <span className={cn("font-bold", (product.stock ?? 0) <= 5 ? "text-rose-600" : "text-stone-600")}>{product.stock}</span>
                          {(product.stock ?? 0) <= 5 && (
                            <span className="ml-1 text-[8px] bg-rose-100 text-rose-700 font-black px-1 py-0.5 rounded-full uppercase">Stock Bajo</span>
                          )} • 
                          Precio: <span className="font-bold text-emerald-600">${product.price.toFixed(2)}</span> •
                          Costo: <span className="font-bold text-stone-500">${(product.cost || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button 
                        onClick={() => { setShowMoveModal(product); setMoveType('entry'); }}
                        className="bg-blue-50 text-blue-600 p-2.5 rounded-xl hover:bg-blue-100 transition-colors flex-1 flex justify-center shrink-0"
                        title="Reabastecer"
                      >
                        <ArrowUpCircle size={20} />
                      </button>
                      <button 
                        onClick={() => { setShowMoveModal(product); setMoveType('waste'); }}
                        className="bg-rose-50 text-rose-600 p-2.5 rounded-xl hover:bg-rose-100 transition-colors flex-1 flex justify-center shrink-0"
                        title="Merma"
                      >
                        <ArrowDownCircle size={20} />
                      </button>
                      <button 
                        onClick={() => { setShowEditProduct(product); }}
                        className="bg-stone-50 text-stone-600 p-2.5 rounded-xl hover:bg-stone-100 transition-colors flex-1 flex justify-center shrink-0"
                        title="Editar"
                      >
                        <Edit size={20} />
                      </button>
                      <button 
                        onClick={() => setShowDeleteConfirm(product)}
                        className="bg-stone-50 text-rose-400 p-2.5 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-colors flex-1 flex justify-center shrink-0"
                        title="Eliminar"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="p-4 bg-white rounded-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Tarjetas de Pago</h3>
                <button onClick={() => setShowAddCard(true)} className="bg-stone-900 text-white p-2 rounded-xl"><Plus size={20}/></button>
              </div>
              <div className="space-y-2">
                {cards.map(card => (
                  <div key={card.id} className="p-3 bg-stone-50 rounded-xl flex justify-between items-center">
                    <div>
                      <div className="font-bold">{card.name}</div>
                      <div className="text-xs text-stone-500">{card.bank} - {card.account_number}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setShowEditCard(card); setShowAddCard(true); }} className="text-stone-600"><Edit size={18}/></button>
                      <button onClick={() => handleDeleteCard(card.id)} className="text-rose-500"><Trash2 size={18}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

      <AnimatePresence>
        {showAddCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl"
            >
              <form onSubmit={showEditCard ? handleEditCard : handleAddCard}>
                <h3 className="text-xl font-black mb-6">{showEditCard ? 'Editar Tarjeta' : 'Nueva Tarjeta'}</h3>
                <div className="space-y-4 mb-8">
                  <input value={cardFormName} onChange={e => setCardFormName(e.target.value)} placeholder="Nombre (Ej: Banco X)" required className="w-full bg-stone-50 border-none rounded-xl p-3" />
                  <input value={cardFormBank} onChange={e => setCardFormBank(e.target.value)} placeholder="Banco" required className="w-full bg-stone-50 border-none rounded-xl p-3" />
                  <input value={cardFormAccount} onChange={e => setCardFormAccount(e.target.value)} placeholder="Número de cuenta" required className="w-full bg-stone-50 border-none rounded-xl p-3" />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setShowAddCard(false); setShowEditCard(null); }} className="flex-1 py-3 font-bold text-stone-500">Cancelar</button>
                  <button type="submit" className="flex-1 py-3 bg-stone-900 text-white rounded-xl font-bold">Guardar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showAddProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl"
            >
              <form onSubmit={handleAddProduct}>
                <h3 className="text-xl font-black mb-6">Nuevo Producto</h3>
                <div className="space-y-4 mb-8">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Nombre</label>
                    <input 
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      required 
                      className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 ring-stone-900 font-bold" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Categoría</label>
                    <input 
                      value={formCategory}
                      onChange={e => setFormCategory(e.target.value)}
                      placeholder="Ej: Bebidas, Snacks, etc."
                      className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 ring-stone-900" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Foto del producto</label>
                    <div className="flex gap-3 items-center">
                      {formImage ? (
                        <div className="relative">
                          <img src={formImage} alt="Vista previa" className="w-24 h-24 object-contain rounded-xl bg-stone-100" />
                          <button
                            type="button"
                            onClick={() => setFormImage(null)}
                            className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full hover:bg-rose-600"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={takePhoto}
                            className="flex flex-col items-center justify-center w-24 h-24 bg-emerald-50 rounded-xl cursor-pointer hover:bg-emerald-100 transition-colors border-2 border-emerald-200"
                          >
                            <CameraIcon size={32} className="text-emerald-500" />
                            <span className="text-[10px] text-emerald-600 mt-1 font-bold">Tomar foto</span>
                          </button>
                          <button
                            type="button"
                            onClick={selectFile}
                            className="flex flex-col items-center justify-center w-24 h-24 bg-blue-50 rounded-xl cursor-pointer hover:bg-blue-100 transition-colors border-2 border-blue-200"
                          >
                            <ImageIcon size={32} className="text-blue-500" />
                            <span className="text-[10px] text-blue-600 mt-1 font-bold">Seleccionar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Precio</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={formPrice}
                        onChange={e => setFormPrice(e.target.value)}
                        required 
                        className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 ring-stone-900" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Costo</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={formCost}
                        onChange={e => setFormCost(e.target.value)}
                        placeholder="0"
                        className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 ring-stone-900" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Stock Inicial</label>
                      <input 
                        type="number" 
                        value={formStock}
                        onChange={e => setFormStock(e.target.value)}
                        required 
                        className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 ring-stone-900" 
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowAddProduct(false)} className="flex-1 py-3 font-bold text-stone-500">Cancelar</button>
                  <button type="submit" disabled={isSaving} className="flex-1 py-3 bg-stone-900 text-white rounded-xl font-bold disabled:opacity-50">
                    {isSaving ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showEditProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl"
            >
              <form onSubmit={handleEditProduct}>
                <h3 className="text-xl font-black mb-6">Editar Producto</h3>
                <div className="space-y-4 mb-8">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Nombre</label>
                    <input 
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      required 
                      className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 ring-stone-900 font-bold" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Categoría</label>
                    <input 
                      value={formCategory}
                      onChange={e => setFormCategory(e.target.value)}
                      placeholder="Ej: Bebidas, Snacks, etc."
                      className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 ring-stone-900" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Foto del producto</label>
                    <div className="flex gap-3 items-center">
                      {formImage ? (
                        <div className="relative">
                          <img src={formImage} alt="Vista previa" className="w-24 h-24 object-contain rounded-xl bg-stone-100" />
                          <button
                            type="button"
                            onClick={() => setFormImage(null)}
                            className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full hover:bg-rose-600"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={takePhoto}
                            className="flex flex-col items-center justify-center w-24 h-24 bg-emerald-50 rounded-xl cursor-pointer hover:bg-emerald-100 transition-colors border-2 border-emerald-200"
                          >
                            <CameraIcon size={32} className="text-emerald-500" />
                            <span className="text-[10px] text-emerald-600 mt-1 font-bold">Tomar foto</span>
                          </button>
                          <button
                            type="button"
                            onClick={selectFile}
                            className="flex flex-col items-center justify-center w-24 h-24 bg-blue-50 rounded-xl cursor-pointer hover:bg-blue-100 transition-colors border-2 border-blue-200"
                          >
                            <ImageIcon size={32} className="text-blue-500" />
                            <span className="text-[10px] text-blue-600 mt-1 font-bold">Seleccionar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Precio</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={formPrice}
                        onChange={e => setFormPrice(e.target.value)}
                        required 
                        className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 ring-stone-900" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Costo</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={formCost}
                        onChange={e => setFormCost(e.target.value)}
                        placeholder="0"
                        className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 ring-stone-900" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Stock</label>
                      <input 
                        type="number" 
                        value={formStock}
                        onChange={e => setFormStock(e.target.value)}
                        required 
                        className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 ring-stone-900" 
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowEditProduct(null)} className="flex-1 py-3 font-bold text-stone-500">Cancelar</button>
                  <button type="submit" disabled={isSaving} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold disabled:opacity-50">
                    {isSaving ? "Actualizando..." : "Actualizar"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showDeleteConfirm && (
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
              <h3 className="text-xl font-black mb-2">¿Eliminar Producto?</h3>
              <p className="text-stone-500 text-sm mb-8">
                ¿Estás seguro de eliminar <span className="font-bold text-stone-800">{showDeleteConfirm.name}</span>? Esta acción no se puede deshacer.
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  disabled={isDeleting}
                  onClick={handleDeleteProduct}
                  className="w-full py-4 bg-rose-600 text-white rounded-2xl font-bold shadow-lg shadow-rose-100 active:scale-95 transition-transform disabled:opacity-50"
                >
                  {isDeleting ? "Eliminando..." : "Sí, Eliminar"}
                </button>
                <button 
                  disabled={isDeleting}
                  onClick={() => setShowDeleteConfirm(null)}
                  className="w-full py-4 text-stone-500 font-bold active:scale-95 transition-transform disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showMoveModal && (
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
              <p className="text-stone-500 text-sm mb-6">{showMoveModal.name}</p>
              
              <div className="space-y-4 mb-8">
                <div>
                  <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Cantidad</label>
                  <input 
                    type="number" 
                    value={moveQty} 
                    onChange={e => setMoveQty(parseInt(e.target.value) || 0)}
                    className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 ring-stone-900" 
                  />
                </div>
                {moveType === 'waste' && (
                  <div>
                    <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Motivo (Opcional)</label>
                    <input 
                      placeholder="Ej: Caducidad, Daño..."
                      value={moveReason}
                      onChange={e => setMoveReason(e.target.value)}
                      className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 ring-stone-900" 
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowMoveModal(null)} className="flex-1 py-3 font-bold text-stone-500">Cancelar</button>
                <button 
                  onClick={handleMove}
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
        )}
      </AnimatePresence>
    </div>
  );
}
