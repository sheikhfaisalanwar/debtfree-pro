export interface DebtAccount {
  id: string;
  name: string;
  type: DebtAccountType;
  institution: string;
  accountNumber?: string;
  dueDate?: number; // Day of month
  createdDate: Date;
  lastUpdated: Date;
}

export enum DebtAccountType {
  CREDIT_CARD = 'credit_card',
  AUTO_LOAN = 'auto_loan',
  PERSONAL_LOAN = 'personal_loan',
  LINE_OF_CREDIT = 'line_of_credit',
  STUDENT_LOAN = 'student_loan',
  MORTGAGE = 'mortgage',
  OTHER = 'other'
}

export interface CreateDebtAccountParams {
  name: string;
  type: DebtAccountType;
  institution: string;
  accountNumber?: string;
  dueDate?: number;
}

export interface UpdateDebtAccountParams {
  id: string;
  name?: string;
  type?: DebtAccountType;
  institution?: string;
  accountNumber?: string;
  dueDate?: number;
}