import { DebtAccountBalance } from '../types/DebtAccount';
import { PayoffStrategy, StrategyType, DebtPayoffPlan, ConsolidationOpportunity } from '../types/Strategy';

// Legacy interface for backward compatibility
interface LegacyDebt {
  id: string;
  name: string;
  balance: number;
  minimumPayment: number;
  interestRate: number;
}

export class DebtService {
  static calculateSnowballStrategy(debts: DebtAccountBalance[] | LegacyDebt[], extraPayment: number = 0): PayoffStrategy {
    // Convert to legacy format for processing
    const legacyDebts: LegacyDebt[] = debts.map(debt => {
      if ('account' in debt && 'balance' in debt) {
        // New format
        return {
          id: debt.account.id,
          name: debt.account.name,
          balance: debt.balance.balance,
          minimumPayment: debt.balance.minimumPayment,
          interestRate: debt.balance.interestRate
        };
      } else {
        // Legacy format
        return debt as LegacyDebt;
      }
    });
    
    // Sort debts by balance (smallest first) for snowball method
    const sortedDebts = [...legacyDebts].sort((a, b) => a.balance - b.balance);
    
    const plans: DebtPayoffPlan[] = [];
    const totalMinimumPayment = legacyDebts.reduce((sum, debt) => sum + debt.minimumPayment, 0);
    const totalMonthlyPayment = totalMinimumPayment + extraPayment;
    
    let availableExtra = extraPayment;
    let currentDate = new Date();
    
    sortedDebts.forEach((debt, index) => {
      const monthlyPayment = debt.minimumPayment + (index === 0 ? availableExtra : 0);
      const payoffMonths = this.calculatePayoffTime(debt.balance, monthlyPayment, debt.interestRate);
      const payoffDate = new Date(currentDate);
      payoffDate.setMonth(payoffDate.getMonth() + payoffMonths);
      
      const totalInterest = this.calculateTotalInterest(debt.balance, monthlyPayment, debt.interestRate);
      
      plans.push({
        debtId: debt.id,
        payoffOrder: index + 1,
        monthlyPayment,
        payoffDate,
        totalInterest,
        isPriority: index === 0
      });
      
      // After first debt is paid off, add its payment to the extra amount
      if (index === 0) {
        availableExtra += debt.minimumPayment;
        currentDate = payoffDate;
      }
    });
    
    const finalPayoffDate = new Date(Math.max(...plans.map(p => p.payoffDate.getTime())));
    
    // Calculate total interest saved vs minimum payments only
    const minimumOnlyInterest = this.calculateMinimumOnlyInterest(legacyDebts);
    const strategyInterest = plans.reduce((sum, plan) => sum + plan.totalInterest, 0);
    const totalInterestSaved = Math.max(0, minimumOnlyInterest - strategyInterest);
    
    return {
      id: `snowball-${Date.now()}`,
      name: 'Debt Snowball',
      type: StrategyType.SNOWBALL,
      debts: plans,
      totalInterestSaved,
      payoffDate: finalPayoffDate,
      monthlyPayment: totalMonthlyPayment
    };
  }
  
  private static calculatePayoffTime(balance: number, monthlyPayment: number, annualRate: number): number {
    if (monthlyPayment <= 0) return Infinity;
    
    const monthlyRate = annualRate / 100 / 12;
    if (monthlyRate === 0) return Math.ceil(balance / monthlyPayment);
    
    const months = -Math.log(1 - (balance * monthlyRate) / monthlyPayment) / Math.log(1 + monthlyRate);
    return Math.ceil(months);
  }
  
  private static calculateTotalInterest(balance: number, monthlyPayment: number, annualRate: number): number {
    const months = this.calculatePayoffTime(balance, monthlyPayment, annualRate);
    return Math.max(0, (monthlyPayment * months) - balance);
  }
  
