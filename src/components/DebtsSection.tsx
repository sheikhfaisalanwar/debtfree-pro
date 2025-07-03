import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { DebtCard } from './DebtCard';
import { DebtAccountBalance } from '../types/DebtBalance';

interface DebtsSectionProps {
  accountsWithBalances: DebtAccountBalance[];
  onDebtPress: (accountBalance: DebtAccountBalance) => void;
}

export const DebtsSection: React.FC<DebtsSectionProps> = ({
  accountsWithBalances,
  onDebtPress,
}) => {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>💳 Your Debts</Text>
      {accountsWithBalances.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>💳</Text>
          <Text style={styles.emptyStateTitle}>No debts added yet</Text>
          <Text style={styles.emptyStateText}>
            Use the "Add Debt" button above to get started with your debt payoff journey
          </Text>
        </View>
      ) : (
        accountsWithBalances.map(({ account, balance }, index) => (
          <DebtCard
            key={account.id}
            account={account}
            balance={balance}
            isPriority={index === 0} // First debt in snowball method
            onPress={() => onDebtPress({ account, balance })}
          />
        ))
      )}
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
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});