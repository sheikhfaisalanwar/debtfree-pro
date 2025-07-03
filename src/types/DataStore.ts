import { DebtAccount } from './DebtAccount';
import { DebtBalance } from './DebtBalance';
import { Document } from './Document';
import { FinancialStatement } from './FinancialStatement';

export interface DataStoreV2 {
  version: string;
  accounts: DebtAccount[];
  balances: DebtBalance[];
  documents: Document[];
  statements: FinancialStatement[];
  settings: AppSettings;
  metadata: DataStoreMetadata;
}

export interface AppSettings {
  extraPayment: number;
  strategy: PaymentStrategy;
  currency: string;
  dateFormat: string;
  notifications: NotificationSettings;
}

export enum PaymentStrategy {
  SNOWBALL = 'SNOWBALL',
  AVALANCHE = 'AVALANCHE'
}

export interface NotificationSettings {
  enabled: boolean;
  dueDateReminders: boolean;
  paymentReminders: boolean;
  reminderDays: number;
}

export interface DataStoreMetadata {
  createdDate: Date;
  lastUpdated: Date;
  dataVersion: string;
  migratedFrom?: string;
  totalMigrations: number;
}

// Legacy data store for migration
export interface DataStoreV1 {
  debts: Array<{
    id: string;
    name: string;
    type: string;
    balance: number;
    minimumPayment: number;
    interestRate: number;
    lastUpdated: string;
    accountNumber?: string;
    institution?: string;
    dueDate?: number;
  }>;
  statements: Array<{
    id: string;
    debtId: string;
    statementDate: string;
    balance: number;
    minimumPayment: number;
    dueDate: string;
    interestCharged: number;
    payments: Array<{
      date: string;
      amount: number;
      description: string;
    }>;
    purchases: Array<{
      date: string;
      amount: number;
      description: string;
      category?: string;
    }>;
    fileName?: string;
    imported: string;
    creditLimit?: number;
    availableCredit?: number;
    interestRate?: number;
  }>;
  settings: {
    extraPayment: number;
    strategy: 'SNOWBALL' | 'AVALANCHE';
    currency: string;
  };
}

export const DEFAULT_SETTINGS: AppSettings = {
  extraPayment: 100,
  strategy: PaymentStrategy.SNOWBALL,
  currency: 'CAD',
  dateFormat: 'YYYY-MM-DD',
  notifications: {
    enabled: true,
    dueDateReminders: true,
    paymentReminders: true,
    reminderDays: 3
  }
};

export const CURRENT_DATA_VERSION = '2.0.0';