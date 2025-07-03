import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { ProgressBar } from './ProgressBar';
import { StatCard } from './StatCard';

interface ProgressSectionProps {
  progress: number;
  totalDebt: number;
  totalMinPayments: number;
  debtFreeDate: string;
  interestSavings: string;
  formatCurrency: (amount: number) => string;
}

export const ProgressSection: React.FC<ProgressSectionProps> = ({
  progress,
  totalDebt,
  totalMinPayments,
  debtFreeDate,
  interestSavings,
  formatCurrency,
}) => {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>🎯 Your Progress</Text>
      <ProgressBar progress={progress} label="Overall Progress" />
      
      <View style={styles.statsRow}>
        <StatCard
          value={formatCurrency(totalDebt)}
          label="Total Debt"
          icon="💰"
        />
        <StatCard
          value={formatCurrency(totalMinPayments)}
          label="Monthly Payments"
          icon="📅"
        />
      </View>
      
      <View style={styles.statsRow}>
        <StatCard
          value={debtFreeDate}
          label="Debt-Free Date"
          icon="🎯"
        />
        <StatCard
          value={interestSavings}
          label="Interest Saved"
          icon="💾"
        />
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
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
    marginHorizontal: -4,
  },
});