/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { DebtCard } from '../src/components/DebtCard';
import { ProgressBar } from '../src/components/ProgressBar';
import { StatCard } from '../src/components/StatCard';
import { Dashboard } from '../src/screens/Dashboard';
import { DebtAccountType } from '../src/types/DebtAccount';

test('DebtCard renders correctly', async () => {
  const mockAccount = {
    id: '1',
    name: 'Test Credit Card',
    type: DebtAccountType.CREDIT_CARD,
    institution: 'Test Bank',
    createdDate: new Date(),
    lastUpdated: new Date(),
  };

  const mockBalance = {
    id: 'b1',
    accountId: '1',
    balance: 1000,
    minimumPayment: 50,
    interestRate: 19.99,
    balanceDate: new Date(),
    lastUpdated: new Date(),
  };

  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(
      <DebtCard 
        account={mockAccount} 
        balance={mockBalance} 
        isPriority={true} 
      />
    );
  });
});

test('ProgressBar renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<ProgressBar progress={50} label="Test Progress" />);
  });
});

test('StatCard renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<StatCard value="$1,000" label="Total Debt" icon="💰" />);
  });
});

test('Dashboard renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<Dashboard />);
  });
});