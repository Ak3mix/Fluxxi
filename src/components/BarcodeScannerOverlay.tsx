import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';

interface Props {
  onDetect: (code: string) => void;
  onClose: () => void;
}

export function BarcodeScannerOverlay({ onDetect, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { start, stop } = useBarcodeScanner();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    start(video, onDetect);
    return () => stop();
  }, [start, stop, onDetect]);

  return (
    <div className="fixed inset-0 z-100 bg-black flex flex-col">
      <div className="camera-keepalive" />
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-11 h-11 rounded-full bg-black/50 text-white flex items-center justify-center"
        aria-label="Cerrar escáner"
      >
        <X size={22} />
      </button>
      <div className="flex-1 flex items-center justify-center">
        <div className="relative w-full max-w-md aspect-video">
          <video ref={videoRef} className="w-full h-full object-cover rounded-xl" playsInline muted />
          <div className="absolute inset-[20%_10%_30%_10%] border-2 border-violet-400 rounded-xl pointer-events-none" />
        </div>
      </div>
      <p className="text-white text-center text-sm pb-8">Apunta al código de barras</p>
    </div>
  );
}
