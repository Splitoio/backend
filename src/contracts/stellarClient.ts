import { rpc, Keypair, contract } from "@stellar/stellar-sdk";
import { env } from "../config/env";

const Server = rpc.Server;
const basicNodeSigner = contract.basicNodeSigner;
class Client extends contract.Client {}

// Add type definitions
interface SplitMember {
  member: string;
  share: number;
}

interface ExpenseData {
  payer: string;
  amount: number;
  description: string;
  split_members: SplitMember[];
}

const { SOROBAN_RPC_URL, SOROBAN_NETWORK_PASSPHRASE, SOROBAN_CONTRACT_ID } =
  env;

// Initialize contract client
export async function initializeClient(
  sourceKeypair: Keypair
): Promise<Client> {
  const { signTransaction } = basicNodeSigner(
    sourceKeypair,
    SOROBAN_NETWORK_PASSPHRASE
  );

  const client = await Client.from({
    contractId: SOROBAN_CONTRACT_ID,
    networkPassphrase: SOROBAN_NETWORK_PASSPHRASE,
    rpcUrl: SOROBAN_RPC_URL,
    publicKey: sourceKeypair.publicKey(),
    signTransaction,
  });

  return client;
}

// Generate and fund a keypair for testing
export async function generateFundedKeypair(): Promise<Keypair> {
  const keypair = Keypair.random();
  const server = new Server(SOROBAN_RPC_URL);
  await server.requestAirdrop(keypair.publicKey());
  return keypair;
}

// Helper function to create split info
export function createSplitInfo(
  members: string[],
  shares: number[]
): SplitMember[] {
  if (members.length !== shares.length) {
    throw new Error("Members and shares arrays must have the same length");
  }

  const totalShares = shares.reduce((a, b) => a + b, 0);
  if (totalShares !== 10000) {
    throw new Error("Total shares must equal 10000 (100%)");
  }

  return members.map((member, index) => ({
    member,
    share: shares[index],
  }));
}

// Split Payment Contract Class
export class SplitPaymentContract {
  private client: any;

  constructor(client: Client) {
    this.client = client;
  }

  async createGroup(members: string[]): Promise<string> {
    try {
      const tx = await this.client.create_group({ members });
      const { result } = await tx.signAndSend();
      return result;
    } catch (error) {
      console.error("Error creating group:", error);
      throw error;
    }
  }

  async addMember(groupId: string, newMember: string): Promise<boolean> {
    try {
      const tx = await this.client.add_member({
        group_id: groupId,
        new_member: newMember,
      });
      const { result } = await tx.signAndSend();
      return result;
    } catch (error) {
      console.error("Error adding member:", error);
      throw error;
    }
  }

  async removeMember(groupId: string, member: string): Promise<boolean> {
    try {
      const tx = await this.client.remove_member({
        group_id: groupId,
        member,
      });
      const { result } = await tx.signAndSend();
      return result;
    } catch (error) {
      console.error("Error removing member:", error);
      throw error;
    }
  }

  async getGroupMembers(groupId: string): Promise<string[]> {
    try {
      const tx = await this.client.get_group_members({
        group_id: groupId,
      });
      return tx.result;
    } catch (error) {
      console.error("Error getting group members:", error);
      throw error;
    }
  }

  async addExpense(
    groupId: string,
    payer: string,
    amount: number,
    description: string,
    splitMembers: SplitMember[]
  ): Promise<string> {
    try {
      const tx = await this.client.add_expense({
        group_id: groupId,
        payer,
        amount,
        description,
        split_members: splitMembers,
      });
      const { result } = await tx.signAndSend();
      return result;
    } catch (error) {
      console.error("Error adding expense:", error);
      throw error;
    }
  }

  async removeExpense(
    groupId: string,
    expenseIndex: number,
    authorizedBy: string
  ): Promise<boolean> {
    try {
      const tx = await this.client.remove_expense({
        group_id: groupId,
        expense_index: expenseIndex,
        authorized_by: authorizedBy,
      });
      const { result } = await tx.signAndSend();
      return result;
    } catch (error) {
      console.error("Error removing expense:", error);
      throw error;
    }
  }

  async settleDebt(
    groupId: string,
    from: string,
    to: string,
    amount: number
  ): Promise<boolean> {
    try {
      // First check the balance
      const fromBalance = await this.getMemberBalance(groupId, from);
      if (fromBalance >= 0) {
        throw new Error("From address does not owe any money");
      }
      if (amount > -fromBalance) {
        throw new Error("Cannot settle more than what is owed");
      }

      const tx = await this.client.settle_debt({
        group_id: groupId,
        from,
        to,
        amount,
      });
      const { result } = await tx.signAndSend();
      return result;
    } catch (error) {
      console.error("Error settling debt:", error);
      throw error;
    }
  }

  async getMemberBalance(groupId: string, member: string): Promise<number> {
    try {
      const tx = await this.client.get_member_balance({
        group_id: groupId,
        member,
      });
      return tx.result;
    } catch (error) {
      console.error("Error getting member balance:", error);
      throw error;
    }
  }

  async getGroupExpenses(groupId: string): Promise<ExpenseData[]> {
    try {
      const tx = await this.client.get_group_expenses({
        group_id: groupId,
      });
      return tx.result;
    } catch (error) {
      console.error("Error getting group expenses:", error);
      throw error;
    }
  }
}
