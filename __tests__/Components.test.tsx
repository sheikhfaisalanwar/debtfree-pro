/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { DebtCard } from '../src/components/DebtCard';
import { ProgressBar } from '../src/components/ProgressBar';
import { StatCard } from '../src/components/StatCard';
import { Dashboard } from '../src/screens/Dashboard';
import { DebtType } from '../src/types/Debt';

test('DebtCard renders correctly', async () => {
  const mockDebt = {
    id: '1',
    name: 'Test Credit Card',
    type: DebtType.CREDIT_CARD,
    balance: 1000,
    minimumPayment: 50,
    interestRate: 19.99,
    lastUpdated: new Date(),
    institution: 'Test Bank',
  };

  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<DebtCard debt={mockDebt} isPriority={true} />);
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