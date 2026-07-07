declare module '@ericblade/quagga2' {
  interface QuaggaConfig {
    inputStream: {
      type: string;
      target: HTMLElement;
      constraints: {
        width: { ideal: number };
        height: { ideal: number };
        facingMode: string;
      };
      area?: { top: string; right: string; left: string; bottom: string };
    };
    decoder: {
      readers: string[];
    };
    locator?: {
      patchSize: string;
      halfSample: boolean;
    };
  }

  interface QuaggaResult {
    codeResult?: {
      code: string;
    };
  }

  interface QuaggaStatic {
    init(config: QuaggaConfig, callback: (err?: Error) => void): void;
    start(): void;
    stop(): void;
    onDetected(callback: (data: QuaggaResult) => void): void;
    offDetected(): void;
  }

  const Quagga: QuaggaStatic;
  export default Quagga;
}
