import {
  SplitPaymentContract,
  initializeClient,
  generateFundedKeypair,
  createSplitInfo,
} from "./stellarClient";

class GroupExpenseManager {
  private client: any;
  private contract: any;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    console.log("Initializing client...");
    const sourceKeypair = await generateFundedKeypair();
    this.client = await initializeClient(sourceKeypair);
    this.contract = new SplitPaymentContract(this.client);
    console.log("Client initialized");
  }

  async createGroup(members: string[]) {
    const groupId = await this.contract.createGroup(members);

    return groupId;
  }

  async createGroupWithExpense() {
    try {
      const members = [
        process.env.TEST_ACCOUNT_1,
        process.env.TEST_ACCOUNT_2,
        process.env.TEST_ACCOUNT_3,
      ] as string[];

      console.log("Creating group...");
      const groupId = await this.contract.createGroup(members);
      console.log("Group created with ID:", groupId);

      const splitInfo = createSplitInfo(
        [members[0], members[1]],
        [6000, 4000] // 60% and 40%
      );

      console.log("Adding expense...");
      await this.contract.addExpense(
        groupId,
        members[0], // payer
        1000000, // amount (1 XLM = 10000000 stroops)
        "Dinner",
        splitInfo
      );

      return groupId;
    } catch (error) {
      console.error("Error in createGroupWithExpense:", error);
      throw error;
    }
  }

  async viewGroupDetails(groupId: string) {
    try {
      console.log("Getting group members..");
      const members = await this.contract.getGroupMembers(groupId);
      console.log("Group members:", members);

      console.log("Getting expenses..");
      const expenses = await this.contract.getGroupExpenses(groupId);
      console.log("Group expenses:", expenses);

      console.log("Getting member balances..");
      for (const member of members) {
        const balance = await this.contract.getMemberBalance(groupId, member);
        console.log(`Balance for ${member}:`, balance);
      }
    } catch (error) {
      console.error("Error in viewGroupDetails:", error);
      throw error;
    }
  }

  async settleGroupDebt(groupId: string) {
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

  async removeGroupExpense(groupId: string) {
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

  async runExamples() {
    try {
      const groupId = await this.createGroupWithExpense();
      await this.viewGroupDetails(groupId);
      await this.settleGroupDebt(groupId);
      await this.removeGroupExpense(groupId);
      await this.viewGroupDetails(groupId);
      console.log("All examples completed successfully!");
    } catch (error) {
      console.error("Error running examples:", error);
    }
  }
}

const contactManager = new GroupExpenseManager();

export default contactManager;
