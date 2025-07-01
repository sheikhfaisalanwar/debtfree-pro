export interface PayoffStrategy {
  id: string;
  name: string;
  type: StrategyType;
  debts: DebtPayoffPlan[];
  totalInterestSaved: number;
  payoffDate: Date;
  monthlyPayment: number;
}

export enum StrategyType {
  SNOWBALL = 'snowball', // Smallest balance first
  AVALANCHE = 'avalanche', // Highest interest first
  CUSTOM = 'custom'
}

export interface DebtPayoffPlan {
  debtId: string;
  payoffOrder: number;
  monthlyPayment: number;
  payoffDate: Date;
  totalInterest: number;
  isPriority: boolean;
}

export interface ConsolidationOpportunity {
  id: string;
  targetDebts: string[]; // Debt IDs to consolidate
  newLoanAmount: number;
  newInterestRate: number;
  newMonthlyPayment: number;
  interestSavings: number;
  timeSavings: number; // Months saved
  provider?: string;
  estimatedFees?: number;
}