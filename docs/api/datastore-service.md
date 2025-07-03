# DataStoreService API

The `DataStoreService` is the central data access layer for DebtFreePro, providing methods to manage accounts, balances, statements, and application settings.

## Overview

```typescript
class DataStoreService {
  // Initialization
  static async initializeDataStore(): Promise<void>
  static async loadData(): Promise<DataStoreV2>
  static async saveData(dataStore: DataStoreV2): Promise<void>
  
  // Account Management
  static async createAccount(params: CreateDebtAccountParams): Promise<DebtAccount>
  static async getAccount(accountId: string): Promise<DebtAccount | null>
  static async getAllAccounts(): Promise<DebtAccount[]>
  static async updateAccount(params: UpdateDebtAccountParams): Promise<DebtAccount | null>
  static async deleteAccount(accountId: string): Promise<boolean>
  
  // Balance Management
  static async createBalance(params: CreateDebtBalanceParams): Promise<DebtBalance>
  static async getCurrentBalance(accountId: string): Promise<DebtBalance | null>
  static async getBalanceHistory(accountId: string, limit?: number): Promise<DebtBalance[]>
  static async updateBalance(params: UpdateDebtBalanceParams): Promise<DebtBalance | null>
  
  // Statement Management
  static async createStatement(params: CreateFinancialStatementParams): Promise<FinancialStatement>
  static async addStatement(statement: any): Promise<void> // Legacy compatibility
  static async getStatements(accountId?: string): Promise<any[]>
  
  // Composite Operations
  static async getAccountWithCurrentBalance(accountId: string): Promise<DebtAccountBalance | null>
  static async getAllAccountsWithBalances(): Promise<DebtAccountBalance[]>
  static async createAccountWithInitialBalance(accountParams: CreateDebtAccountParams, balanceParams: Omit<CreateDebtBalanceParams, 'accountId'>): Promise<DebtAccountBalance>
  
  // Legacy Compatibility Methods
  static async addDebt(params: any): Promise<any>
  static async getDebts(): Promise<any[]>
  static async getDebt(debtId: string): Promise<any | null>
  static async updateDebt(params: any): Promise<any | null>
  static async deleteDebt(debtId: string): Promise<boolean>
  
  // Settings Management
  static async getSettings(): Promise<DataStoreV2['settings']>
  static async updateSettings(settings: Partial<DataStoreV2['settings']>): Promise<void>
  
  // Data Export/Import
  static async exportData(): Promise<string>
  static async importData(jsonData: string): Promise<void>
}
```

## Method Documentation

### Initialization Methods

#### `initializeDataStore()`
Initializes the data store by creating the data file if it doesn't exist.

```typescript
static async initializeDataStore(): Promise<void>
```

**Returns:** `Promise<void>`

**Throws:** Error if initialization fails

**Example:**
```typescript
await DataStoreService.initializeDataStore();
```

#### `loadData()`
Loads the complete data store from the file system.

```typescript
static async loadData(): Promise<DataStoreV2>
```

**Returns:** `Promise<DataStoreV2>` - The complete data store

**Example:**
```typescript
const dataStore = await DataStoreService.loadData();
console.log(`Loaded ${dataStore.accounts.length} accounts`);
```

#### `saveData(dataStore)`
Saves the complete data store to the file system.

```typescript
static async saveData(dataStore: DataStoreV2): Promise<void>
```

**Parameters:**
- `dataStore: DataStoreV2` - The data store to save

**Throws:** Error if save operation fails

### Account Management

#### `createAccount(params)`
Creates a new debt account.

```typescript
static async createAccount(params: CreateDebtAccountParams): Promise<DebtAccount>
```

**Parameters:**
- `params: CreateDebtAccountParams`
  ```typescript
  interface CreateDebtAccountParams {
    name: string;
    type: DebtAccountType;
    institution: string;
    accountNumber?: string;
    dueDate?: number;
  }
  ```

**Returns:** `Promise<DebtAccount>` - The created account

**Example:**
```typescript
const account = await DataStoreService.createAccount({
  name: "Chase Freedom Card",
  type: DebtAccountType.CREDIT_CARD,
  institution: "Chase Bank",
  accountNumber: "1234",
  dueDate: 15
});
```

#### `getAccount(accountId)`
Retrieves a specific debt account by ID.

```typescript
static async getAccount(accountId: string): Promise<DebtAccount | null>
```

**Parameters:**
- `accountId: string` - The account ID to retrieve

**Returns:** `Promise<DebtAccount | null>` - The account or null if not found

#### `getAllAccounts()`
Retrieves all debt accounts.

```typescript
static async getAllAccounts(): Promise<DebtAccount[]>
```

**Returns:** `Promise<DebtAccount[]>` - Array of all accounts

#### `updateAccount(params)`
Updates an existing debt account.

```typescript
static async updateAccount(params: UpdateDebtAccountParams): Promise<DebtAccount | null>
```

**Parameters:**
- `params: UpdateDebtAccountParams`
  ```typescript
  interface UpdateDebtAccountParams {
    id: string;
    name?: string;
    type?: DebtAccountType;
    institution?: string;
    accountNumber?: string;
    dueDate?: number;
  }
  ```

**Returns:** `Promise<DebtAccount | null>` - The updated account or null if not found

#### `deleteAccount(accountId)`
Deletes a debt account and all related data.

