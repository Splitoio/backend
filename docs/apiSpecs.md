# Splito API Documentation

This document outlines all available endpoints in the Splito API.

## Authentication

All endpoints require authentication via session cookies with better-auth.

## Base URL

```
/api
```

## User Endpoints

### Get Current User

```http
GET /users/me
```

**Parameters:** None (Uses session token)

**Example Response:**

```json
{
  "id": "cuid123",
  "name": "John Doe",
  "email": "john@example.com",
  "emailVerified": true,
  "image": "https://example.com/avatar.jpg",
  "currency": "USD",
  "stellarAccount": null,
  "createdAt": "2024-03-20T12:00:00Z",
  "updatedAt": "2024-03-20T12:00:00Z"
}
```

### Get User Balances

```http
GET /users/balances
```

**Parameters:** None (Uses session token)

**Example Response:**

```json
{
  "balances": [
    {
      "userId": "cuid123",
      "friendId": "cuid456",
      "currency": "USD",
      "amount": 1000,
      "friend": {
        "name": "Jane Doe",
        "email": "jane@example.com"
      },
      "hasMore": false
    }
  ],
  "youOwe": [
    {
      "currency": "USD",
      "amount": -500
    }
  ],
  "youGet": [
    {
      "currency": "USD",
      "amount": 1500
    }
  ]
}
```

### Create or Edit Expense

```http
POST /users/expenses
```

**Parameters:**

| Name         | Type   | Required | Description                                                     |
| ------------ | ------ | -------- | --------------------------------------------------------------- |
| paidBy       | string | Yes      | User ID who paid                                                |
| name         | string | Yes      | Expense name                                                    |
| category     | string | Yes      | Expense category                                                |
| amount       | number | Yes      | Amount in cents                                                 |
| splitType    | enum   | Yes      | One of: EQUAL, PERCENTAGE, EXACT, SHARE, ADJUSTMENT, SETTLEMENT |
| currency     | string | Yes      | Currency code (e.g., USD)                                       |
| participants | array  | Yes      | Array of participant objects                                    |
| fileKey      | string | No       | File reference key                                              |
| expenseDate  | date   | No       | Date of expense (defaults to now)                               |
| expenseId    | string | No       | Expense ID (for editing)                                        |

**Example Response:**

```json
{
  "id": "cuid789",
  "paidBy": "cuid123",
  "addedBy": "cuid123",
  "name": "Dinner",
  "category": "Food",
  "amount": 5000,
  "splitType": "EQUAL",
  "expenseDate": "2024-03-20T12:00:00Z",
  "createdAt": "2024-03-20T12:00:00Z",
  "updatedAt": "2024-03-20T12:00:00Z",
  "currency": "USD",
  "fileKey": null,
  "groupId": null,
  "expenseParticipants": [
    {
      "expenseId": "cuid789",
      "userId": "cuid123",
      "amount": 2500
    }
  ]
}
```

### Get Expenses with Friend

```http
GET /users/friends/:friendId/expenses
```

**URL Parameters:**

| Name     | Type   | Required | Description  |
| -------- | ------ | -------- | ------------ |
| friendId | string | Yes      | ID of friend |

**Example Response:**

```json
[
  {
    "id": "cuid789",
    "paidBy": "cuid123",
    "name": "Dinner",
    "category": "Food",
    "amount": 5000,
    "splitType": "EQUAL",
    "expenseDate": "2024-03-20T12:00:00Z",
    "currency": "USD",
    "expenseParticipants": [
      {
        "expenseId": "cuid789",
        "userId": "cuid123",
        "amount": 2500
      }
    ]
  }
]
```

### Invite Friend

```http
POST /users/friends/invite
```

**Parameters:**

| Name  | Type   | Required | Description               |
| ----- | ------ | -------- | ------------------------- |
| email | string | Yes      | Email of friend to invite |

**Example Response:**

```json
{
  "id": "cuid456",
  "email": "friend@example.com",
  "name": "friend",
  "emailVerified": false,
  "createdAt": "2024-03-20T12:00:00Z",
  "updatedAt": "2024-03-20T12:00:00Z"
}
```

### Add Friend

```http
POST /users/friends/add
```

**Parameters:**

| Name             | Type   | Required | Description                 |
| ---------------- | ------ | -------- | --------------------------- |
| friendIdentifier | string | Yes      | Email or username of friend |

**Example Response:**

```json
{
  "message": "Friend added successfully",
  "status": "success"
}
```

### Get Friends List

```http
GET /users/friends
```

**Parameters:** None (Uses session token)

**Example Response:**

```json
[
  {
    "friend": {
      "id": "cuid456",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "image": "https://example.com/avatar.jpg"
    }
  }
]
```

### Update Profile

```http
PATCH /users/profile
```

**Parameters:**

