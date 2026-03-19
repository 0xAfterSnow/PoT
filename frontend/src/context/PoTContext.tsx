import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {
  connect,
  disconnect,
  isConnected,
  getLocalStorage,
  openContractCall,
} from '@stacks/connect';
import { STACKS_MAINNET, STACKS_TESTNET } from '@stacks/network';
import {
  fetchCallReadOnlyFunction,
  cvToJSON,
  uintCV,
  principalCV,
  stringUtf8CV,
  stringAsciiCV,
  noneCV,
  someCV,
  PostConditionMode,
  Pc,
} from '@stacks/transactions';

// ─── Config ────────────────────────────────────────────────────────────────
const USE_TESTNET = import.meta.env.VITE_USE_TESTNET === 'true';
const NETWORK = USE_TESTNET ? STACKS_TESTNET : STACKS_MAINNET;
const NETWORK_NAME = USE_TESTNET ? 'testnet' : 'mainnet';
const API_BASE_URL = USE_TESTNET
  ? 'https://api.testnet.hiro.so'
  : 'https://api.mainnet.hiro.so';

// Hiro wallet stores mainnet at index 0, testnet at index 1.
// Always pick the address that matches the active network.
function extractAddress(data: any): string | null {
  const stxAddresses = data?.addresses?.stx;
  if (!stxAddresses || stxAddresses.length === 0) return null;
  if (USE_TESTNET) {
    // testnet address starts with ST – prefer index 1, fall back to any ST address
    const testnetAddr = stxAddresses.find((a: any) => a?.address?.startsWith('ST'));
    return testnetAddr?.address ?? stxAddresses[0]?.address ?? null;
  } else {
    // mainnet address starts with SP
    const mainnetAddr = stxAddresses.find((a: any) => a?.address?.startsWith('SP'));
    return mainnetAddr?.address ?? stxAddresses[0]?.address ?? null;
  }
}

const CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS || 'ST271YXGFQ29048X78A0WCVYRVG8KWHT0R976DXEE';
const CONTRACT_NAME =
  import.meta.env.VITE_CONTRACT_NAME || 'trust-core';
const REPUTATION_CONTRACT_NAME =
  import.meta.env.VITE_REPUTATION_CONTRACT_NAME || 'reputation';

const MIN_STAKE = 1; // 1 STX minimum

// ─── Types ──────────────────────────────────────────────────────────────────
export type AgreementStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'FAILED'
  | 'DISPUTED'
  | 'RESOLVED';

export interface Agreement {
  id: number;
  partyA: string;
  partyB: string;
  title: string;
  description: string;
  stake: number; // STX
  deadline: number; // block height
  status: AgreementStatus;
  resolver: string | null;
  partyAStaked: boolean;
  partyBStaked: boolean;
  createdAt: number;
  resolvedAt: number | null;
}

export interface Reputation {
  totalAgreements: number;
  successfulAgreements: number;
  failedAgreements: number;
  disputesWon: number;
  disputesLost: number;
  score: number;
}

export interface PoTContextType {
  // Wallet state
  connected: boolean;
  address: string | null;
  balance: number | null;
  isLoading: boolean;
  error: string | null;

  // Data
  agreements: Agreement[];
  userAgreements: Agreement[];
  userReputation: Reputation | null;

  // Network
  network: typeof NETWORK;
  networkName: typeof NETWORK_NAME;

  // Wallet actions
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  fetchBalance: () => Promise<void>;
  formatAddress: (addr: string | null) => string;

  // Read functions
  getAgreement: (id: number) => Promise<Agreement | null>;
  getAgreementCount: () => Promise<number>;
  getReputation: (user?: string) => Promise<Reputation>;
  fetchAllAgreements: () => Promise<void>;
  fetchUserAgreements: () => Promise<void>;
  fetchUserReputation: () => Promise<void>;

  // Write functions
  createAgreement: (params: CreateAgreementParams) => Promise<void>;
  acceptAgreement: (id: number) => Promise<void>;
  stakeFunds: (id: number) => Promise<void>;
  resolveSuccess: (id: number) => Promise<void>;
  resolveFailure: (id: number) => Promise<void>;
  raiseDispute: (id: number) => Promise<void>;
  resolveDispute: (id: number, winner: string) => Promise<void>;