```typescript
static async deleteAccount(accountId: string): Promise<boolean>
```

**Parameters:**
- `accountId: string` - The account ID to delete

**Returns:** `Promise<boolean>` - true if deleted, false if not found

### Balance Management

#### `createBalance(params)`
Creates a new balance record for an account.

```typescript
static async createBalance(params: CreateDebtBalanceParams): Promise<DebtBalance>
```

**Parameters:**
- `params: CreateDebtBalanceParams`
  ```typescript
  interface CreateDebtBalanceParams {
    accountId: string;
    balance: number;
    minimumPayment: number;
    interestRate: number;
    creditLimit?: number;
    availableCredit?: number;
    balanceDate?: Date;
  }
  ```

**Returns:** `Promise<DebtBalance>` - The created balance record

#### `getCurrentBalance(accountId)`
Gets the most recent balance for an account.

```typescript
static async getCurrentBalance(accountId: string): Promise<DebtBalance | null>
```

**Parameters:**
- `accountId: string` - The account ID

**Returns:** `Promise<DebtBalance | null>` - The current balance or null

#### `getBalanceHistory(accountId, limit?)`
Gets the balance history for an account.

```typescript
static async getBalanceHistory(accountId: string, limit?: number): Promise<DebtBalance[]>
```

**Parameters:**
- `accountId: string` - The account ID
- `limit?: number` - Optional limit on number of records

**Returns:** `Promise<DebtBalance[]>` - Array of balance records (newest first)

### Composite Operations

#### `getAccountWithCurrentBalance(accountId)`
Gets an account with its current balance in a single operation.

```typescript
static async getAccountWithCurrentBalance(accountId: string): Promise<DebtAccountBalance | null>
```

**Returns:** `Promise<DebtAccountBalance | null>`
```typescript
interface DebtAccountBalance {
  account: DebtAccount;
  balance: DebtBalance;
}
```

#### `getAllAccountsWithBalances()`
Gets all accounts with their current balances.

```typescript
static async getAllAccountsWithBalances(): Promise<DebtAccountBalance[]>
```

**Returns:** `Promise<DebtAccountBalance[]>` - Array of account/balance pairs

### Legacy Compatibility Methods

These methods provide backward compatibility with the old API:

#### `addDebt(params)`
Legacy method to add a debt (creates account + balance).

```typescript
static async addDebt(params: any): Promise<any>
```

**Parameters:** Legacy debt object or creation parameters

**Returns:** Legacy debt format object

#### `getDebts()`
Legacy method to get all debts in the old format.

```typescript
static async getDebts(): Promise<any[]>
```

**Returns:** Array of debts in legacy format

#### `updateDebt(params)`
Legacy method to update debt information.

```typescript
static async updateDebt(params: any): Promise<any | null>
```

**Parameters:** Legacy update parameters

**Returns:** Updated debt in legacy format or null

### Settings Management

#### `getSettings()`
Gets the current application settings.

```typescript
static async getSettings(): Promise<DataStoreV2['settings']>
```

**Returns:** Current settings object

#### `updateSettings(settings)`
Updates application settings.

```typescript
static async updateSettings(settings: Partial<DataStoreV2['settings']>): Promise<void>
```

**Parameters:**
- `settings: Partial<DataStoreV2['settings']>` - Settings to update

### Data Export/Import

#### `exportData()`
Exports the entire data store as a JSON string.

```typescript
static async exportData(): Promise<string>
```

**Returns:** `Promise<string>` - JSON representation of the data store

#### `importData(jsonData)`
Imports a data store from a JSON string.

```typescript
static async importData(jsonData: string): Promise<void>
```

**Parameters:**
- `jsonData: string` - JSON string to import

**Throws:** Error if import fails or data is invalid

## Error Handling

The DataStoreService uses the following error handling patterns:

1. **File System Errors**: Wrapped in descriptive error messages
2. **Validation Errors**: Thrown for invalid input data
3. **Not Found**: Returns `null` for missing entities
4. **Data Corruption**: Falls back to empty data store

## Usage Patterns

### Creating a New Debt Account

```typescript
// Method 1: Using new domain model methods
const account = await DataStoreService.createAccount({
  name: "My Credit Card",
  type: DebtAccountType.CREDIT_CARD,
  institution: "My Bank"
});

const balance = await DataStoreService.createBalance({
  accountId: account.id,
  balance: 1500.00,
  minimumPayment: 45.00,
  interestRate: 18.99
});

// Method 2: Using legacy compatibility method
const debt = await DataStoreService.addDebt({
  name: "My Credit Card",
  type: DebtAccountType.CREDIT_CARD,
  institution: "My Bank",
  balance: 1500.00,
  minimumPayment: 45.00,
  interestRate: 18.99
});
```

### Updating Debt Information

```typescript
// Update account information
await DataStoreService.updateAccount({
  id: accountId,
  name: "Updated Name",
  institution: "New Institution"
});

// Create new balance record (for tracking history)
await DataStoreService.createBalance({
  accountId: accountId,
  balance: 1400.00,
  minimumPayment: 42.00,
  interestRate: 18.99
});
```

### Getting Complete Debt Information

```typescript
// Get all debts with current balances
const debtsWithBalances = await DataStoreService.getAllAccountsWithBalances();

// Or using legacy format
const legacyDebts = await DataStoreService.getDebts();
```