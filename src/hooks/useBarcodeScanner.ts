import { useRef, useCallback } from 'react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';

const hints = new Map<DecodeHintType, any>();
hints.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.ITF,
  BarcodeFormat.CODABAR,
]);

export function useBarcodeScanner() {
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const detectLockRef = useRef(false);

  const start = useCallback((video: HTMLVideoElement, onDetect: (code: string) => void) => {
    if (readerRef.current) return;
    detectLockRef.current = false;

    const reader = new BrowserMultiFormatReader(hints);
    readerRef.current = reader;

    reader.decodeFromVideoDevice(undefined, video, (result) => {
      if (detectLockRef.current) return;
      if (!result) return;

      detectLockRef.current = true;
      const code = result.getText();
      stop();
      onDetect(code);
    }).then(controls => {
      controlsRef.current = controls;
    }).catch(() => {
      readerRef.current = null;
    });
  }, []);

  const stop = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    readerRef.current = null;
    detectLockRef.current = false;
  }, []);

  return { start, stop };
}
