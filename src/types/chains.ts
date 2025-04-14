export interface ChainConfig {
  id: string; // Chain identifier (e.g., "ethereum", "polygon")
  name: string; // Human-readable name
  currency: string; // Native currency code
  rpcUrl: string; // RPC endpoint
  blockExplorer: string; // Block explorer URL
  testnet: boolean; // Whether this is a testnet
  logoUrl?: string; // Chain logo URL
  enabled: boolean; // Whether chain is enabled
}

// Chain provider interface - each chain will implement this
export interface ChainProvider {
  getChainId(): string;
  isConnected(): Promise<boolean>;
  connect(address: string): Promise<boolean>;
  disconnect(): Promise<void>;
  getBalance(address: string, tokenId?: string): Promise<string>;
  createTransaction(
    sourceAddress: string,
    transactions: TransactionRequest[]
  ): Promise<SerializedTransaction>;
  submitTransaction(signedTx: string): Promise<TransactionResult>;
  validateAddress(address: string): Promise<boolean>;
  estimateFees(tx: TransactionRequest): Promise<FeeEstimate>;
}

export interface TransactionRequest {
  to: string;
  amount: string;
  tokenId?: string; // null for native token
}

export interface SerializedTransaction {
  serializedTx: string;
  txHash: string;
  chainId: string;
}

export interface TransactionResult {
  success: boolean;
  hash?: string;
  error?: string;
  blockNumber?: number;
  chainId: string;
}

export interface FeeEstimate {
  fee: string;
  currency: string;
  estimatedTimeInSeconds?: number;
}
