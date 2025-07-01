import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Debt, DebtType } from '../types/Debt';

interface DebtCardProps {
  debt: Debt;
  isPriority?: boolean;
  onPress?: () => void;
}

export const DebtCard: React.FC<DebtCardProps> = ({ debt, isPriority, onPress }) => {
  const getDebtTypeIcon = (type: DebtType): string => {
    switch (type) {
      case DebtType.CREDIT_CARD: return '💳';
      case DebtType.AUTO_LOAN: return '🚗';
      case DebtType.PERSONAL_LOAN: return '💰';
      case DebtType.LINE_OF_CREDIT: return '📈';
      case DebtType.STUDENT_LOAN: return '🎓';
      case DebtType.MORTGAGE: return '🏠';
      default: return '📄';
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(amount);
  };

  return (
    <TouchableOpacity
      style={[styles.container, isPriority && styles.priorityContainer]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.icon}>{getDebtTypeIcon(debt.type)}</Text>
          <Text style={styles.name}>{debt.name}</Text>
          {isPriority && <View style={styles.priorityBadge}>
            <Text style={styles.priorityText}>FOCUS</Text>
          </View>}
        </View>
        <Text style={styles.balance}>{formatCurrency(debt.balance)}</Text>
      </View>
      
      <View style={styles.details}>
        <Text style={styles.detailText}>
          {debt.interestRate.toFixed(2)}% APR • Min: {formatCurrency(debt.minimumPayment)}/month
        </Text>
        {debt.institution && (
          <Text style={styles.institution}>{debt.institution}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  priorityContainer: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 20,
    marginRight: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  balance: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  priorityBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  priorityText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  details: {
    marginTop: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
  },
  institution: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
});