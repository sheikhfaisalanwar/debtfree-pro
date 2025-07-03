import RNFS from 'react-native-fs';
import { DataStoreV2, DEFAULT_SETTINGS, CURRENT_DATA_VERSION } from '../types/DataStore';
import { DebtAccount, CreateDebtAccountParams, UpdateDebtAccountParams, DebtAccountBalance } from '../types/DebtAccount';
import { DebtBalance, CreateDebtBalanceParams, UpdateDebtBalanceParams } from '../types/DebtBalance';
import { Document, CreateDocumentParams, UpdateDocumentParams } from '../types/Document';
import { FinancialStatement, CreateFinancialStatementParams, UpdateFinancialStatementParams } from '../types/FinancialStatement';

export class DataStoreService {
  private static readonly DATA_FILE_PATH = `${RNFS.DocumentDirectoryPath}/debts.json`;
  private static readonly INITIAL_DATA_PATH = 'src/data/debts.json';
  private static _initialized = false;

  static async initializeDataStore(): Promise<void> {
    if (this._initialized) {
      return;
    }

    try {
      const exists = await RNFS.exists(this.DATA_FILE_PATH);
      
      if (!exists) {
        try {
          const initialData = require('../data/debts.json');
          await RNFS.writeFile(this.DATA_FILE_PATH, JSON.stringify(initialData, null, 2), 'utf8');
        } catch (requireError) {
          // If we can't load the initial data file, create an empty store
          const emptyStore = this.getEmptyDataStore();
          await RNFS.writeFile(this.DATA_FILE_PATH, JSON.stringify(this.serializeDataStore(emptyStore), null, 2), 'utf8');
        }
      }

      this._initialized = true;
    } catch (error) {
      console.error('Failed to initialize DataStore:', error);
      // Don't throw on initialization failure, just mark as initialized
      this._initialized = true;
    }
  }

  static async loadData(): Promise<DataStoreV2> {
    try {
      await this.initializeDataStore();
      
      const fileContent = await RNFS.readFile(this.DATA_FILE_PATH, 'utf8');
      const data = JSON.parse(fileContent);
      
      return this.parseDataStore(data);
    } catch (error) {
      console.error('Failed to load data, returning empty store:', error);
      return this.getEmptyDataStore();
    }
  }

  static async saveData(dataStore: DataStoreV2): Promise<void> {
    try {
      const serializedData = this.serializeDataStore(dataStore);
      await RNFS.writeFile(this.DATA_FILE_PATH, JSON.stringify(serializedData, null, 2), 'utf8');
    } catch (error) {
      throw new Error(`Failed to save data: ${error}`);
    }
  }

  // Account Management
  static async createAccount(params: CreateDebtAccountParams): Promise<DebtAccount> {
    const dataStore = await this.loadData();
    
    const newAccount: DebtAccount = {
      id: this.generateId('acc'),
      name: params.name,
      type: params.type,
      institution: params.institution,
      accountNumber: params.accountNumber,
      dueDate: params.dueDate,
      createdDate: new Date(),
      lastUpdated: new Date()
    };
    
    dataStore.accounts.push(newAccount);
    dataStore.metadata.lastUpdated = new Date();
    await this.saveData(dataStore);
    
    return newAccount;
  }

  static async getAccount(accountId: string): Promise<DebtAccount | null> {
    const dataStore = await this.loadData();
    return dataStore.accounts.find(account => account.id === accountId) || null;
  }

  static async getAllAccounts(): Promise<DebtAccount[]> {
    const dataStore = await this.loadData();
    return dataStore.accounts;
  }

  static async updateAccount(params: UpdateDebtAccountParams): Promise<DebtAccount | null> {
    const dataStore = await this.loadData();
    const accountIndex = dataStore.accounts.findIndex(account => account.id === params.id);
    
    if (accountIndex === -1) {
      return null;
    }
    
    const existingAccount = dataStore.accounts[accountIndex];
    const updatedAccount: DebtAccount = {
      ...existingAccount,
      name: params.name !== undefined ? params.name : existingAccount.name,
      type: params.type !== undefined ? params.type : existingAccount.type,
      institution: params.institution !== undefined ? params.institution : existingAccount.institution,
      accountNumber: params.accountNumber !== undefined ? params.accountNumber : existingAccount.accountNumber,
      dueDate: params.dueDate !== undefined ? params.dueDate : existingAccount.dueDate,
      lastUpdated: new Date()
    };
    
    dataStore.accounts[accountIndex] = updatedAccount;
    dataStore.metadata.lastUpdated = new Date();
    await this.saveData(dataStore);
    
    return updatedAccount;
  }

