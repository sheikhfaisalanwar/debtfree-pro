/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { DebtsSection } from '../../src/components/DebtsSection';
import { DebtAccountType } from '../../src/types/DebtAccount';

describe('DebtsSection', () => {
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

  const mockOnDebtPress = jest.fn();

  beforeEach(() => {
    mockOnDebtPress.mockClear();
  });

  test('renders correctly with debts', async () => {
    await ReactTestRenderer.act(() => {
      const component = ReactTestRenderer.create(
        <DebtsSection 
          accountsWithBalances={mockAccountsWithBalances}
          onDebtPress={mockOnDebtPress}
        />
      );
      expect(component.toJSON()).toMatchSnapshot();
    });
  });

  test('renders empty state when no debts', async () => {
    await ReactTestRenderer.act(() => {
      const component = ReactTestRenderer.create(
        <DebtsSection 
          accountsWithBalances={[]}
          onDebtPress={mockOnDebtPress}
        />
      );
      expect(component.toJSON()).toMatchSnapshot();
    });
  });

  test('calls onDebtPress when debt card is pressed', async () => {
    let component: ReactTestRenderer.ReactTestRenderer;
    
    await ReactTestRenderer.act(() => {
      component = ReactTestRenderer.create(
        <DebtsSection 
          accountsWithBalances={mockAccountsWithBalances}
          onDebtPress={mockOnDebtPress}
        />
      );
    });

    const debtCards = component!.root.findAllByType('TouchableOpacity');
    
    await ReactTestRenderer.act(() => {
      debtCards[0].props.onPress();
    });

    expect(mockOnDebtPress).toHaveBeenCalledWith(mockAccountsWithBalances[0]);
  });
});