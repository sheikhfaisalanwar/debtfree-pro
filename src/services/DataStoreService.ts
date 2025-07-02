import RNFS from 'react-native-fs';
import { Debt, DebtType } from '../types/Debt';
import { Statement } from '../types/Statement';

export interface DataStore {
  debts: Debt[];
  statements: Statement[];
  settings: {
    extraPayment: number;
    strategy: 'SNOWBALL' | 'AVALANCHE';
    currency: string;
  };
}

export interface CreateDebtParams {
  name: string;
  type: DebtType;
  balance: number;
  minimumPayment: number;
  interestRate: number;
  institution: string;
}

export interface UpdateDebtParams {
  id: string;
  name?: string;
  type?: DebtType;
  balance?: number;
  minimumPayment?: number;
  interestRate?: number;
  institution?: string;
  accountNumber?: string;
  dueDate?: number;
}

export class DataStoreService {
  private static readonly DATA_FILE_PATH = `${RNFS.DocumentDirectoryPath}/debts.json`;
  private static readonly INITIAL_DATA_PATH = 'src/data/debts.json';

  static async initializeDataStore(): Promise<void> {
    try {
      const exists = await RNFS.exists(this.DATA_FILE_PATH);
      
      if (!exists) {
        const initialData = require('../data/debts.json');
        await RNFS.writeFile(this.DATA_FILE_PATH, JSON.stringify(initialData, null, 2), 'utf8');
      }
    } catch (error) {
      throw new Error(`Failed to initialize data store: ${error}`);
    }
  }

  static async loadData(): Promise<DataStore> {
    try {
      await this.initializeDataStore();
      
      const fileContent = await RNFS.readFile(this.DATA_FILE_PATH, 'utf8');
      const data = JSON.parse(fileContent);
      
      return {
        debts: data.debts.map(this.parseDebt),
        statements: data.statements.map(this.parseStatement),
        settings: data.settings || {
          extraPayment: 100,
          strategy: 'SNOWBALL',
          currency: 'CAD'
        }
      };
    } catch (error) {
      console.error('Failed to load data, returning empty store:', error);
      return this.getEmptyDataStore();
    }
  }

  static async saveData(dataStore: DataStore): Promise<void> {
    try {
      const serializedData = {
        debts: dataStore.debts.map(this.serializeDebt),
        statements: dataStore.statements.map(this.serializeStatement),
        settings: dataStore.settings
      };
      
      await RNFS.writeFile(this.DATA_FILE_PATH, JSON.stringify(serializedData, null, 2), 'utf8');
    } catch (error) {
      throw new Error(`Failed to save data: ${error}`);
    }
  }

  static async addDebt(params: CreateDebtParams): Promise<Debt>;
  static async addDebt(debt: Debt): Promise<Debt>;
  static async addDebt(input: CreateDebtParams | Debt): Promise<Debt> {
    const dataStore = await this.loadData();
    
    let newDebt: Debt;
    
    // Check if input is a full Debt object or CreateDebtParams
    if ('id' in input && input.id) {
      // Full Debt object provided
      newDebt = {
        ...input,
        lastUpdated: new Date()
      };
    } else {
      // CreateDebtParams provided
      const params = input as CreateDebtParams;
      newDebt = {
        id: this.generateId(),
        name: params.name,
        type: params.type,
        balance: params.balance,
        minimumPayment: params.minimumPayment,
        interestRate: params.interestRate,
        lastUpdated: new Date(),
        institution: params.institution
      };
    }
    
    dataStore.debts.push(newDebt);
    await this.saveData(dataStore);
    
    return newDebt;
  }

  static async updateDebt(params: UpdateDebtParams): Promise<Debt | null> {
    const dataStore = await this.loadData();
    const debtIndex = dataStore.debts.findIndex(debt => debt.id === params.id);
    
    if (debtIndex === -1) {
      return null;
    }
    
    const existingDebt = dataStore.debts[debtIndex];
    const updatedDebt: Debt = {
      ...existingDebt,
      name: params.name ?? existingDebt.name,
      type: params.type ?? existingDebt.type,
      balance: params.balance ?? existingDebt.balance,
      minimumPayment: params.minimumPayment ?? existingDebt.minimumPayment,
      interestRate: params.interestRate ?? existingDebt.interestRate,
      institution: params.institution ?? existingDebt.institution,
      accountNumber: params.accountNumber ?? existingDebt.accountNumber,
      dueDate: params.dueDate ?? existingDebt.dueDate,
      lastUpdated: new Date()
    };
    
    dataStore.debts[debtIndex] = updatedDebt;
    await this.saveData(dataStore);
    
    return updatedDebt;
  }

