import {
  ChainProvider,
  TransactionRequest,
  SerializedTransaction,
  TransactionResult,
  FeeEstimate,
} from "../../../types/chains";

export abstract class BaseChainProvider implements ChainProvider {
  protected readonly chainId: string;
  protected connected: boolean = false;

  constructor(chainId: string) {
    this.chainId = chainId;
  }

  getChainId(): string {
    return this.chainId;
  }

  isConnected(): Promise<boolean> {
    return Promise.resolve(this.connected);
  }

  abstract connect(address: string): Promise<boolean>;
  abstract disconnect(): Promise<void>;
  abstract getBalance(address: string, tokenId?: string): Promise<string>;
  abstract createTransaction(
    sourceAddress: string,
    transactions: TransactionRequest[]
  ): Promise<SerializedTransaction>;
  abstract submitTransaction(signedTx: string): Promise<TransactionResult>;
  abstract validateAddress(address: string): Promise<boolean>;
  abstract estimateFees(tx: TransactionRequest): Promise<FeeEstimate>;
}
