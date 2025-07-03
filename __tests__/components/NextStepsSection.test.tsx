/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { NextStepsSection } from '../../src/components/NextStepsSection';
import { StrategyType, PaymentStrategy } from '../../src/types/Strategy';
import { DebtAccountType } from '../../src/types/DebtAccount';

describe('NextStepsSection', () => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(amount);
  };

  const mockAccountsWithBalances = [
    {
      account: {
        id: '1',
        name: 'Credit Card',
        type: DebtAccountType.CREDIT_CARD,
        institution: 'Bank A',
        createdDate: new Date(),
        lastUpdated: new Date(),
      },
      balance: {
        id: 'b1',
        accountId: '1',
        balance: 5000,
        minimumPayment: 150,
        interestRate: 19.99,
        balanceDate: new Date(),
        lastUpdated: new Date(),
      }
    },
    {
      account: {
        id: '2',
        name: 'Personal Loan',
        type: DebtAccountType.PERSONAL_LOAN,
        institution: 'Bank B',
        createdDate: new Date(),
        lastUpdated: new Date(),
      },
      balance: {
        id: 'b2',
        accountId: '2',
        balance: 8000,
        minimumPayment: 250,
        interestRate: 12.5,
        balanceDate: new Date(),
        lastUpdated: new Date(),
      }
    }
  ];

  const mockStrategy = {
    id: 'strategy-1',
    name: 'Debt Snowball',
    type: StrategyType.SNOWBALL,
    debts: [
      {
        debtId: '1',
        payoffOrder: 1,
        monthlyPayment: 250,
        payoffDate: new Date('2025-12-31'),
        totalInterest: 500,
        isPriority: true,
      },
      {
        debtId: '2',
        payoffOrder: 2,
        monthlyPayment: 300,
        payoffDate: new Date('2026-06-30'),
        totalInterest: 800,
        isPriority: false,
      }
    ],
    totalInterestSaved: 1200,
    payoffDate: new Date('2026-06-30'),
    monthlyPayment: 550,
  };

  const mockSettings = {
    extraPayment: 100,
    strategy: PaymentStrategy.SNOWBALL,
    currency: 'CAD',
    dateFormat: 'YYYY-MM-DD',
    notifications: {
      enabled: true,
      dueDateReminders: true,
      paymentReminders: true,
      reminderDays: 3,
    },
  };

  test('renders correctly with full strategy', async () => {
    await ReactTestRenderer.act(() => {
      const component = ReactTestRenderer.create(
        <NextStepsSection
          strategy={mockStrategy}
          settings={mockSettings}
          accountsWithBalances={mockAccountsWithBalances}
          totalMinPayments={400}
          formatCurrency={formatCurrency}
        />
      );
      expect(component.toJSON()).toMatchSnapshot();
    });
  });

  test('renders correctly with single debt strategy', async () => {
    const singleDebtStrategy = {
      ...mockStrategy,
      debts: [mockStrategy.debts[0]],
    };

    await ReactTestRenderer.act(() => {
      const component = ReactTestRenderer.create(
        <NextStepsSection
          strategy={singleDebtStrategy}
          settings={mockSettings}
          accountsWithBalances={[mockAccountsWithBalances[0]]}
          totalMinPayments={150}
          formatCurrency={formatCurrency}
        />
      );
      expect(component.toJSON()).toMatchSnapshot();
    });
  });

  test('returns null when no strategy provided', async () => {
    await ReactTestRenderer.act(() => {
      const component = ReactTestRenderer.create(
        <NextStepsSection
          strategy={null as any}
          settings={mockSettings}
          accountsWithBalances={mockAccountsWithBalances}
          totalMinPayments={400}
          formatCurrency={formatCurrency}
        />
      );
      expect(component.toJSON()).toBeNull();
    });
  });

  test('returns null when no settings provided', async () => {
    await ReactTestRenderer.act(() => {
      const component = ReactTestRenderer.create(
        <NextStepsSection
          strategy={mockStrategy}
          settings={null as any}
          accountsWithBalances={mockAccountsWithBalances}
          totalMinPayments={400}
          formatCurrency={formatCurrency}
        />
      );
      expect(component.toJSON()).toBeNull();
    });
  });
});