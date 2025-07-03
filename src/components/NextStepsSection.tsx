import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { PayoffStrategy } from '../types/Strategy';
import { DebtAccountBalance } from '../types/DebtBalance';
import { AppSettings } from '../types/DataStore';

interface NextStepsSectionProps {
  strategy: PayoffStrategy;
  settings: AppSettings;
  accountsWithBalances: DebtAccountBalance[];
  totalMinPayments: number;
  formatCurrency: (amount: number) => string;
}

export const NextStepsSection: React.FC<NextStepsSectionProps> = ({
  strategy,
  settings,
  accountsWithBalances,
  totalMinPayments,
  formatCurrency,
}) => {
  if (!strategy || !settings || strategy.debts.length === 0) {
    return null;
  }

  const firstDebt = strategy.debts[0];
  const firstAccount = accountsWithBalances.find(({ account }) => account.id === firstDebt.debtId);
  const secondDebt = strategy.debts.length > 1 ? strategy.debts[1] : null;
  const secondAccount = secondDebt ? accountsWithBalances.find(({ account }) => account.id === secondDebt.debtId) : null;

  return (
    <View style={[styles.card, styles.nextStepsCard]}>
      <Text style={styles.nextStepsTitle}>🚀 Next Steps</Text>
      <View style={styles.stepsList}>
        <Text style={styles.stepText}>
          1. <Text style={styles.stepBold}>Pay {formatCurrency(firstDebt.monthlyPayment)} toward {firstAccount?.account.name}</Text> 
          {` (minimum ${formatCurrency(firstAccount?.balance.minimumPayment || 0)} + extra ${formatCurrency(settings.extraPayment)})`}
        </Text>
        <Text style={styles.stepText}>
          2. Pay minimums on all other debts ({formatCurrency(totalMinPayments - (firstAccount?.balance.minimumPayment || 0))} total)
        </Text>
        <Text style={styles.stepText}>
          3. Expected payoff: {firstAccount?.account.name} by {firstDebt.payoffDate.toLocaleDateString()}
        </Text>
        {secondAccount && (
          <Text style={styles.stepText}>
            4. After payoff, apply that payment to {secondAccount.account.name}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  nextStepsCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  nextStepsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#047857',
    marginBottom: 16,
  },
  stepsList: {
    marginLeft: 8,
  },
  stepText: {
    fontSize: 14,
    color: '#065f46',
    marginBottom: 8,
    lineHeight: 20,
  },
  stepBold: {
    fontWeight: '600',
  },
});