  static async deleteAccount(accountId: string): Promise<boolean> {
    const dataStore = await this.loadData();
    const initialLength = dataStore.accounts.length;
    
    // Delete related data
    dataStore.accounts = dataStore.accounts.filter(account => account.id !== accountId);
    dataStore.balances = dataStore.balances.filter(balance => balance.accountId !== accountId);
    dataStore.statements = dataStore.statements.filter(statement => statement.accountId !== accountId);
    
    if (dataStore.accounts.length < initialLength) {
      dataStore.metadata.lastUpdated = new Date();
      await this.saveData(dataStore);
      return true;
    }
    
    return false;
  }

  // Balance Management
  static async createBalance(params: CreateDebtBalanceParams): Promise<DebtBalance> {
    const dataStore = await this.loadData();
    
    const newBalance: DebtBalance = {
      id: this.generateId('bal'),
      accountId: params.accountId,
      balance: params.balance,
      minimumPayment: params.minimumPayment,
      interestRate: params.interestRate,
      creditLimit: params.creditLimit,
      availableCredit: params.availableCredit,
      balanceDate: params.balanceDate || new Date(),
      lastUpdated: new Date()
    };
    
    dataStore.balances.push(newBalance);
    dataStore.metadata.lastUpdated = new Date();
    await this.saveData(dataStore);
    
    return newBalance;
  }

  static async getCurrentBalance(accountId: string): Promise<DebtBalance | null> {
    const dataStore = await this.loadData();
    const accountBalances = dataStore.balances
      .filter(balance => balance.accountId === accountId)
      .sort((a, b) => b.balanceDate.getTime() - a.balanceDate.getTime());
    
    return accountBalances[0] || null;
  }

  static async getBalanceHistory(accountId: string, limit?: number): Promise<DebtBalance[]> {
    const dataStore = await this.loadData();
    const accountBalances = dataStore.balances
      .filter(balance => balance.accountId === accountId)
      .sort((a, b) => b.balanceDate.getTime() - a.balanceDate.getTime());
    
    return limit ? accountBalances.slice(0, limit) : accountBalances;
  }

  static async updateBalance(params: UpdateDebtBalanceParams): Promise<DebtBalance | null> {
    const dataStore = await this.loadData();
    const balanceIndex = dataStore.balances.findIndex(balance => balance.id === params.id);
    
    if (balanceIndex === -1) {
      return null;
    }
    
    const existingBalance = dataStore.balances[balanceIndex];
    const updatedBalance: DebtBalance = {
      ...existingBalance,
      balance: params.balance ?? existingBalance.balance,
      minimumPayment: params.minimumPayment ?? existingBalance.minimumPayment,
      interestRate: params.interestRate ?? existingBalance.interestRate,
      creditLimit: params.creditLimit ?? existingBalance.creditLimit,
      availableCredit: params.availableCredit ?? existingBalance.availableCredit,
      balanceDate: params.balanceDate ?? existingBalance.balanceDate,
      lastUpdated: new Date()
    };
    
    dataStore.balances[balanceIndex] = updatedBalance;
    dataStore.metadata.lastUpdated = new Date();
    await this.saveData(dataStore);
    
    return updatedBalance;
  }

  // Statement Management  
  static async addStatement(statement: any): Promise<void> {
    await this.createStatement({
      accountId: statement.debtId,
      statementDate: statement.statementDate,
      dueDate: statement.dueDate,
      balance: statement.balance,
      minimumPayment: statement.minimumPayment,
      interestCharged: statement.interestCharged,
      creditLimit: statement.creditLimit,
      availableCredit: statement.availableCredit,
      interestRate: statement.interestRate,
      transactions: statement.purchases.map((p: any) => ({
        date: p.date,
        amount: p.amount,
        description: p.description,
        category: p.category,
        type: 'purchase' as any
      })),
      payments: statement.payments.map((p: any) => ({
        date: p.date,
        amount: p.amount,
        description: p.description,
        type: 'payment' as any
      }))
    });
  }

