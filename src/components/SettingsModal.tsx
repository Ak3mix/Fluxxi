import React, { useState, useEffect } from 'react';
import { Camera, X, FileSpreadsheet, ArrowDownCircle } from 'lucide-react';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { api } from '../services/api';
import { dataTransferService } from '../services/dataTransferService';
import { setCurrencySymbol } from '../utils/formatCurrency';
import { useToast } from '../contexts/ToastContext';
import { Modal } from './Modal';
import type { SettingsMap } from '../services/settingsRepository';

const CURRENCIES = ['$', '€', '£', 'S/', 'Bs', 'Q', 'L', 'C$', 'RD$'];
const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'split', label: 'Combinado' },
];

interface SettingsModalProps {
  isOpen: boolean;
  profilePhoto: string | null;
  onClose: () => void;
  onSettingsChange: (settings: SettingsMap) => void;
}

export function SettingsModal({ isOpen, profilePhoto, onClose, onSettingsChange }: SettingsModalProps) {
  const { addToast } = useToast();
  const [settings, setSettings] = useState<SettingsMap>({});
  const [photo, setPhoto] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoInit, setPhotoInit] = useState(false);

  useEffect(() => {
    if (isOpen) {
      api.getAllSettings().then(s => {
        setSettings(s);
        setPhoto(profilePhoto);
        setPhotoInit(!!profilePhoto);
      });
    }
  }, [isOpen, profilePhoto]);

  const updateField = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveProfile = async () => {
    try {
      await api.saveSetting('business_name', settings.business_name || '');
      await api.saveSetting('owner_name', settings.owner_name || '');
      await api.saveSetting('phone', settings.phone || '');
      await api.saveSetting('address', settings.address || '');
      addToast('Perfil guardado', 'success');
      onSettingsChange({ ...settings });
    } catch {
      addToast('Error al guardar perfil', 'error');
    }
  };

  const handleSavePreferences = async () => {
    try {
      await api.saveSetting('currency_symbol', settings.currency_symbol || '$');
      await api.saveSetting('low_stock_threshold', settings.low_stock_threshold || '5');
      await api.saveSetting('default_payment_method', settings.default_payment_method || 'cash');
      setCurrencySymbol(settings.currency_symbol || '$');
      addToast('Preferencias guardadas', 'success');
      onSettingsChange({ ...settings });
    } catch {
      addToast('Error al guardar preferencias', 'error');
    }
  };

  const handleTakePhoto = async () => {
    try {
      setIsUploadingPhoto(true);
      const photoResult = await CapacitorCamera.getPhoto({
        quality: 70,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        correctOrientation: true,
        width: 300,
        height: 300,
      });
      if (photoResult.webPath) {
        const response = await fetch(photoResult.webPath);
        const blob = await response.blob();
        const base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        await api.saveProfilePhoto(base64Data);
        setPhoto(base64Data);
        setPhotoInit(true);
        addToast('Foto actualizada', 'success');
        onSettingsChange({ ...settings });
      }
    } catch {
      addToast('Error al tomar foto', 'error');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSelectPhoto = async () => {
    try {
      setIsUploadingPhoto(true);
      const result = await FilePicker.pickImages({});
      if (result.files && result.files.length > 0) {
        const file = result.files[0];
        let base64Data: string;
        if (Capacitor.isNativePlatform()) {
          if (!file.path) { addToast('No se pudo obtener la ruta del archivo.', 'error'); return; }
          const fileRead = await Filesystem.readFile({ path: file.path });
          const mimeType = file.mimeType || 'image/jpeg';
          base64Data = `data:${mimeType};base64,${fileRead.data}`;
        } else {
          const path = (file as any).webPath || file.path;
          if (!path) return;
          const response = await fetch(path);
          const blob = await response.blob();
          base64Data = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        }
        await api.saveProfilePhoto(base64Data);
        setPhoto(base64Data);
        setPhotoInit(true);
        addToast('Foto actualizada', 'success');
        onSettingsChange({ ...settings });
      }
    } catch {
      addToast('Error al seleccionar foto', 'error');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      await api.deleteProfilePhoto();
      setPhoto(null);
      setPhotoInit(false);
      addToast('Foto eliminada', 'success');
      onSettingsChange({ ...settings });
    } catch {
      addToast('Error al eliminar foto', 'error');
    }
  };

  const handleExport = async () => {
    try {
      await dataTransferService.exportDatabase();
      addToast('Exportación exitosa', 'success');
    } catch (e: any) {
      console.error('Export error:', e);
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
      console.error('Import error:', e);
      addToast('Error al importar: ' + (e.message || JSON.stringify(e)), 'error');
    }
  };

  const initial = (settings.business_name || 'V')[0].toUpperCase();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configuración" variant="bottom-sheet">
      <div className="overflow-y-auto flex-1 -mx-6 px-6 pb-6 space-y-8">
        <div className="flex flex-col items-center gap-3 pt-2">
          <div className="relative">
            {photo ? (
              <img src={photo} alt="Foto de perfil" className="w-20 h-20 rounded-full object-cover border-4 border-stone-100" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-emerald-100 border-4 border-stone-100 flex items-center justify-center">
                <span className="text-3xl font-black text-emerald-600">{initial}</span>
              </div>
            )}
            <button
              onClick={isUploadingPhoto ? undefined : photoInit ? handleRemovePhoto : handleTakePhoto}
              disabled={isUploadingPhoto}
              className="absolute -bottom-1 -right-1 bg-white p-1.5 rounded-full shadow border border-stone-200"
              aria-label={photoInit ? "Eliminar foto" : "Tomar foto"}
            >
              {photoInit ? <X size={14} className="text-rose-500" /> : <Camera size={14} className="text-stone-600" />}
            </button>
          </div>
          <div className="flex gap-2">
            {!photoInit && (
              <button onClick={handleTakePhoto} className="text-[10px] font-bold text-emerald-600 uppercase" disabled={isUploadingPhoto}>
                Tomar foto
              </button>
            )}
            <button onClick={photoInit ? handleTakePhoto : handleSelectPhoto} className="text-[10px] font-bold text-blue-600 uppercase" disabled={isUploadingPhoto}>
              {photoInit ? 'Cambiar' : 'Seleccionar'}
            </button>
          </div>
        </div>

        <section>
          <h4 className="text-[10px] uppercase font-black text-stone-500 tracking-widest mb-4">Perfil del Negocio</h4>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-stone-500">Nombre del negocio</label>
              <input type="text" value={settings.business_name || ''} onChange={e => updateField('business_name', e.target.value)} className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm font-bold mt-1" placeholder="Mi Tienda" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-stone-500">Nombre del propietario</label>
              <input type="text" value={settings.owner_name || ''} onChange={e => updateField('owner_name', e.target.value)} className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm font-bold mt-1" placeholder="Akemix" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-stone-500">Teléfono</label>
              <input type="tel" value={settings.phone || ''} onChange={e => updateField('phone', e.target.value)} className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm font-bold mt-1" placeholder="+52 555 123 4567" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-stone-500">Dirección</label>
              <input type="text" value={settings.address || ''} onChange={e => updateField('address', e.target.value)} className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm font-bold mt-1" placeholder="Calle 123, Ciudad" />
            </div>
            <button onClick={handleSaveProfile} className="w-full py-3 rounded-2xl font-bold bg-stone-900 text-white active:scale-95 transition-transform">Guardar Perfil</button>
          </div>
        </section>

        <section>
          <h4 className="text-[10px] uppercase font-black text-stone-500 tracking-widest mb-4">Preferencias</h4>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-stone-500">Símbolo de moneda</label>
              <select value={settings.currency_symbol || '$'} onChange={e => updateField('currency_symbol', e.target.value)} className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm font-bold mt-1">
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-stone-500">Umbral de stock bajo</label>
              <input type="number" min="1" max="99" value={settings.low_stock_threshold || '5'} onChange={e => updateField('low_stock_threshold', e.target.value)} className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm font-bold mt-1" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-stone-500">Método de pago por defecto</label>
              <select value={settings.default_payment_method || 'cash'} onChange={e => updateField('default_payment_method', e.target.value)} className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm font-bold mt-1">
                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <button onClick={handleSavePreferences} className="w-full py-3 rounded-2xl font-bold bg-stone-900 text-white active:scale-95 transition-transform">Guardar Preferencias</button>
          </div>
        </section>

        <section>
          <h4 className="text-[10px] uppercase font-black text-stone-500 tracking-widest mb-4">Datos</h4>
          <div className="flex flex-col gap-3">
            <button onClick={handleExport} className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold bg-emerald-50 text-emerald-700 border-2 border-emerald-200 active:scale-95 transition-transform">
              <FileSpreadsheet size={18} /> Exportar Base de Datos
            </button>
            <button onClick={handleImport} className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-bold bg-blue-50 text-blue-700 border-2 border-blue-200 active:scale-95 transition-transform">
              <ArrowDownCircle size={18} /> Importar Base de Datos
            </button>
          </div>
        </section>

        <section className="text-center pt-2 border-t border-stone-100">
          <p className="text-xs text-stone-400 font-medium">Versión 1.1.0</p>
          <p className="text-xs text-stone-400 font-medium">Creado por Akemix</p>
        </section>
      </div>
    </Modal>
  );
}
