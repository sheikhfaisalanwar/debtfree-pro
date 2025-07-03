export interface DebtBalance {
  id: string;
  accountId: string;
  balance: number;
  minimumPayment: number;
  interestRate: number; // Annual percentage rate
  creditLimit?: number;
  availableCredit?: number;
  balanceDate: Date;
  lastUpdated: Date;
}

export interface CreateDebtBalanceParams {
  accountId: string;
  balance: number;
  minimumPayment: number;
  interestRate: number;
  creditLimit?: number;
  availableCredit?: number;
  balanceDate?: Date;
}

export interface UpdateDebtBalanceParams {
  id: string;
  balance?: number;
  minimumPayment?: number;
  interestRate?: number;
  creditLimit?: number;
  availableCredit?: number;
  balanceDate?: Date;
}

import { DebtAccount } from './DebtAccount';

export interface DebtAccountBalance {
  account: DebtAccount;
  balance: DebtBalance;
}