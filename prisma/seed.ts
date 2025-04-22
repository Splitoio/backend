import { PrismaClient, SplitType } from "@prisma/client";

const prisma = new PrismaClient();

async function createUsers() {
  const users = await prisma.user.createMany({
    data: [
      {
        name: "Alice",
        email: "alice@example.com",
        currency: "USD",
      },
      {
        name: "Bob",
        email: "bob@example.com",
        currency: "EUR",
      },
      {
        name: "Charlie",
        email: "charlie@example.com",
        currency: "GBP",
      },
      {
        name: "Diana",
        email: "diana@example.com",
        currency: "JPY",
      },
      {
        name: "Evan",
        email: "evan@example.com",
        currency: "CNY",
      },
    ],
  });

  return prisma.user.findMany();
}

async function createGroups() {
  // Assuming Alice creates a group and adds Bob and Charlie

  const users = await prisma.user.findMany();

  if (users.length) {
    const group = await prisma.group.create({
      data: {
        name: "Holiday Trip",
        publicId: "holiday-trip-123",
        defaultCurrency: "USD",
        createdBy: { connect: { id: users[0]?.id } },
      },
    });

    await prisma.groupUser.createMany({
      data: users.map((u) => ({ groupId: group.id, userId: u.id })),
    });
    console.log("Group created and users added");
  }
}

async function createAnalyticsData() {
  // Check if expenses already exist
  const existingExpenses = await prisma.expense.findMany();
  if (existingExpenses.length > 0) {
    console.log("Expenses already exist, skipping analytics data creation");
    return;
  }

  // Get users
  const users = await prisma.user.findMany();
  if (users.length < 2) return;

  const alice = users[0];
  const bob = users[1];
  const charlie = users[2];

  // Current month dates
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Create expense where Alice owes money to Bob (total $500)
  const bobExpense = await prisma.expense.create({
    data: {
      name: "Group Dinner",
      category: "Food",
      amount: 1000.0,
      currency: "USD",
      splitType: SplitType.EXACT,
      paidBy: bob.id,
      addedBy: bob.id,
      expenseDate: new Date(currentYear, currentMonth, 10), // This month
      expenseParticipants: {
        create: [
          {
            userId: bob.id,
            amount: 500.0, // Bob paid for himself
          },
          {
            userId: alice.id,
            amount: 500.0, // Alice owes this
          },
        ],
      },
    },
  });

  // Create expense where Alice lent money to Charlie and Bob (total $650.50)
  const aliceExpense = await prisma.expense.create({
    data: {
      name: "Movie Tickets",
      category: "Entertainment",
      amount: 650.5,
      currency: "USD",
      splitType: SplitType.EXACT,
      paidBy: alice.id,
      addedBy: alice.id,
      expenseDate: new Date(currentYear, currentMonth, 15), // This month
      expenseParticipants: {
        create: [
          {
            userId: alice.id,
            amount: 217.0, // Alice paid for herself
          },
          {
            userId: bob.id,
            amount: 217.0, // Bob owes Alice
          },
          {
            userId: charlie.id,
            amount: 216.5, // Charlie owes Alice
          },
        ],
      },
    },
  });

  // Create a group for settlement
  const group = await prisma.group.findFirst();
  if (!group) return;

  // Create settlement transaction ($100.29 settled)
  const settlement = await prisma.settlementTransaction.create({
    data: {
      userId: charlie.id,
      groupId: group.id,
      serializedTx: "dummy-serialized-tx",
      settleWithId: alice.id,
      status: "COMPLETED",
      createdAt: new Date(currentYear, currentMonth, 20), // This month
      completedAt: new Date(currentYear, currentMonth, 20),
      transactionHash: "dummy-tx-hash",
      settlementItems: {
        create: [
          {
            userId: charlie.id,
            friendId: alice.id,
            originalAmount: 100.29,
            originalCurrency: "USD",
            xlmAmount: 100.29,
          },
        ],
      },
    },
  });

  console.log("Analytics data created successfully");
}

async function createReminderData() {
  // Check if reminders already exist
  const existingReminders = await prisma.reminder.findMany();
  if (existingReminders.length > 0) {
    console.log("Reminders already exist, skipping creation");
    return;
  }

  // Get users
  const users = await prisma.user.findMany();
  if (users.length < 2) return;

  const alice = users[0];
  const bob = users[1];
  const charlie = users[2];

  // Create a user-to-user reminder
  const userToUserReminder = await prisma.reminder.create({
    data: {
      fromUserId: bob.id,
      toUserId: alice.id,
      amount: 250.0,
      currency: "USD",
      message: "Hey Alice, can you settle your half of the dinner bill?",
      type: "USER_TO_USER",
      status: "PENDING",
    },
  });

  // Create a settlement reminder
  const settlementReminder = await prisma.reminder.create({
    data: {
      fromUserId: charlie.id,
      toUserId: alice.id,
      amount: 150.0,
      currency: "USD",
      message: "Reminder to settle the balance for our group trip.",
      type: "SETTLEMENT",
      status: "PENDING",
    },
  });

  console.log("Reminder data created successfully");
}

async function main() {
  await createUsers();
  await createGroups();
  await createAnalyticsData();
  await createReminderData();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect().catch(console.log);
  });
