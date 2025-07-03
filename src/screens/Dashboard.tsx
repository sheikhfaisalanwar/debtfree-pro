import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { DocumentUpload } from '../components/DocumentUpload';
import { EditDebtModal } from '../components/EditDebtModal';
import { ProgressSection } from '../components/ProgressSection';
import { DebtsSection } from '../components/DebtsSection';
import { NextStepsSection } from '../components/NextStepsSection';
import { PayoffStrategy } from '../types/Strategy';
import { DebtService } from '../services/DebtService';
import { DataStoreService } from '../services/DataStoreService';
import { DebtAccount } from '../types/DebtAccount';
import { DebtBalance, DebtAccountBalance } from '../types/DebtBalance';
import { AppSettings } from '../types/DataStore';

export const Dashboard: React.FC = () => {
  const [accountsWithBalances, setAccountsWithBalances] = useState<DebtAccountBalance[]>([]);
  const [strategy, setStrategy] = useState<PayoffStrategy | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedAccountBalance, setSelectedAccountBalance] = useState<DebtAccountBalance | null>(null);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const loadedAccountsWithBalances = await DataStoreService.getAllAccountsWithBalances();
      const loadedSettings = await DataStoreService.getSettings();
      
      setSettings(loadedSettings);
      
      if (loadedAccountsWithBalances.length > 0) {
        // Sort by balance (ascending) for snowball method
        const sortedAccountsWithBalances = [...loadedAccountsWithBalances]
          .sort((a, b) => a.balance.balance - b.balance.balance);
        setAccountsWithBalances(sortedAccountsWithBalances);
        
        // Convert to legacy format for strategy calculation
        const legacyDebts = sortedAccountsWithBalances.map(({ account, balance }) => ({
          id: account.id,
          name: account.name,
          type: account.type,
          balance: balance.balance,
          minimumPayment: balance.minimumPayment,
          interestRate: balance.interestRate,
          lastUpdated: balance.lastUpdated,
          institution: account.institution,
          accountNumber: account.accountNumber,
          dueDate: account.dueDate
        }));
        
        const snowballStrategy = DebtService.calculateSnowballStrategy(legacyDebts, loadedSettings.extraPayment);
        setStrategy(snowballStrategy);
      } else {
        setAccountsWithBalances([]);
        setStrategy(null);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, []);


  const handleDebtCardPress = useCallback((accountBalance: DebtAccountBalance) => {
    setSelectedAccountBalance(accountBalance);
    setShowEditModal(true);
  }, []);

  const handleDebtUpdated = useCallback(async () => {
    await loadData();
    setShowEditModal(false);
    setSelectedAccountBalance(null);
  }, [loadData]);

  const handleModalClose = useCallback(() => {
    setShowEditModal(false);
    setSelectedAccountBalance(null);
  }, []);

  const handleUploadSuccess = useCallback(() => {
    loadData();
  }, [loadData]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(amount);
  };

  // Calculate dynamic metrics
  const totalDebt = accountsWithBalances.reduce((sum, { balance }) => sum + balance.balance, 0);
  const totalMinPayments = accountsWithBalances.reduce((sum, { balance }) => sum + balance.minimumPayment, 0);
  const progress = DebtService.calculateProgress(accountsWithBalances, strategy);
  const debtFreeDate = DebtService.calculateDebtFreeDate(strategy);
  const interestSavings = DebtService.formatInterestSavings(strategy);

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
        <ProgressSection
          progress={progress}
          totalDebt={totalDebt}
          totalMinPayments={totalMinPayments}
          debtFreeDate={debtFreeDate}
          interestSavings={interestSavings}
          formatCurrency={formatCurrency}
        />

        {/* Add Debt Action Button */}
        <DocumentUpload onSuccess={handleUploadSuccess} />

        {/* Debts Section */}
        <DebtsSection
          accountsWithBalances={accountsWithBalances}
          onDebtPress={handleDebtCardPress}
        />

        {/* Next Steps */}
        {strategy && settings && (
          <NextStepsSection
            strategy={strategy}
            settings={settings}
            accountsWithBalances={accountsWithBalances}
            totalMinPayments={totalMinPayments}
            formatCurrency={formatCurrency}
          />
        )}
      </ScrollView>
      
      {selectedAccountBalance && (
        <EditDebtModal
          visible={showEditModal}
          debt={{
            id: selectedAccountBalance.account.id,
            name: selectedAccountBalance.account.name,
            type: selectedAccountBalance.account.type,
            balance: selectedAccountBalance.balance.balance,
            minimumPayment: selectedAccountBalance.balance.minimumPayment,
            interestRate: selectedAccountBalance.balance.interestRate,
            lastUpdated: selectedAccountBalance.balance.lastUpdated,
            institution: selectedAccountBalance.account.institution,
            accountNumber: selectedAccountBalance.account.accountNumber,
            dueDate: selectedAccountBalance.account.dueDate
          }}
          onSave={handleDebtUpdated}
          onCancel={handleModalClose}
        />
      )}
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