  static async createStatement(params: CreateFinancialStatementParams): Promise<FinancialStatement> {
    const dataStore = await this.loadData();
    
    const newStatement: FinancialStatement = {
      id: this.generateId('stmt'),
      accountId: params.accountId,
      documentId: params.documentId,
      statementDate: params.statementDate,
      dueDate: params.dueDate,
      balance: params.balance,
      minimumPayment: params.minimumPayment,
      interestCharged: params.interestCharged,
      creditLimit: params.creditLimit,
      availableCredit: params.availableCredit,
      interestRate: params.interestRate,
      transactions: (params.transactions || []).map(t => ({
        ...t,
        id: this.generateId('txn')
      })),
      payments: (params.payments || []).map(p => ({
        ...p,
        id: this.generateId('pay')
      })),
      importedDate: new Date(),
      lastUpdated: new Date()
    };
    
    dataStore.statements.push(newStatement);
    dataStore.metadata.lastUpdated = new Date();
    await this.saveData(dataStore);
    
    return newStatement;
  }

  static async getStatements(accountId?: string): Promise<any[]> {
    const dataStore = await this.loadData();
    const statements = accountId 
      ? dataStore.statements.filter(s => s.accountId === accountId)
      : dataStore.statements;
    
    // Return in legacy format
    return statements.map(s => ({
      id: s.id,
      debtId: s.accountId,
      statementDate: s.statementDate,
      balance: s.balance,
      minimumPayment: s.minimumPayment,
      dueDate: s.dueDate,
      interestCharged: s.interestCharged,
      payments: s.payments.map(p => ({
        date: p.date,
        amount: p.amount,
        description: p.description
      })),
      purchases: s.transactions.map(t => ({
        date: t.date,
        amount: t.amount,
        description: t.description,
        category: t.category
      })),
      fileName: '',
      imported: s.importedDate,
      creditLimit: s.creditLimit,
      availableCredit: s.availableCredit,
      interestRate: s.interestRate
    }));
  }

  // Composite Operations
  static async getAccountWithCurrentBalance(accountId: string): Promise<DebtAccountBalance | null> {
    const account = await this.getAccount(accountId);
    const balance = await this.getCurrentBalance(accountId);
    
    if (!account || !balance) {
      return null;
    }
    
    return { account, balance };
  }

  static async getAllAccountsWithBalances(): Promise<DebtAccountBalance[]> {
    const accounts = await this.getAllAccounts();
    const results: DebtAccountBalance[] = [];
    
    for (const account of accounts) {
      const balance = await this.getCurrentBalance(account.id);
      if (balance) {
        results.push({ account, balance });
      }
    }
    
    return results;
  }

  static async createAccountWithInitialBalance(
    accountParams: CreateDebtAccountParams,
    balanceParams: Omit<CreateDebtBalanceParams, 'accountId'>
  ): Promise<DebtAccountBalance> {
    const account = await this.createAccount(accountParams);
    const balance = await this.createBalance({
      ...balanceParams,
      accountId: account.id
    });
    
    return { account, balance };
  }