  // Constants
  MIN_STAKE: number;
  CONTRACT_ADDRESS: string;
  CONTRACT_NAME: string;
}

export interface CreateAgreementParams {
  title: string;
  description: string;
  partyB: string;
  stakeAmount: number; // STX
  deadlineBlocks: number; // blocks from now
  resolver?: string;
}

// ─── Context ────────────────────────────────────────────────────────────────
const PoTContext = createContext<PoTContextType | undefined>(undefined);

export const usePoT = (): PoTContextType => {
  const ctx = useContext(PoTContext);
  if (!ctx) throw new Error('usePoT must be used within PoTProvider');
  return ctx;
};

// ─── Helpers ────────────────────────────────────────────────────────────────
const STATUS_MAP: Record<number, AgreementStatus> = {
  0: 'PENDING',
  1: 'ACTIVE',
  2: 'COMPLETED',
  3: 'FAILED',
  4: 'DISPUTED',
  5: 'RESOLVED',
};

function parseAgreement(id: number, data: any): Agreement {
  const v = data?.value ?? data;
  return {
    id,
    partyA: v['party-a']?.value ?? '',
    partyB: v['party-b']?.value ?? '',
    title: v['title']?.value ?? '',
    description: v['description']?.value ?? '',
    stake: parseInt(v['stake']?.value ?? '0') / 1_000_000,
    deadline: parseInt(v['deadline']?.value ?? '0'),
    status: STATUS_MAP[parseInt(v['status']?.value ?? '0')] ?? 'PENDING',
    resolver: v['resolver']?.value?.value ?? null,
    partyAStaked: v['party-a-staked']?.value === true,
    partyBStaked: v['party-b-staked']?.value === true,
    createdAt: parseInt(v['created-at']?.value ?? '0'),
    resolvedAt: v['resolved-at']?.value?.value
      ? parseInt(v['resolved-at'].value.value)
      : null,
  };
}

function parseReputation(data: any): Reputation {
  const v = data?.value ?? data;
  const successful = parseInt(v['successful-agreements']?.value ?? '0');
  const failed = parseInt(v['failed-agreements']?.value ?? '0');
  const disputesWon = parseInt(v['disputes-won']?.value ?? '0');
  return {
    totalAgreements: parseInt(v['total-agreements']?.value ?? '0'),
    successfulAgreements: successful,
    failedAgreements: failed,
    disputesWon,
    disputesLost: parseInt(v['disputes-lost']?.value ?? '0'),
    score: parseInt(v['score']?.value ?? '0'),
  };
}

