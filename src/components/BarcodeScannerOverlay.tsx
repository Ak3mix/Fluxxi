import React, { useRef, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';

interface Props {
  onDetect: (code: string) => void;
  onClose: () => void;
}

export function BarcodeScannerOverlay({ onDetect, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  const { start, stop } = useBarcodeScanner({
    onDetect(code) {
      stop();
      onDetect(code);
    },
    onError(err) {
      setError(err?.message || err?.toString() || 'Error al iniciar la cámara');
    },
  });

  useEffect(() => {
    if (containerRef.current) {
      start(containerRef.current);
    }
    return () => stop();
  }, [start, stop]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      <div className="relative flex-1">
        <div
          ref={containerRef}
          className="absolute inset-0 scanner-container"
        />
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
            <div className="text-white text-center px-6">
              <p className="text-lg font-bold mb-2">Error</p>
              <p className="text-sm text-stone-300">{error}</p>
              <button
                onClick={onClose}
                className="mt-4 px-6 py-2 bg-white text-black rounded-xl font-bold text-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
        <div className="absolute top-4 left-4" style={{ zIndex: 20 }}>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center"
            aria-label="Cerrar escáner"
          >
            <X size={20} className="text-white" />
          </button>
        </div>
        <div className="absolute inset-x-0 top-1/4 flex justify-center pointer-events-none" style={{ zIndex: 20 }}>
          <div className="w-64 h-40 border-2 border-white/60 rounded-xl" />
        </div>
        <p className="absolute bottom-8 inset-x-0 text-center text-white/80 text-sm font-medium pointer-events-none" style={{ zIndex: 20 }}>
          Apunta el código de barras al recuadro
        </p>
      </div>
    </div>
  );
}
