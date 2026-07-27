# Integration Testing Guide

This guide explains how to write integration tests against the ProxyPay API.

## Overview

Integration tests verify that your client code correctly communicates with the API. Unlike unit tests that mock dependencies, integration tests use real API requests.

## Prerequisites

- Node.js 16+
- A running instance of the ProxyPay backend (or access to a staging server)
- Basic knowledge of async/await and Jest

## Setup

### 1. Install Testing Dependencies

```bash
npm install --save-dev jest @types/jest ts-node typescript
```

### 2. Configure Jest

Create a `jest.config.js` file in your project root:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  testTimeout: 10000, // Increase timeout for API tests
};
```

### 3. Create Test Directory

```bash
mkdir tests
```

## Writing Your First Integration Test

### Example: Testing an API Endpoint

Create `tests/api.test.ts`:

```typescript
import fetch from 'node-fetch';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

describe('ProxyPay API Integration Tests', () => {
  describe('GET /health', () => {
    it('should return 200 with health status', async () => {
      const response = await fetch(`${API_BASE_URL}/health`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('status');
    });
  });

  describe('Authentication', () => {
    it('should reject requests without API key', async () => {
      const response = await fetch(`${API_BASE_URL}/api/accounts`, {
        method: 'GET',
      });
      expect(response.status).toBe(401);
    });

    it('should accept requests with valid API key', async () => {
      const apiKey = process.env.TEST_API_KEY;
      if (!apiKey) {
        throw new Error('TEST_API_KEY environment variable not set');
      }

      const response = await fetch(`${API_BASE_URL}/api/accounts`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      expect(response.status).toBeLessThan(500);
    });
  });
});
```

## Test Patterns

### 1. Testing Request/Response Validation

```typescript
describe('Request Validation', () => {
  it('should reject invalid JSON in request body', async () => {
    const response = await fetch(`${API_BASE_URL}/api/transfers`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.TEST_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: 'not-a-number', // Invalid: should be number
      }),
    });
    expect(response.status).toBe(400);
  });
});
```

### 2. Testing Error Responses

```typescript
describe('Error Handling', () => {
  it('should return 404 for non-existent resource', async () => {
    const response = await fetch(
      `${API_BASE_URL}/api/transfers/non-existent-id`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.TEST_API_KEY}`,
        },
      }
    );
    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data).toHaveProperty('error');
  });
});
```

### 3. Testing Rate Limiting

```typescript
describe('Rate Limiting', () => {
  it('should enforce rate limits', async () => {
    const requests = [];

    // Send multiple rapid requests
    for (let i = 0; i < 100; i++) {
      requests.push(
        fetch(`${API_BASE_URL}/api/health`, {
          headers: {
            Authorization: `Bearer ${process.env.TEST_API_KEY}`,
          },
        })
      );
    }

    const responses = await Promise.all(requests);
    const statusCodes = responses.map((r) => r.status);

    // Some requests should be rate-limited (429)
    expect(statusCodes).toContain(429);
  });
});
```

### 4. Testing Transaction Flows

```typescript
describe('Transaction Flows', () => {
  it('should complete a full transfer flow', async () => {
    const apiKey = process.env.TEST_API_KEY;

    // 1. Create a transfer
    const createResponse = await fetch(`${API_BASE_URL}/api/transfers`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: 100,
        currency: 'USD',
        destinationAccount: 'test@example.com',
      }),
    });
    expect(createResponse.status).toBe(201);
    const transfer = await createResponse.json();

    // 2. Retrieve the transfer
    const getResponse = await fetch(
      `${API_BASE_URL}/api/transfers/${transfer.id}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );
    expect(getResponse.status).toBe(200);
    const retrieved = await getResponse.json();
    expect(retrieved.id).toBe(transfer.id);

    // 3. Verify status
    expect(retrieved.status).toMatch(/pending|completed|failed/);
  });
});
```

## Environment Configuration

### Development Setup

Create a `.env.test` file:

```
API_BASE_URL=http://localhost:3000
TEST_API_KEY=your-test-api-key-here
NODE_ENV=test
```

### Run Tests with Environment

```bash
# Load variables from .env.test
npx jest --env=node
```

Or in `package.json`:

```json
{
  "scripts": {
    "test": "NODE_ENV=test jest",
    "test:watch": "NODE_ENV=test jest --watch",
    "test:coverage": "NODE_ENV=test jest --coverage"
  }
}
```

## Best Practices

### 1. Test Isolation

Keep tests independent—don't rely on test order:

```typescript
describe('Tests', () => {
  beforeEach(async () => {
    // Setup: create test data before each test
    await createTestTransfer();
  });

  afterEach(async () => {
    // Cleanup: remove test data after each test
    await deleteAllTestTransfers();
  });
});
```

### 2. Use Fixtures for Common Data

Create `tests/fixtures.ts`:

```typescript
export const testUser = {
  email: 'test@example.com',
  password: 'SecurePassword123!',
};

export const testTransfer = {
  amount: 100,
  currency: 'USD',
  destinationAccount: 'receiver@example.com',
};
```

### 3. Helper Functions for API Calls

Create `tests/apiHelper.ts`:

```typescript
import fetch from 'node-fetch';

export async function apiCall(
  endpoint: string,
  options: any = {}
) {
  const apiKey = process.env.TEST_API_KEY;
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';

  const response = await fetch(`${baseUrl}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json();
  return { status: response.status, data };
}

export async function apiGet(endpoint: string) {
  return apiCall(endpoint, { method: 'GET' });
}

export async function apiPost(endpoint: string, body: any) {
  return apiCall(endpoint, { method: 'POST', body: JSON.stringify(body) });
}
```

Then use in tests:

```typescript
import { apiGet, apiPost } from './apiHelper';

describe('Transfers', () => {
  it('should create a transfer', async () => {
    const { status, data } = await apiPost('/api/transfers', {
      amount: 100,
      currency: 'USD',
    });

    expect(status).toBe(201);
    expect(data).toHaveProperty('id');
  });
});
```

### 4. Test Naming Conventions

```typescript
describe('Transfers API', () => {
  describe('POST /transfers', () => {
    it('should create a transfer with valid data', () => {
      // ...
    });

    it('should reject transfer with negative amount', () => {
      // ...
    });

    it('should reject transfer without required fields', () => {
      // ...
    });
  });
});
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/api.test.ts

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch

# Run with verbose output
npm test -- --verbose
```

## Continuous Integration

Add to `.github/workflows/integration-tests.yml`:

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      # Add backend service if needed
      backend:
        image: proxypay:latest
        ports:
          - 3000:3000
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm test
        env:
          API_BASE_URL: http://localhost:3000
          TEST_API_KEY: ${{ secrets.TEST_API_KEY }}
```

## Troubleshooting

### Common Issues

**Tests timeout:** Increase `testTimeout` in jest.config.js

**API endpoint not accessible:** Verify backend is running on correct URL

**Missing environment variables:** Add to `.env.test` or CI secrets

**Async test not completing:** Ensure you're returning promises or using done callback

## Resources

- [Jest Documentation](https://jestjs.io/)
- [OpenAPI Spec](../api.md)
- [API Reference](https://sublime247.github.io/proxypay/api)

## Example Integration Test Suite

A complete example is available in `tests/example.test.ts`.
