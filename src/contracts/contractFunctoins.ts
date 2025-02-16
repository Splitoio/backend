import { 
    SplitPaymentContract, 
    initializeClient, 
    generateFundedKeypair,
    createSplitInfo 
} from './stellarClient.js';

// Example 1: Create group and add expense with custom split


async function createGroupWithExpense() {
    try {
        const sourceKeypair = await generateFundedKeypair();
        const client = await initializeClient(sourceKeypair);
        const contract = new SplitPaymentContract(client);

        // Get test accounts from env
        const members = [
            process.env.TEST_ACCOUNT_1,
            process.env.TEST_ACCOUNT_2,
            process.env.TEST_ACCOUNT_3
        ] as string[];

        console.log('Creating group...');
        const groupId = await contract.createGroup(members);
        console.log('Group created with ID:', groupId);

        // Create a 60-40 split between first two members
        const splitInfo = createSplitInfo(
            [members[0], members[1]], 
            [6000, 4000]  // 60% and 40%
        );

        console.log('Adding expense...');
        await contract.addExpense(
            groupId,
            members[0],  // payer
            1000000,     // amount (1 XLM = 10000000 stroops)
            "Dinner",
            splitInfo
        );

        return groupId;
    } catch (error) {
        console.error('Error in createGroupWithExpense:', error);
        throw error;
    }
}

// Example 2: View group details and balances
async function viewGroupDetails(groupId: string) {
    try {
        const sourceKeypair = await generateFundedKeypair();
        const client = await initializeClient(sourceKeypair);
        const contract = new SplitPaymentContract(client);

        console.log('Getting group members..');
        const members = await contract.getGroupMembers(groupId);
        console.log('Group members:', members);

        console.log('Getting expenses..');
        const expenses = await contract.getGroupExpenses(groupId);
        console.log('Group expenses:', expenses);

        console.log('Getting member balances..');
        for (const member of members) {
            const balance = await contract.getMemberBalance(groupId, member);
            console.log(`Balance for ${member}:`, balance);
        }
    } catch (error) {
        console.error('Error in viewGroupDetails:', error);
        throw error;
    }
}

// Example 3: Settle debt between members
async function settleGroupDebt(groupId: string) {
    try {
        const sourceKeypair = await generateFundedKeypair();
        const client = await initializeClient(sourceKeypair);
        const contract = new SplitPaymentContract(client);

        // Get the current balances
        const fromMember = process.env.TEST_ACCOUNT_2 as string;  // Member who owes money
        const toMember = process.env.TEST_ACCOUNT_1 as string   ;    // Member who is owed money

        const fromBalance = await contract.getMemberBalance(groupId, fromMember);
        console.log(`Current balance of payer: ${fromBalance}`);

        if (fromBalance >= 0) {
            console.log('No debt to settle');
            return;
        }

        const amountToSettle = -fromBalance; // Use the exact amount owed
        console.log(`Settling amount: ${amountToSettle}`);

        await contract.settleDebt(
            groupId,
            fromMember,
            toMember,
            amountToSettle
        );
        console.log('Debt settled successfully');

        // Show updated balances
        const newFromBalance = await contract.getMemberBalance(groupId, fromMember);
        const newToBalance = await contract.getMemberBalance(groupId, toMember);
        console.log(`New balance for payer: ${newFromBalance}`);
        console.log(`New balance for receiver: ${newToBalance}`);
    } catch (error) {
        console.error('Error in settleGroupDebt:', error);
        throw error;
    }
}

// Example 4: Remove expense
    async function removeGroupExpense(groupId: string   ) {
    try {
        const sourceKeypair = await generateFundedKeypair();
        const client = await initializeClient(sourceKeypair);
        const contract = new SplitPaymentContract(client);

        console.log('Removing first expense...');
        await contract.removeExpense(
            groupId,
            0,  // first expense
            process.env.TEST_ACCOUNT_1 as string     // authorized by original payer
        );
        console.log('Expense removed successfully');

        // Show updated expenses
        const expenses = await contract.getGroupExpenses(groupId);
        console.log('Updated expenses:', expenses);
    } catch (error) {
        console.error('Error in removeGroupExpense:', error);
        throw error;
    }
}

// Run all examples
async function runExamples() {
    try {
        // Create group and add expense
        const groupId = await createGroupWithExpense();

        // View initial group details
        await viewGroupDetails(groupId);

        // Try to settle debt
        await settleGroupDebt(groupId);

        // Remove the expense
        await removeGroupExpense(groupId);

        // View final group details
        await viewGroupDetails(groupId);

        console.log('All examples completed successfully!');
    } catch (error) {
        console.error('Error running examples:', error);
    }
}

export {
    createGroupWithExpense,
    viewGroupDetails,
    settleGroupDebt,
    removeGroupExpense,
    runExamples
};
runExamples();