  // Legacy compatibility methods (to replace old DataStoreService)
  static async addDebt(params: any): Promise<any> {
    let account: DebtAccount;
    
    // Check if this is a full debt object with existing ID or creation params
    if (params.id && typeof params.id === 'string' && !params.id.startsWith('acc_')) {
      // This is a legacy debt object with custom ID, create account with that ID
      const dataStore = await this.loadData();
      account = {
        id: params.id,
        name: params.name,
        type: params.type,
        institution: params.institution || 'Unknown',
        accountNumber: params.accountNumber,
        dueDate: params.dueDate,
        createdDate: new Date(),
        lastUpdated: params.lastUpdated || new Date()
      };
      
      dataStore.accounts.push(account);
      dataStore.metadata.lastUpdated = new Date();
      await this.saveData(dataStore);
    } else {
      // Use normal creation flow
      account = await this.createAccount({
        name: params.name,
        type: params.type,
        institution: params.institution || 'Unknown',
        accountNumber: params.accountNumber,
        dueDate: params.dueDate
      });
    }

    const balance = await this.createBalance({
      accountId: account.id,
      balance: params.balance,
      minimumPayment: params.minimumPayment,
      interestRate: params.interestRate
    });

    // Return legacy format
    return {
      id: account.id,
      name: account.name,
      type: account.type,
      balance: balance.balance,
      minimumPayment: balance.minimumPayment,
      interestRate: balance.interestRate,
      lastUpdated: balance.lastUpdated,
      institution: account.institution,
      accountNumber: account.accountNumber,
      dueDate: account.dueDate
    };
  }

  static async getDebts(): Promise<any[]> {
    const accountsWithBalances = await this.getAllAccountsWithBalances();
    return accountsWithBalances.map(({ account, balance }) => ({
      id: account.id,
      name: account.name,
      type: account.type,
      balance: balance.balance,
      minimumPayment: balance.minimumPayment,
      interestRate: balance.interestRate,
      lastUpdated: balance.lastUpdated,
      institution: account.institution,
      accountNumber: account.accountNumber,
      dueDate: account.dueDate
    }));
  }

  static async getDebt(debtId: string): Promise<any | null> {
    const accountWithBalance = await this.getAccountWithCurrentBalance(debtId);
    if (!accountWithBalance) {
      return null;
    }

    const { account, balance } = accountWithBalance;
    return {
      id: account.id,
      name: account.name,
      type: account.type,
      balance: balance.balance,
      minimumPayment: balance.minimumPayment,
      interestRate: balance.interestRate,
      lastUpdated: balance.lastUpdated,
      institution: account.institution,
      accountNumber: account.accountNumber,
      dueDate: account.dueDate
    };
  }

  static async updateDebt(params: any): Promise<any | null> {
    const updatedAccount = await this.updateAccount({
      id: params.id,
      name: params.name,
      type: params.type,
      institution: params.institution,
      accountNumber: params.accountNumber,
      dueDate: params.dueDate
    });

    if (!updatedAccount) {
      return null;
    }

    // Update balance if provided - create new balance record for current state
    if (params.balance !== undefined || params.minimumPayment !== undefined || params.interestRate !== undefined) {
      const currentBalance = await this.getCurrentBalance(params.id);
      if (currentBalance) {
        // Create a new balance record with updated values
        await this.createBalance({
          accountId: params.id,
          balance: params.balance !== undefined ? params.balance : currentBalance.balance,
          minimumPayment: params.minimumPayment !== undefined ? params.minimumPayment : currentBalance.minimumPayment,
          interestRate: params.interestRate !== undefined ? params.interestRate : currentBalance.interestRate,
          creditLimit: currentBalance.creditLimit,
          availableCredit: currentBalance.availableCredit,
          balanceDate: new Date()
        });
      } else if (params.balance !== undefined && params.minimumPayment !== undefined && params.interestRate !== undefined) {
        // Create initial balance if none exists
        await this.createBalance({
          accountId: params.id,
          balance: params.balance,
          minimumPayment: params.minimumPayment,
          interestRate: params.interestRate,
          balanceDate: new Date()
        });
      }
    }

    return await this.getDebt(params.id);
  }

  static async deleteDebt(debtId: string): Promise<boolean> {
    return await this.deleteAccount(debtId);
  }

  // Settings Management
  static async getSettings(): Promise<DataStoreV2['settings']> {
    const dataStore = await this.loadData();
    return dataStore.settings;
  }

  static async updateSettings(settings: Partial<DataStoreV2['settings']>): Promise<void> {
    const dataStore = await this.loadData();
    
    dataStore.settings = {
      ...dataStore.settings,
      ...settings
    };
    
    dataStore.metadata.lastUpdated = new Date();
    await this.saveData(dataStore);
  }

  // Data Export/Import
  static async exportData(): Promise<string> {
    const dataStore = await this.loadData();
    return JSON.stringify(dataStore, null, 2);
  }

