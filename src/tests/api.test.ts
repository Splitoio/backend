// src/tests/api.test.ts
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';
let authToken: string;
let groupId: number;

const api = axios.create({
  baseURL: API_URL,
  validateStatus: () => true, // Don't throw on any status
});

async function runTests() {
  try {
    console.log('Starting API tests...\n');

    // 1. Test Login
    console.log('Testing login...');
    const loginResponse = await api.post('/auth/test-login', {
      email: 'test@example.com',
    });
    
    if (loginResponse.status !== 200) {
      throw new Error(`Login failed: ${JSON.stringify(loginResponse.data)}`);
    }
    
    authToken = loginResponse.data.token;
    console.log('✓ Login successful\n');

    // Set auth header for subsequent requests
    api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;

    // 2. Create Group
    console.log('Testing group creation...');
    const createGroupResponse = await api.post('/groups', {
      name: 'Test Group',
      currency: 'USD',
    });

    if (createGroupResponse.status !== 200) {
      throw new Error(`Group creation failed: ${JSON.stringify(createGroupResponse.data)}`);
    }

    groupId = createGroupResponse.data.id;
    console.log('✓ Group created successfully\n');

    // 3. Add Friend
    console.log('Testing friend invitation...');
    const addFriendResponse = await api.post('/users/friends/invite', {
      email: 'friend@example.com',
      sendInviteEmail: false,
    });

    if (addFriendResponse.status !== 200) {
      throw new Error(`Friend invitation failed: ${JSON.stringify(addFriendResponse.data)}`);
    }
    console.log('✓ Friend invited successfully\n');

    // 4. Create Expense
    console.log('Testing expense creation...');
    const createExpenseResponse = await api.post(`/groups/${groupId}/expenses`, {
      paidBy: loginResponse.data.user.id,
      name: 'Test Expense',
      category: 'General',
      amount: 100,
      splitType: 'EQUAL',
      currency: 'USD',
      participants: [
        {
          userId: loginResponse.data.user.id,
          amount: 50,
        },
        {
          userId: addFriendResponse.data.id,
          amount: 50,
        },
      ],
    });

    if (createExpenseResponse.status !== 200) {
      throw new Error(`Expense creation failed: ${JSON.stringify(createExpenseResponse.data)}`);
    }
    console.log('✓ Expense created successfully\n');

    // 5. Get Balances
    console.log('Testing balance retrieval...');
    const balancesResponse = await api.get('/groups/balances');
    
    if (balancesResponse.status !== 200) {
      throw new Error(`Balance retrieval failed: ${JSON.stringify(balancesResponse.data)}`);
    }
    console.log('✓ Balances retrieved successfully\n');

    console.log('All tests passed successfully! 🎉');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTests();