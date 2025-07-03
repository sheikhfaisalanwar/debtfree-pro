export interface FinancialStatement {
  id: string;
  accountId: string;
  documentId?: string; // Link to source document
  statementDate: Date;
  dueDate: Date;
  balance: number;
  minimumPayment: number;
  interestCharged: number;
  creditLimit?: number;
  availableCredit?: number;
  interestRate?: number;
  transactions: FinancialTransaction[];
  payments: FinancialPayment[];
  importedDate: Date;
  lastUpdated: Date;
}

export interface FinancialTransaction {
  id: string;
  date: Date;
  amount: number;
  description: string;
  category?: string;
  type: TransactionType;
}

export interface FinancialPayment {
  id: string;
  date: Date;
  amount: number;
  description: string;
  type: PaymentType;
}

export enum TransactionType {
  PURCHASE = 'purchase',
  INTEREST = 'interest',
  FEE = 'fee',
  ADJUSTMENT = 'adjustment'
}

export enum PaymentType {
  PAYMENT = 'payment',
  CREDIT = 'credit',
  REFUND = 'refund'
}

export interface CreateFinancialStatementParams {
  accountId: string;
  documentId?: string;
  statementDate: Date;
  dueDate: Date;
  balance: number;
  minimumPayment: number;
  interestCharged: number;
  creditLimit?: number;
  availableCredit?: number;
  interestRate?: number;
  transactions?: Omit<FinancialTransaction, 'id'>[];
  payments?: Omit<FinancialPayment, 'id'>[];
}

export interface UpdateFinancialStatementParams {
  id: string;
  statementDate?: Date;
  dueDate?: Date;
  balance?: number;
  minimumPayment?: number;
  interestCharged?: number;
  creditLimit?: number;
  availableCredit?: number;
  interestRate?: number;
  transactions?: Omit<FinancialTransaction, 'id'>[];
  payments?: Omit<FinancialPayment, 'id'>[];
}

export interface StatementSummary {
  totalTransactions: number;
  totalPayments: number;
  netActivity: number;
  balanceChange: number;
}