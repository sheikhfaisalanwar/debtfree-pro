export interface Debt {
  id: string;
  name: string;
  type: DebtType;
  balance: number;
  minimumPayment: number;
  interestRate: number; // Annual percentage rate
  lastUpdated: Date;
  accountNumber?: string;
  institution?: string;
  dueDate?: number; // Day of month
}

export enum DebtType {
  CREDIT_CARD = 'credit_card',
  AUTO_LOAN = 'auto_loan',
  PERSONAL_LOAN = 'personal_loan',
  LINE_OF_CREDIT = 'line_of_credit',
  STUDENT_LOAN = 'student_loan',
  MORTGAGE = 'mortgage',
  OTHER = 'other'
}

export interface DebtPayment {
  debtId: string;
  amount: number;
  date: Date;
  isMinimum: boolean;
}