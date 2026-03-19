/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_TESTNET: string;
  readonly VITE_CONTRACT_ADDRESS: string;
  readonly VITE_CONTRACT_NAME: string;
  readonly VITE_REPUTATION_CONTRACT_NAME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
