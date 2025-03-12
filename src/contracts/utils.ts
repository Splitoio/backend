import { Keypair } from "@stellar/stellar-sdk";
import {
  SplitPaymentContract,
  initializeClient,
  generateFundedKeypair,
  createSplitInfo,
} from "./stellarClient";

class GroupExpenseManager {
  private client: any;
  private contract!: SplitPaymentContract;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    console.log("Initializing client...");
    // const sourceKeypair = await generateFundedKeypair();
    const secret = process.env.SECRET_KEY!;
    const sourceKeypair = Keypair.fromSecret(secret);

    this.client = await initializeClient(sourceKeypair);
    this.contract = new SplitPaymentContract(this.client);
    console.log("Client initialized");
  }

  async createGroup(members: string[]) {
    const groupId = await this.contract.createGroup(members);

    return groupId;
  }

  async addExpense(
    groupId: number,
    amount: number,
    splitInfo: ReturnType<typeof createSplitInfo>,
    description: string,
    payer: string
  ) {
    await this.contract.addExpense(
      groupId,
      payer, // payer
      amount, // amount (1 XLM = 10000000 stroops)
      description,
      splitInfo
    );
  }

  async viewGroupDetails(groupId: number) {
    try {
      // const members = await this.getGroupMembers(groupId);
      // const expenses = await this.getGroupExpenses(groupId);
      // const balances = await this.getGroupMemberBalances(groupId, members);
    } catch (error) {
      console.error("Error in viewGroupDetails:", error);
      throw error;
    }
  }

  async getGroupMembers(groupId: number) {
    console.log("Getting group members..");
    const members = await this.contract.getGroupMembers(groupId);
    console.log("Group members:", members);
    return members;
  }

  async getGroupExpenses(groupId: number) {
    const expenses = await this.contract.getGroupExpenses(groupId);
    return expenses;
  }

  async getGroupMemberBalances(groupId: number, member: string) {
    return await this.contract.getMemberBalance(groupId, member);

    // console.log("Getting member balances..");
    // for (const member of members) {
    //   const balance = await this.contract.getMemberBalance(groupId, member);
    //   console.log(`Balance for ${member}:`, balance);
    // }
  }

  async addMemberToGroup(groupId: number, member: string) {
    await this.contract.addMember(groupId, member);
  }

  async settleGroupDebt(groupId: number) {
    try {
      const fromMember = process.env.TEST_ACCOUNT_2 as string;
      const toMember = process.env.TEST_ACCOUNT_1 as string;

      const fromBalance = await this.contract.getMemberBalance(
        groupId,
        fromMember
      );
      console.log(`Current balance of payer: ${fromBalance}`);

      if (fromBalance >= 0) {
        console.log("No debt to settle");
        return;
      }

      const amountToSettle = -fromBalance;
      console.log(`Settling amount: ${amountToSettle}`);

      await this.contract.settleDebt(
        groupId,
        fromMember,
        toMember,
        amountToSettle
      );
      console.log("Debt settled successfully");

      const newFromBalance = await this.contract.getMemberBalance(
        groupId,
        fromMember
      );
      const newToBalance = await this.contract.getMemberBalance(
        groupId,
        toMember
      );
      console.log(`New balance for payer: ${newFromBalance}`);
      console.log(`New balance for receiver: ${newToBalance}`);
    } catch (error) {
      console.error("Error in settleGroupDebt:", error);
      throw error;
    }
  }

  async removeGroupExpense(groupId: number) {
    try {
      console.log("Removing first expense...");
      await this.contract.removeExpense(
        groupId,
        0, // first expense
        process.env.TEST_ACCOUNT_1 as string
      );
      console.log("Expense removed successfully");

      const expenses = await this.contract.getGroupExpenses(groupId);
      console.log("Updated expenses:", expenses);
    } catch (error) {
      console.error("Error in removeGroupExpense:", error);
      throw error;
    }
  }
}

const contactManager = new GroupExpenseManager();

export default contactManager;
