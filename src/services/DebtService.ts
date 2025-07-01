import { Debt } from '../types/Debt';
import { PayoffStrategy, StrategyType, DebtPayoffPlan, ConsolidationOpportunity } from '../types/Strategy';

export class DebtService {
  static calculateSnowballStrategy(debts: Debt[], extraPayment: number = 0): PayoffStrategy {
    // Sort debts by balance (smallest first) for snowball method
    const sortedDebts = [...debts].sort((a, b) => a.balance - b.balance);
    
    const plans: DebtPayoffPlan[] = [];
    const totalMinimumPayment = debts.reduce((sum, debt) => sum + debt.minimumPayment, 0);
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
    
    return {
      id: `snowball-${Date.now()}`,
      name: 'Debt Snowball',
      type: StrategyType.SNOWBALL,
      debts: plans,
      totalInterestSaved: 0, // Calculate vs minimum payments
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
  
  static findConsolidationOpportunities(debts: Debt[]): ConsolidationOpportunity[] {
    // Simple heuristic: consolidate high-interest debts
    const highInterestDebts = debts.filter(debt => debt.interestRate > 15);
    
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
}