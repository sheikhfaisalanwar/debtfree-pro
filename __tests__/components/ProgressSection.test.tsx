/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { ProgressSection } from '../../src/components/ProgressSection';

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(amount);
};

describe('ProgressSection', () => {
  const defaultProps = {
    progress: 25,
    totalDebt: 10000,
    totalMinPayments: 500,
    debtFreeDate: '2.5 years',
    interestSavings: '$2,500',
    formatCurrency,
  };

  test('renders correctly with all props', async () => {
    await ReactTestRenderer.act(() => {
      const component = ReactTestRenderer.create(<ProgressSection {...defaultProps} />);
      expect(component.toJSON()).toMatchSnapshot();
    });
  });

  test('renders correctly with zero progress', async () => {
    await ReactTestRenderer.act(() => {
      const component = ReactTestRenderer.create(
        <ProgressSection {...defaultProps} progress={0} />
      );
      expect(component.toJSON()).toMatchSnapshot();
    });
  });

  test('renders correctly with high debt amounts', async () => {
    await ReactTestRenderer.act(() => {
      const component = ReactTestRenderer.create(
        <ProgressSection 
          {...defaultProps} 
          totalDebt={100000}
          totalMinPayments={2500}
          interestSavings="$15,000"
        />
      );
      expect(component.toJSON()).toMatchSnapshot();
    });
  });
});