declare module '@ericblade/quagga2' {
  interface QuaggaConfig {
    inputStream: {
      name?: string;
      type?: string;
      target?: HTMLElement | null;
      constraints?: Record<string, any>;
      area?: {
        top?: string;
        right?: string;
        left?: string;
        bottom?: string;
      };
      singleChannel?: boolean;
    };
    decoder: {
      readers?: string[];
      debug?: {
        drawBoundingBox?: boolean;
        showFrequency?: boolean;
        drawScanline?: boolean;
        showPattern?: boolean;
      };
    };
    locate?: boolean;
    numOfWorkers?: number;
    frequency?: number;
  }

  interface DetectedResult {
    codeResult: {
      code: string;
      format: string;
      start: number;
      end: number;
      codeset: number;
      startInfo: { error: number; code: number; start: number; end: number; priority: number };
      decodedCodes: { error: number; code: number; start: number; end: number; priority: number }[];
    };
    line: { x: number; y: number }[];
    box: { x: number; y: number }[];
    angle: number;
  }

  export function init(config: QuaggaConfig, callback?: (err: any) => void): void;
  export function start(): void;
  export function stop(): void;
  export function onDetected(callback: (result: DetectedResult) => void): void;
  export function offDetected(callback: (result: DetectedResult) => void): void;
  export function canEnumerateTypes(): boolean;
}
