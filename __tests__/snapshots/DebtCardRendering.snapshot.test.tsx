import React from 'react';
import renderer from 'react-test-renderer';
import { DebtCard } from '../../src/components/DebtCard';
import { DebtAccountType } from '../../src/types/DebtAccount';

describe('DebtCard Rendering Snapshot Tests', () => {
  it('should render credit card debt correctly', () => {
    const mockDebt = {
      id: '1',
      name: 'Store Credit Card',
      type: DebtAccountType.CREDIT_CARD,
      balance: 1247,
      minimumPayment: 45,
      interestRate: 24.99,
      lastUpdated: new Date('2024-01-01T00:00:00.000Z'),
      institution: 'Store Bank'
    };

    const tree = renderer.create(<DebtCard debt={mockDebt} />);
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('should render priority debt with focus badge', () => {
    const mockDebt = {
      id: '2',
      name: 'RBC Credit Card',
      type: DebtAccountType.CREDIT_CARD,
      balance: 4890,
      minimumPayment: 125,
      interestRate: 19.99,
      lastUpdated: new Date('2024-01-01T00:00:00.000Z'),
      institution: 'RBC'
    };

    const tree = renderer.create(<DebtCard debt={mockDebt} isPriority={true} />);
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('should render auto loan debt correctly', () => {
    const mockDebt = {
      id: '3',
      name: 'TD Auto Loan',
      type: DebtAccountType.AUTO_LOAN,
      balance: 18500,
      minimumPayment: 320,
      interestRate: 6.5,
      lastUpdated: new Date('2024-01-01T00:00:00.000Z'),
      institution: 'TD Bank'
    };

    const tree = renderer.create(<DebtCard debt={mockDebt} />);
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('should handle string type values (legacy compatibility)', () => {
    const mockDebt = {
      id: '4',
      name: 'Line of Credit',
      type: 'LINE_OF_CREDIT' as any, // Simulate string type from data
      balance: 3200,
      minimumPayment: 85,
      interestRate: 8.25,
      lastUpdated: new Date('2024-01-01T00:00:00.000Z'),
      institution: 'National Bank'
    };

    const tree = renderer.create(<DebtCard debt={mockDebt} />);
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('should handle snake_case type values (old format compatibility)', () => {
    const mockDebt = {
      id: '5',
      name: 'Student Loan',
      type: 'student_loan' as any, // Simulate old snake_case format
      balance: 15000,
      minimumPayment: 150,
      interestRate: 4.5,
      lastUpdated: new Date('2024-01-01T00:00:00.000Z'),
      institution: 'Student Aid'
    };

    const tree = renderer.create(<DebtCard debt={mockDebt} />);
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('should handle debt without institution', () => {
    const mockDebt = {
      id: '6',
      name: 'Personal Loan',
      type: DebtAccountType.PERSONAL_LOAN,
      balance: 5000,
      minimumPayment: 200,
      interestRate: 12.5,
      lastUpdated: new Date('2024-01-01T00:00:00.000Z')
      // No institution field
    };

    const tree = renderer.create(<DebtCard debt={mockDebt} />);
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('should handle unknown debt type', () => {
    const mockDebt = {
      id: '7',
      name: 'Unknown Debt',
      type: 'unknown_type' as any,
      balance: 1000,
      minimumPayment: 50,
      interestRate: 10.0,
      lastUpdated: new Date('2024-01-01T00:00:00.000Z'),
      institution: 'Unknown Bank'
    };

    const tree = renderer.create(<DebtCard debt={mockDebt} />);
    expect(tree.toJSON()).toMatchSnapshot();
  });
});