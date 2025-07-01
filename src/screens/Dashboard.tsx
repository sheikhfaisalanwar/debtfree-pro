import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { DebtCard } from '../components/DebtCard';
import { ProgressBar } from '../components/ProgressBar';
import { StatCard } from '../components/StatCard';
import { Debt } from '../types/Debt';
import { PayoffStrategy } from '../types/Strategy';
import { DebtService } from '../services/DebtService';
import { DataStoreService } from '../services/DataStoreService';

export const Dashboard: React.FC = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [strategy, setStrategy] = useState<PayoffStrategy | null>(null);
  const [extraPayment, setExtraPayment] = useState<number>(100);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const loadedDebts = await DataStoreService.getDebts();
      const settings = await DataStoreService.getSettings();
      
      setDebts(loadedDebts);
      setExtraPayment(settings.extraPayment);
      
      if (loadedDebts.length > 0) {
        const snowballStrategy = DebtService.calculateSnowballStrategy(loadedDebts, settings.extraPayment);
        setStrategy(snowballStrategy);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(amount);
  };

  const totalDebt = debts.reduce((sum, debt) => sum + debt.balance, 0);
  const totalMinPayments = debts.reduce((sum, debt) => sum + debt.minimumPayment, 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your debt information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>💳 DebtFree Pro</Text>
          <Text style={styles.subtitle}>Smart debt payoff using the proven snowball method</Text>
        </View>

        {/* Progress Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🎯 Your Progress</Text>
          <ProgressBar progress={23} label="Overall Progress" />
          
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
              value="3.2 years"
              label="Debt-Free Date"
              icon="🎯"
            />
            <StatCard
              value="$3,420"
              label="Interest Saved"
              icon="💾"
            />
          </View>
        </View>

        {/* Debts Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💳 Your Debts</Text>
          {debts.map((debt, index) => (
            <DebtCard
              key={debt.id}
              debt={debt}
              isPriority={index === 0} // First debt in snowball method
            />
          ))}
        </View>

        {/* Next Steps */}
        {strategy && (
          <View style={[styles.card, styles.nextStepsCard]}>
            <Text style={styles.nextStepsTitle}>🚀 Next Steps</Text>
            <View style={styles.stepsList}>
              {strategy.debts.length > 0 && (
                <>
                  <Text style={styles.stepText}>
                    1. <Text style={styles.stepBold}>Pay {formatCurrency(strategy.debts[0].monthlyPayment)} toward {debts.find(d => d.id === strategy.debts[0].debtId)?.name}</Text> 
                    {` (minimum ${formatCurrency(debts.find(d => d.id === strategy.debts[0].debtId)?.minimumPayment || 0)} + extra ${formatCurrency(extraPayment)})`}
                  </Text>
                  <Text style={styles.stepText}>
                    2. Pay minimums on all other debts ({formatCurrency(totalMinPayments - (debts.find(d => d.id === strategy.debts[0].debtId)?.minimumPayment || 0))} total)
                  </Text>
                  <Text style={styles.stepText}>
                    3. Expected payoff: {debts.find(d => d.id === strategy.debts[0].debtId)?.name} by {strategy.debts[0].payoffDate.toLocaleDateString()}
                  </Text>
                  {strategy.debts.length > 1 && (
                    <Text style={styles.stepText}>
                      4. After payoff, apply that payment to {debts.find(d => d.id === strategy.debts[1].debtId)?.name}
                    </Text>
                  )}
                </>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: 'white',
    padding: 24,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
});