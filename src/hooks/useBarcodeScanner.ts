import { useRef, useCallback } from 'react';
import Quagga from '@ericblade/quagga2';

export function useBarcodeScanner() {
  const quaggaRef = useRef<typeof Quagga | null>(null);
  const detectLockRef = useRef(false);

  const start = useCallback((container: HTMLElement) => {
    if (quaggaRef.current) return;
    detectLockRef.current = false;

    Quagga.init({
      inputStream: {
        type: 'LiveStream',
        target: container,
        constraints: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'environment',
        },
        area: { top: '20%', right: '10%', left: '10%', bottom: '30%' },
      },
      decoder: {
        readers: [
          'ean_reader',
          'ean_8_reader',
          'code_128_reader',
          'code_39_reader',
          'upc_reader',
          'upc_e_reader',
          'i2of5_reader',
          'codabar_reader',
        ],
      },
      locator: {
        patchSize: 'medium',
        halfSample: true,
      },
    }, (err) => {
      if (err) {
        console.error('Quagga init error:', err);
        return;
      }
      quaggaRef.current = Quagga;
      Quagga.start();
    });

    Quagga.onDetected((data) => {
      if (detectLockRef.current) return;
      detectLockRef.current = true;

      const code = data?.codeResult?.code;
      if (code) {
        const event = new CustomEvent('barcode-detected', { detail: code });
        window.dispatchEvent(event);
      }
      stop();
    });
  }, []);

  const stop = useCallback(() => {
    if (quaggaRef.current) {
      quaggaRef.current.offDetected();
      quaggaRef.current.stop();
      quaggaRef.current = null;
      detectLockRef.current = false;
    }
  }, []);

  return { start, stop };
}
