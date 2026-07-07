import { useRef, useCallback } from 'react';
import Quagga from '@ericblade/quagga2';

interface UseBarcodeScannerOptions {
  onDetect: (code: string) => void;
  onError?: (err: any) => void;
}

export function useBarcodeScanner({ onDetect, onError }: UseBarcodeScannerOptions) {
  const isRunningRef = useRef(false);
  const detectedRef = useRef(false);
  const handlerRef = useRef<((result: any) => void) | null>(null);

  const stop = useCallback(() => {
    if (!isRunningRef.current) return;
    isRunningRef.current = false;
    detectedRef.current = false;
    if (handlerRef.current) {
      try { Quagga.offDetected(handlerRef.current); } catch {}
      handlerRef.current = null;
    }
    try { Quagga.stop(); } catch {}
  }, []);

  const start = useCallback((containerEl: HTMLElement) => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    detectedRef.current = false;

    Quagga.init({
      inputStream: {
        name: 'Live',
        type: 'LiveStream',
        target: containerEl,
        constraints: {
          width: { min: 640 },
          height: { min: 480 },
          facingMode: 'environment',
        },
        singleChannel: true,
      },
      decoder: {
        readers: [
          'ean_reader',
          'ean_8_reader',
          'code_128_reader',
          'code_39_reader',
          'codabar_reader',
          'upc_reader',
          'upc_e_reader',
          'i2of5_reader',
        ],
      },
      locate: true,
      numOfWorkers: 0,
      frequency: 10,
    }, (err) => {
      if (err) {
        isRunningRef.current = false;
        onError?.(err);
        return;
      }
      Quagga.start();
    });

    const handler = (result: any) => {
      if (detectedRef.current) return;
      const code = result?.codeResult?.code;
      if (code) {
        detectedRef.current = true;
        onDetect(code);
      }
    };
    handlerRef.current = handler;
    Quagga.onDetected(handler);
  }, [onDetect, onError]);

  return { start, stop };
}
