export interface Statement {
  id: string;
  debtId: string;
  statementDate: Date;
  balance: number;
  minimumPayment: number;
  dueDate: Date;
  interestCharged: number;
  payments: StatementPayment[];
  purchases: StatementTransaction[];
  fileName?: string;
  imported: Date;
}

export interface StatementPayment {
  date: Date;
  amount: number;
  description: string;
}

export interface StatementTransaction {
  date: Date;
  amount: number;
  description: string;
  category?: string;
}