  static findConsolidationOpportunities(debts: DebtAccountBalance[] | LegacyDebt[]): ConsolidationOpportunity[] {
    // Convert to legacy format for processing
    const legacyDebts: LegacyDebt[] = debts.map(debt => {
      if ('account' in debt && 'balance' in debt) {
        return {
          id: debt.account.id,
          name: debt.account.name,
          balance: debt.balance.balance,
          minimumPayment: debt.balance.minimumPayment,
          interestRate: debt.balance.interestRate
        };
      } else {
        return debt as LegacyDebt;
      }
    });
    
    // Simple heuristic: consolidate high-interest debts
    const highInterestDebts = legacyDebts.filter(debt => debt.interestRate > 15);
    
    if (highInterestDebts.length < 2) return [];
    
    const totalBalance = highInterestDebts.reduce((sum, debt) => sum + debt.balance, 0);
    const weightedAvgRate = highInterestDebts.reduce((sum, debt) => 
      sum + (debt.interestRate * debt.balance), 0) / totalBalance;
    
    // Assume consolidation loan at 12% (typical personal loan rate)
    const newRate = 12;
    const timeSavings = 6; // Estimate
    
    if (newRate < weightedAvgRate) {
      return [{
        id: `consolidation-${Date.now()}`,
        targetDebts: highInterestDebts.map(d => d.id),
        newLoanAmount: totalBalance,
        newInterestRate: newRate,
        newMonthlyPayment: totalBalance * 0.02, // Rough estimate
        interestSavings: (weightedAvgRate - newRate) * totalBalance / 100,
        timeSavings,
        provider: 'Personal Loan'
      }];
    }
    
    return [];
  }
  
  private static calculateMinimumOnlyInterest(debts: LegacyDebt[]): number {
    return debts.reduce((total, debt) => {
      const payoffMonths = this.calculatePayoffTime(debt.balance, debt.minimumPayment, debt.interestRate);
      const totalPayments = debt.minimumPayment * payoffMonths;
      const interest = totalPayments - debt.balance;
      return total + interest;
    }, 0);
  }
  
  static calculateProgress(debts: DebtAccountBalance[] | LegacyDebt[], strategy?: PayoffStrategy): number {
    if (!debts.length) return 0;
    
    const legacyDebts: LegacyDebt[] = debts.map(debt => {
      if ('account' in debt && 'balance' in debt) {
        return {
          id: debt.account.id,
          name: debt.account.name,
          balance: debt.balance.balance,
          minimumPayment: debt.balance.minimumPayment,
          interestRate: debt.balance.interestRate
        };
      } else {
        return debt as LegacyDebt;
      }
    });
    
    // Calculate progress based on how much debt has been paid off
    // This would require historical data, so for now we'll calculate based on strategy timeline
    if (strategy && strategy.payoffDate) {
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1); // Assume started last month
      const totalDuration = strategy.payoffDate.getTime() - startDate.getTime();
      const elapsed = today.getTime() - startDate.getTime();
      const progress = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
      return Math.round(progress);
    }
    
    return 0;
  }
  
  static calculateDebtFreeDate(strategy?: PayoffStrategy): string {
    if (!strategy || !strategy.payoffDate) {
      return 'Calculate strategy';
    }
    
    const today = new Date();
    const payoffDate = strategy.payoffDate;
    const monthsDiff = (payoffDate.getFullYear() - today.getFullYear()) * 12 + 
                      (payoffDate.getMonth() - today.getMonth());
    
    if (monthsDiff <= 0) {
      return 'Debt free!';
    } else if (monthsDiff < 12) {
      return `${monthsDiff} month${monthsDiff === 1 ? '' : 's'}`;
    } else {
      const years = Math.floor(monthsDiff / 12);
      const remainingMonths = monthsDiff % 12;
      if (remainingMonths === 0) {
        return `${years} year${years === 1 ? '' : 's'}`;
      } else {
        return `${years}.${Math.round(remainingMonths / 12 * 10)} years`;
      }
    }
  }
  
  static formatInterestSavings(strategy?: PayoffStrategy): string {
    if (!strategy || strategy.totalInterestSaved <= 0) {
      return '$0';
    }
    
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      maximumFractionDigits: 0
    }).format(strategy.totalInterestSaved);
  }
}