  static async importData(jsonData: string): Promise<void> {
    try {
      const rawData = JSON.parse(jsonData);
      
      // Validate the imported data structure
      if (!rawData.version || !rawData.accounts || !rawData.balances) {
        throw new Error('Invalid data format');
      }
      
      // Parse and validate the data properly
      const data = this.parseDataStore(rawData);
      await this.saveData(data);
    } catch (error) {
      throw new Error(`Failed to import data: ${error}`);
    }
  }

  // Private helper methods
  private static parseDataStore(data: any): DataStoreV2 {
    return {
      version: data.version || CURRENT_DATA_VERSION,
      accounts: (data.accounts || []).map((a: any) => ({
        ...a,
        createdDate: new Date(a.createdDate),
        lastUpdated: new Date(a.lastUpdated)
      })),
      balances: (data.balances || []).map((b: any) => ({
        ...b,
        balanceDate: new Date(b.balanceDate),
        lastUpdated: new Date(b.lastUpdated)
      })),
      documents: (data.documents || []).map((d: any) => ({
        ...d,
        uploadDate: new Date(d.uploadDate),
        lastModified: new Date(d.lastModified)
      })),
      statements: (data.statements || []).map((s: any) => ({
        ...s,
        statementDate: new Date(s.statementDate),
        dueDate: new Date(s.dueDate),
        transactions: (s.transactions || []).map((t: any) => ({
          ...t,
          date: new Date(t.date)
        })),
        payments: (s.payments || []).map((p: any) => ({
          ...p,
          date: new Date(p.date)
        })),
        importedDate: new Date(s.importedDate),
        lastUpdated: new Date(s.lastUpdated)
      })),
      settings: {
        ...DEFAULT_SETTINGS,
        ...data.settings
      },
      metadata: {
        createdDate: new Date(data.metadata?.createdDate || new Date()),
        lastUpdated: new Date(data.metadata?.lastUpdated || new Date()),
        dataVersion: data.metadata?.dataVersion || CURRENT_DATA_VERSION,
        migratedFrom: data.metadata?.migratedFrom,
        totalMigrations: data.metadata?.totalMigrations || 0
      }
    };
  }

  private static serializeDataStore(dataStore: DataStoreV2): any {
    return {
      version: dataStore.version,
      accounts: dataStore.accounts.map(a => ({
        ...a,
        createdDate: a.createdDate.toISOString(),
        lastUpdated: a.lastUpdated.toISOString()
      })),
      balances: dataStore.balances.map(b => ({
        ...b,
        balanceDate: b.balanceDate.toISOString(),
        lastUpdated: b.lastUpdated.toISOString()
      })),
      documents: dataStore.documents.map(d => ({
        ...d,
        uploadDate: d.uploadDate.toISOString(),
        lastModified: d.lastModified.toISOString()
      })),
      statements: dataStore.statements.map(s => ({
        ...s,
        statementDate: s.statementDate.toISOString(),
        dueDate: s.dueDate.toISOString(),
        transactions: s.transactions.map(t => ({
          ...t,
          date: t.date.toISOString()
        })),
        payments: s.payments.map(p => ({
          ...p,
          date: p.date.toISOString()
        })),
        importedDate: s.importedDate.toISOString(),
        lastUpdated: s.lastUpdated.toISOString()
      })),
      settings: dataStore.settings,
      metadata: {
        ...dataStore.metadata,
        createdDate: dataStore.metadata.createdDate.toISOString(),
        lastUpdated: dataStore.metadata.lastUpdated.toISOString()
      }
    };
  }

  private static getEmptyDataStore(): DataStoreV2 {
    return {
      version: CURRENT_DATA_VERSION,
      accounts: [],
      balances: [],
      documents: [],
      statements: [],
      settings: { ...DEFAULT_SETTINGS },
      metadata: {
        createdDate: new Date(),
        lastUpdated: new Date(),
        dataVersion: CURRENT_DATA_VERSION,
        totalMigrations: 0
      }
    };
  }

  private static generateId(prefix: string = 'id'): string {
    return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).substr(2)}`;
  }
}