import { Statement } from '../types/Statement';
import { DataStoreService } from './DataStoreService';
import { DocumentManagerService } from './DocumentManagerService';

export interface StatementAnalysis {
  newBalance: number;
  balanceChange: number;
  newMinimumPayment: number;
  paymentsMade: number;
  purchasesMade: number;
  interestCharged: number;
  shouldUpdateDebt: boolean;
}

export class StatementProcessingService {
  static async processUploadedStatement(debtId: string): Promise<{
    statement?: Statement;
    analysis?: StatementAnalysis;
    updated: boolean;
    error?: string;
  }> {
    try {
      const result = await DocumentManagerService.uploadAndProcessDocument(debtId);
      
      if (!result.success || !result.statement) {
        return {
          updated: false,
          error: result.error || 'Failed to process statement'
        };
      }

      const analysis = await this.analyzeStatement(result.statement, debtId);
      
      if (analysis.shouldUpdateDebt) {
        await this.updateDebtFromStatement(debtId, analysis);
      }

      return {
        statement: result.statement,
        analysis,
        updated: analysis.shouldUpdateDebt
      };
    } catch (error) {
      return {
        updated: false,
        error: `Statement processing failed: ${error}`
      };
    }
  }

  static async analyzeStatement(statement: Statement, debtId: string): Promise<StatementAnalysis> {
    const currentDebt = await DataStoreService.getDebt(debtId);
    
    if (!currentDebt) {
      throw new Error(`Debt with ID ${debtId} not found`);
    }

    const totalPayments = statement.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const totalPurchases = statement.purchases.reduce((sum, purchase) => sum + purchase.amount, 0);
    
    const balanceChange = statement.balance - currentDebt.balance;
    const shouldUpdateDebt = Math.abs(balanceChange) > 0.01 || 
                           Math.abs(statement.minimumPayment - currentDebt.minimumPayment) > 0.01;

    return {
      newBalance: statement.balance,
      balanceChange,
      newMinimumPayment: statement.minimumPayment || currentDebt.minimumPayment,
      paymentsMade: totalPayments,
      purchasesMade: totalPurchases,
      interestCharged: statement.interestCharged,
      shouldUpdateDebt
    };
  }

  static async updateDebtFromStatement(debtId: string, analysis: StatementAnalysis): Promise<void> {
    await DataStoreService.updateDebt({
      id: debtId,
      balance: analysis.newBalance,
      minimumPayment: analysis.newMinimumPayment
    });
  }

  static async getDebtStatements(debtId: string): Promise<Statement[]> {
    return await DataStoreService.getStatements(debtId);
  }

  static async getStatementHistory(debtId: string, limit?: number): Promise<Statement[]> {
    const statements = await DataStoreService.getStatements(debtId);
    
    const sortedStatements = statements.sort((a, b) => 
      b.statementDate.getTime() - a.statementDate.getTime()
    );
    
    return limit ? sortedStatements.slice(0, limit) : sortedStatements;
  }

  static async calculateDebtTrends(debtId: string): Promise<{
    balanceHistory: Array<{ date: Date; balance: number }>;
    averageMonthlyPayment: number;
    averageMonthlySpending: number;
    payoffProjection?: Date;
  }> {
    const statements = await this.getStatementHistory(debtId);
    
    if (statements.length === 0) {
      const currentDebt = await DataStoreService.getDebt(debtId);
      return {
        balanceHistory: currentDebt ? [{ date: new Date(), balance: currentDebt.balance }] : [],
        averageMonthlyPayment: 0,
        averageMonthlySpending: 0
      };
    }

    const balanceHistory = statements.map(stmt => ({
      date: stmt.statementDate,
      balance: stmt.balance
    }));

    const totalPayments = statements.reduce((sum, stmt) => 
      sum + stmt.payments.reduce((pSum, payment) => pSum + payment.amount, 0), 0
    );
    
    const totalSpending = statements.reduce((sum, stmt) => 
      sum + stmt.purchases.reduce((pSum, purchase) => pSum + purchase.amount, 0), 0
    );

    const averageMonthlyPayment = statements.length > 0 ? totalPayments / statements.length : 0;
    const averageMonthlySpending = statements.length > 0 ? totalSpending / statements.length : 0;

    let payoffProjection: Date | undefined;
    if (averageMonthlyPayment > averageMonthlySpending && statements.length > 0) {
      const currentBalance = statements[0].balance;
      const netPaydown = averageMonthlyPayment - averageMonthlySpending;
      
      if (netPaydown > 0) {
        const monthsToPayoff = Math.ceil(currentBalance / netPaydown);
        payoffProjection = new Date();
        payoffProjection.setMonth(payoffProjection.getMonth() + monthsToPayoff);
      }
    }

    return {
      balanceHistory,
      averageMonthlyPayment,
      averageMonthlySpending,
      payoffProjection
    };
  }

  static formatAnalysisSummary(analysis: StatementAnalysis): string {
    const parts: string[] = [];
    
    if (analysis.balanceChange > 0) {
      parts.push(`📈 Balance increased by $${analysis.balanceChange.toFixed(2)}`);
    } else if (analysis.balanceChange < 0) {
      parts.push(`📉 Balance decreased by $${Math.abs(analysis.balanceChange).toFixed(2)}`);
    } else {
      parts.push(`📊 Balance unchanged`);
    }
    
    parts.push(`💳 Purchases: $${analysis.purchasesMade.toFixed(2)}`);
    parts.push(`💰 Payments: $${analysis.paymentsMade.toFixed(2)}`);
    
    if (analysis.interestCharged > 0) {
      parts.push(`💸 Interest: $${analysis.interestCharged.toFixed(2)}`);
    }
    
    if (analysis.shouldUpdateDebt) {
      parts.push(`🔄 Debt information updated`);
    }
    
    return parts.join(' • ');
  }

  static async linkStatementToDebt(statementId: string, debtId: string): Promise<boolean> {
    try {
      const statements = await DataStoreService.getStatements();
      const statement = statements.find(s => s.id === statementId);
      
      if (!statement) {
        return false;
      }

      const updatedStatement: Statement = {
        ...statement,
        debtId
      };

      await DataStoreService.addStatement(updatedStatement);
      return true;
    } catch (error) {
      console.error('Failed to link statement to debt:', error);
      return false;
    }
  }

  static async detectPotentialDebtMatches(statement: Statement): Promise<Array<{
    debtId: string;
    debtName: string;
    confidence: number;
    reasons: string[];
  }>> {
    const allDebts = await DataStoreService.getDebts();
    const matches: Array<{ debtId: string; debtName: string; confidence: number; reasons: string[] }> = [];

    for (const debt of allDebts) {
      let confidence = 0;
      const reasons: string[] = [];

      const balanceDiff = Math.abs(debt.balance - statement.balance);
      if (balanceDiff < debt.balance * 0.1) {
        confidence += 30;
        reasons.push('Similar balance');
      }

      const minPaymentDiff = Math.abs(debt.minimumPayment - (statement.minimumPayment || 0));
      if (minPaymentDiff < debt.minimumPayment * 0.2) {
        confidence += 20;
        reasons.push('Similar minimum payment');
      }

      if (statement.fileName && statement.fileName.toLowerCase().includes(debt.institution.toLowerCase())) {
        confidence += 40;
        reasons.push('Institution name match');
      }

      if (debt.type.includes('CREDIT_CARD') && statement.purchases.length > 0) {
        confidence += 10;
        reasons.push('Credit card activity pattern');
      }

      if (confidence > 30) {
        matches.push({
          debtId: debt.id,
          debtName: debt.name,
          confidence,
          reasons
        });
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence);
  }
}