| Name     | Type   | Required | Description      |
| -------- | ------ | -------- | ---------------- |
| name     | string | No       | New display name |
| currency | string | No       | Default currency |

**Example Response:**

```json
{
  "id": "cuid123",
  "name": "Updated Name",
  "email": "john@example.com",
  "currency": "EUR",
  "updatedAt": "2024-03-20T12:00:00Z"
}
```

## Group Endpoints

### Create Group

```http
POST /groups
```

**Parameters:**

| Name        | Type   | Required | Description                        |
| ----------- | ------ | -------- | ---------------------------------- |
| name        | string | Yes      | Group name                         |
| description | string | No       | Group description                  |
| imageUrl    | string | No       | Group image URL                    |
| currency    | string | No       | Default currency (defaults to USD) |

**Example Response:**

```json
{
  "id": "cuid789",
  "name": "Trip to Paris",
  "userId": "cuid123",
  "description": "Expenses for Paris trip",
  "image": "https://example.com/paris.jpg",
  "defaultCurrency": "EUR",
  "createdAt": "2024-03-20T12:00:00Z",
  "updatedAt": "2024-03-20T12:00:00Z"
}
```

### Get All Groups

```http
GET /groups
```

**Parameters:** None (Uses session token)

**Example Response:**

```json
[
  {
    "id": "cuid789",
    "name": "Trip to Paris",
    "description": "Expenses for Paris trip",
    "image": "https://example.com/paris.jpg",
    "defaultCurrency": "EUR",
    "createdBy": {
      "id": "cuid123",
      "name": "John Doe"
    }
  }
]
```

### Get Groups with Balances

```http
GET /groups/balances
```

**Parameters:** None (Uses session token)

**Example Response:**

```json
[
  {
    "id": "cuid789",
    "name": "Trip to Paris",
    "balances": {
      "EUR": 1000,
      "USD": -500
    },
    "expenses": [
      {
        "id": "cuid101",
        "name": "Hotel",
        "amount": 20000,
        "createdAt": "2024-03-20T12:00:00Z"
      }
    ]
  }
]
```

### Join Group

```http
POST /groups/join/:groupId
```

**URL Parameters:**

| Name    | Type   | Required | Description         |
| ------- | ------ | -------- | ------------------- |
| groupId | string | Yes      | ID of group to join |

**Example Response:**

```json
{
  "id": "cuid789",
  "name": "Trip to Paris",
  "description": "Expenses for Paris trip",
  "defaultCurrency": "EUR",
  "createdAt": "2024-03-20T12:00:00Z"
}
```

### Get Group Details

```http
GET /groups/:groupId
```

**URL Parameters:**

| Name    | Type   | Required | Description |
| ------- | ------ | -------- | ----------- |
| groupId | string | Yes      | ID of group |

**Example Response:**

```json
{
  "id": "cuid789",
  "name": "Trip to Paris",
  "description": "Expenses for Paris trip",
  "image": "https://example.com/paris.jpg",
  "defaultCurrency": "EUR",
  "groupUsers": [
    {
      "user": {
        "id": "cuid123",
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ],
  "expenses": [],
  "groupBalances": [],
  "createdBy": {
    "id": "cuid123",
    "name": "John Doe"
  }
}
```

### Add or Edit Group Expense

```http
POST /groups/:groupId/expenses
```

**URL Parameters:**

| Name    | Type   | Required | Description |
| ------- | ------ | -------- | ----------- |
| groupId | string | Yes      | ID of group |

**Body Parameters:**

| Name         | Type   | Required | Description                                                     |
| ------------ | ------ | -------- | --------------------------------------------------------------- |
| paidBy       | string | Yes      | User ID who paid                                                |
| name         | string | Yes      | Expense name                                                    |
| category     | string | Yes      | Expense category                                                |
| amount       | number | Yes      | Amount in cents                                                 |
| splitType    | enum   | Yes      | One of: EQUAL, PERCENTAGE, EXACT, SHARE, ADJUSTMENT, SETTLEMENT |
| currency     | string | Yes      | Currency code                                                   |
| participants | array  | Yes      | Array of participant objects                                    |
| fileKey      | string | No       | File reference key                                              |
| expenseDate  | date   | No       | Date of expense                                                 |
| expenseId    | string | No       | Expense ID (for editing)                                        |

**Example Response:**

```json
{
  "id": "cuid101",
  "paidBy": "cuid123",
  "addedBy": "cuid123",
  "name": "Hotel",
  "category": "Accommodation",
  "amount": 20000,
  "splitType": "EQUAL",
  "expenseDate": "2024-03-20T12:00:00Z",
  "currency": "EUR",
  "groupId": "cuid789",
  "expenseParticipants": [
    {
      "expenseId": "cuid101",
      "userId": "cuid123",
      "amount": 10000
    }
  ]
}
```