  static async deleteDebt(debtId: string): Promise<boolean> {
    const dataStore = await this.loadData();
    const initialLength = dataStore.debts.length;
    
    dataStore.debts = dataStore.debts.filter(debt => debt.id !== debtId);
    dataStore.statements = dataStore.statements.filter(statement => statement.debtId !== debtId);
    
    if (dataStore.debts.length < initialLength) {
      await this.saveData(dataStore);
      return true;
    }
    
    return false;
  }

  static async addStatement(statement: Statement): Promise<void> {
    const dataStore = await this.loadData();
    
    const existingIndex = dataStore.statements.findIndex(s => s.id === statement.id);
    
    if (existingIndex !== -1) {
      dataStore.statements[existingIndex] = statement;
    } else {
      dataStore.statements.push(statement);
    }
    
    await this.saveData(dataStore);
  }

  static async getStatements(debtId?: string): Promise<Statement[]> {
    const dataStore = await this.loadData();
    
    if (debtId) {
      return dataStore.statements.filter(statement => statement.debtId === debtId);
    }
    
    return dataStore.statements;
  }

  static async updateSettings(settings: Partial<DataStore['settings']>): Promise<void> {
    const dataStore = await this.loadData();
    
    dataStore.settings = {
      ...dataStore.settings,
      ...settings
    };
    
    await this.saveData(dataStore);
  }

  static async getDebts(): Promise<Debt[]> {
    const dataStore = await this.loadData();
    return dataStore.debts;
  }

  static async getDebt(debtId: string): Promise<Debt | null> {
    const dataStore = await this.loadData();
    return dataStore.debts.find(debt => debt.id === debtId) || null;
  }

  static async getSettings(): Promise<DataStore['settings']> {
    const dataStore = await this.loadData();
    return dataStore.settings;
  }

  private static parseDebt(debtData: any): Debt {
    return {
      id: debtData.id,
      name: debtData.name,
      type: debtData.type as DebtType,
      balance: debtData.balance,
      minimumPayment: debtData.minimumPayment,
      interestRate: debtData.interestRate,
      lastUpdated: new Date(debtData.lastUpdated),
      institution: debtData.institution,
      accountNumber: debtData.accountNumber,
      dueDate: debtData.dueDate
    };
  }

  private static serializeDebt(debt: Debt): any {
    return {
      id: debt.id,
      name: debt.name,
      type: debt.type,
      balance: debt.balance,
      minimumPayment: debt.minimumPayment,
      interestRate: debt.interestRate,
      lastUpdated: debt.lastUpdated.toISOString(),
      institution: debt.institution,
      accountNumber: debt.accountNumber,
      dueDate: debt.dueDate
    };
  }

  private static parseStatement(statementData: any): Statement {
    return {
      id: statementData.id,
      debtId: statementData.debtId,
      statementDate: new Date(statementData.statementDate),
      balance: statementData.balance,
      minimumPayment: statementData.minimumPayment,
      dueDate: new Date(statementData.dueDate),
      interestCharged: statementData.interestCharged,
      payments: statementData.payments.map((p: any) => ({
        date: new Date(p.date),
        amount: p.amount,
        description: p.description
      })),
      purchases: statementData.purchases.map((p: any) => ({
        date: new Date(p.date),
        amount: p.amount,
        description: p.description,
        category: p.category
      })),
      fileName: statementData.fileName,
      imported: new Date(statementData.imported)
    };
  }

  private static serializeStatement(statement: Statement): any {
    return {
      id: statement.id,
      debtId: statement.debtId,
      statementDate: statement.statementDate.toISOString(),
      balance: statement.balance,
      minimumPayment: statement.minimumPayment,
      dueDate: statement.dueDate.toISOString(),
      interestCharged: statement.interestCharged,
      payments: statement.payments.map(p => ({
        date: p.date.toISOString(),
        amount: p.amount,
        description: p.description
      })),
      purchases: statement.purchases.map(p => ({
        date: p.date.toISOString(),
        amount: p.amount,
        description: p.description,
        category: p.category
      })),
      fileName: statement.fileName,
      imported: statement.imported.toISOString()
    };
  }

  private static getEmptyDataStore(): DataStore {
    return {
      debts: [],
      statements: [],
      settings: {
        extraPayment: 100,
        strategy: 'SNOWBALL',
        currency: 'CAD'
      }
    };
  }

  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  static async exportData(): Promise<string> {
    const dataStore = await this.loadData();
    return JSON.stringify(dataStore, null, 2);
  }

  static async importData(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData);
      
      const validatedData: DataStore = {
        debts: (data.debts || []).map(this.parseDebt),
        statements: (data.statements || []).map(this.parseStatement),
        settings: {
          extraPayment: data.settings?.extraPayment || 100,
          strategy: data.settings?.strategy || 'SNOWBALL',
          currency: data.settings?.currency || 'CAD'
        }
      };
      
      await this.saveData(validatedData);
    } catch (error) {
      throw new Error(`Failed to import data: ${error}`);
    }
  }
}