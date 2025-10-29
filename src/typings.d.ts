import "@web3-react";

declare global {
  interface Window {
    ethereum?: any;
    TradingView?: {
      widget: any;
    };
  }
  interface Navigator {
    msSaveBlob?: (blob: any, defaultName?: string) => boolean;
  }
}