// ─── Provider ───────────────────────────────────────────────────────────────
export const PoTProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [userAgreements, setUserAgreements] = useState<Agreement[]>([]);
  const [userReputation, setUserReputation] = useState<Reputation | null>(null);

  // On mount: check existing connection
  useEffect(() => {
    if (isConnected()) {
      setConnected(true);
      const data = getLocalStorage();
      const addr = extractAddress(data);
      if (addr) setAddress(addr);
    }
    fetchAllAgreements();
  }, []);

  useEffect(() => {
    if (address) {
      fetchBalance();
      fetchUserAgreements();
      fetchUserReputation();
    }
  }, [address]);

  // ── Wallet ──────────────────────────────────────────────────────────────
  const connectWallet = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await connect();
      if (response) {
        setConnected(true);
        const data = getLocalStorage();
        const addr = extractAddress(data);
        if (addr) setAddress(addr);
      }
    } catch (err) {
      console.error('Wallet connect error:', err);
      setError('Failed to connect wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = useCallback(() => {
    disconnect();
    try {
      localStorage.removeItem('stacks-session');
      localStorage.removeItem('blockstack-session');
    } catch (_) {}
    setConnected(false);
    setAddress(null);
    setBalance(null);
    setError(null);
    setUserAgreements([]);
    setUserReputation(null);
  }, []);

  const fetchBalance = useCallback(async () => {
    if (!address) return;
    try {
      const res = await fetch(`${API_BASE_URL}/extended/v1/address/${address}/stx`);
      const data = await res.json();
      setBalance(parseInt(data.balance ?? '0') / 1_000_000);
    } catch (err) {
      console.error('Balance fetch error:', err);
    }
  }, [address]);

  const formatAddress = (addr: string | null): string => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  };

  // ── Read-only Contract Calls ─────────────────────────────────────────────
  const readOnly = useCallback(
    async (functionName: string, functionArgs: any[]) => {
      return fetchCallReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName,
        functionArgs,
        network: NETWORK,
        senderAddress: CONTRACT_ADDRESS,
      });
    },
    []
  );

  const readReputation = useCallback(
    async (functionName: string, functionArgs: any[]) => {
      return fetchCallReadOnlyFunction({
        contractAddress: CONTRACT_ADDRESS,
        contractName: REPUTATION_CONTRACT_NAME,
        functionName,
        functionArgs,
        network: NETWORK,
        senderAddress: CONTRACT_ADDRESS,
      });
    },
    []
  );

  const getAgreementCount = useCallback(async (): Promise<number> => {
    try {
      const result = await readOnly('get-agreement-count', []);
      const json = cvToJSON(result);
      return parseInt(json?.value ?? '0');
    } catch {
      return 0;
    }
  }, [readOnly]);

  const getAgreement = useCallback(
    async (id: number): Promise<Agreement | null> => {
      try {
        const result = await readOnly('get-agreement', [uintCV(id)]);
        const json = cvToJSON(result);
        if (!json?.value?.value) return null;
        return parseAgreement(id, json.value.value);
      } catch {
        return null;
      }
    },
    [readOnly]
  );

  const getReputation = useCallback(
    async (user?: string): Promise<Reputation> => {
      const target = user || address || CONTRACT_ADDRESS;
      const empty: Reputation = {
        totalAgreements: 0,
        successfulAgreements: 0,
        failedAgreements: 0,
        disputesWon: 0,
        disputesLost: 0,
        score: 0,
      };
      try {
        const result = await readReputation('get-reputation', [principalCV(target)]);
        const json = cvToJSON(result);
        if (!json?.value) return empty;
        return parseReputation(json);
      } catch {
        return empty;
      }
    },
    [readReputation, address]
  );

  const fetchAllAgreements = useCallback(async () => {
    try {
      setIsLoading(true);
      const count = await getAgreementCount();
      const list: Agreement[] = [];
      for (let i = 1; i <= count; i++) {
        const a = await getAgreement(i);
        if (a) list.push(a);
      }
      setAgreements(list);
    } catch (err) {
      console.error('fetchAllAgreements error:', err);
      setError('Failed to fetch agreements');
    } finally {
      setIsLoading(false);
    }
  }, [getAgreementCount, getAgreement]);

  const fetchUserAgreements = useCallback(async () => {
    if (!address) return;
    try {
      const count = await getAgreementCount();
      const list: Agreement[] = [];
      for (let i = 1; i <= count; i++) {
        const a = await getAgreement(i);
        if (a && (a.partyA === address || a.partyB === address)) list.push(a);
      }
      setUserAgreements(list);
    } catch (err) {
      console.error('fetchUserAgreements error:', err);
    }
  }, [getAgreementCount, getAgreement, address]);

  const fetchUserReputation = useCallback(async () => {
    if (!address) return;
    try {
      const rep = await getReputation(address);
      setUserReputation(rep);
    } catch (err) {
      console.error('fetchUserReputation error:', err);
    }
  }, [getReputation, address]);

  // ── Write Contract Calls ─────────────────────────────────────────────────
  const contractCall = (params: any) =>
    new Promise<void>((resolve, reject) => {
      openContractCall({
        ...params,
        onFinish: async () => {
          setTimeout(() => {
            fetchAllAgreements();
            if (address) {
              fetchUserAgreements();
              fetchUserReputation();
              fetchBalance();
            }
          }, 5000);
          resolve();
        },
        onCancel: () => reject(new Error('Transaction cancelled')),
      });
    });

  const createAgreement = useCallback(
    async (params: CreateAgreementParams) => {
      if (!address) throw new Error('Wallet not connected');
      const stakeUSTX = Math.floor(params.stakeAmount * 1_000_000);

      // Fetch current Stacks block height so we can compute an absolute deadline.
      // The contract checks: (> deadline stacks-block-height), so we need
      // currentBlockHeight + relativeBlocks, NOT a Unix timestamp or a raw offset.
      let currentBlockHeight = 0;
      try {
        const res = await fetch(`${API_BASE_URL}/extended/v2/blocks?limit=1`);
        const data = await res.json();
        currentBlockHeight = data?.results?.[0]?.height ?? 0;
      } catch {
        // Fallback: try the v1 info endpoint
        try {
          const res = await fetch(`${API_BASE_URL}/v2/info`);
          const data = await res.json();
          currentBlockHeight = data?.stacks_tip_height ?? 0;
        } catch {
          throw new Error('Could not fetch current block height. Please try again.');
        }
      }

      if (currentBlockHeight === 0) {
        throw new Error('Could not determine current block height. Please try again.');
      }

      const absoluteDeadline = currentBlockHeight + params.deadlineBlocks;

      await contractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'create-agreement',
        functionArgs: [
          stringUtf8CV(params.title.slice(0, 100)),
          stringUtf8CV(params.description.slice(0, 500)),
          principalCV(params.partyB),
          uintCV(stakeUSTX),
          uintCV(absoluteDeadline),
          params.resolver ? someCV(principalCV(params.resolver)) : noneCV(),
        ],
        network: NETWORK,
        postConditionMode: PostConditionMode.Allow,
        postConditions: [],
      });
    },
    [address]
  );

  const acceptAgreement = useCallback(
    async (id: number) => {
      if (!address) throw new Error('Wallet not connected');
      await contractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'accept-agreement',
        functionArgs: [uintCV(id)],
        network: NETWORK,
        postConditionMode: PostConditionMode.Allow,
        postConditions: [],
      });
    },
    [address]
  );

  const stakeFunds = useCallback(
    async (id: number) => {
      if (!address) throw new Error('Wallet not connected');
      // Fetch agreement to know stake amount
      const agreement = await getAgreement(id);
      if (!agreement) throw new Error('Agreement not found');
      const stakeUSTX = Math.floor(agreement.stake * 1_000_000);

      await contractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'stake-funds',
        functionArgs: [uintCV(id)],
        network: NETWORK,
        postConditionMode: PostConditionMode.Deny,
        postConditions: [Pc.principal(address).willSendEq(stakeUSTX).ustx()],
      });
    },
    [address, getAgreement]
  );

  const resolveSuccess = useCallback(
    async (id: number) => {
      if (!address) throw new Error('Wallet not connected');
      await contractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'resolve-success',
        functionArgs: [uintCV(id)],
        network: NETWORK,
        postConditionMode: PostConditionMode.Allow,
        postConditions: [],
      });
    },
    [address]
  );

  const resolveFailure = useCallback(
    async (id: number) => {
      if (!address) throw new Error('Wallet not connected');
      await contractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'resolve-failure',
        functionArgs: [uintCV(id)],
        network: NETWORK,
        postConditionMode: PostConditionMode.Allow,
        postConditions: [],
      });
    },
    [address]
  );

  const raiseDispute = useCallback(
    async (id: number) => {
      if (!address) throw new Error('Wallet not connected');
      await contractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'raise-dispute',
        functionArgs: [uintCV(id)],
        network: NETWORK,
        postConditionMode: PostConditionMode.Allow,
        postConditions: [],
      });
    },
    [address]
  );

  const resolveDispute = useCallback(
    async (id: number, winner: string) => {
      if (!address) throw new Error('Wallet not connected');
      await contractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'resolve-dispute',
        functionArgs: [uintCV(id), principalCV(winner)],
        network: NETWORK,
        postConditionMode: PostConditionMode.Allow,
        postConditions: [],
      });
    },
    [address]
  );

  const value: PoTContextType = {
    connected,
    address,
    balance,
    isLoading,
    error,
    agreements,
    userAgreements,
    userReputation,
    network: NETWORK,
    networkName: NETWORK_NAME,
    connectWallet,
    disconnectWallet,
    fetchBalance,
    formatAddress,
    getAgreement,
    getAgreementCount,
    getReputation,
    fetchAllAgreements,
    fetchUserAgreements,
    fetchUserReputation,
    createAgreement,
    acceptAgreement,
    stakeFunds,
    resolveSuccess,
    resolveFailure,
    raiseDispute,
    resolveDispute,
    MIN_STAKE,
    CONTRACT_ADDRESS,
    CONTRACT_NAME,
  };

  return <PoTContext.Provider value={value}>{children}</PoTContext.Provider>;
};

export default PoTContext;
