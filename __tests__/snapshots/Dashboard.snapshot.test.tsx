import React from 'react';
import { render } from '@testing-library/react-native';
import { Dashboard } from '../../src/screens/Dashboard';
import { DataStoreService } from '../../src/services/DataStoreService';
import { DebtService } from '../../src/services/DebtService';

// Mock the services
jest.mock('../../src/services/DataStoreService');
jest.mock('../../src/services/DebtService');

const mockDataStoreService = DataStoreService as jest.Mocked<typeof DataStoreService>;
const mockDebtService = DebtService as jest.Mocked<typeof DebtService>;

describe('Dashboard Snapshot Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly with no debts', async () => {
    // Mock empty debt data
    mockDataStoreService.getAllAccountsWithBalances.mockResolvedValue([]);
    mockDataStoreService.getSettings.mockResolvedValue({
      extraPayment: 100,
      strategy: 'SNOWBALL',
      currency: 'CAD',
      dateFormat: 'YYYY-MM-DD',
      notifications: {
        enabled: true,
        dueDateReminders: true,
        paymentReminders: true,
        reminderDays: 3
      }
    });

    const { toJSON } = render(<Dashboard />);
    
    // Wait for component to finish loading
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render correctly with sample debt data', async () => {
    // Mock debt data that should be returned
    const mockAccountsWithBalances = [
      {
        account: {
          id: '1',
          name: 'Store Credit Card',
          type: 'credit_card',
          institution: 'Store Bank',
          createdDate: new Date('2024-01-01T00:00:00.000Z'),
          lastUpdated: new Date('2024-01-01T00:00:00.000Z')
        },
        balance: {
          id: 'b1',
          accountId: '1',
          balance: 1247,
          minimumPayment: 45,
          interestRate: 24.99,
          balanceDate: new Date('2024-01-01T00:00:00.000Z'),
          lastUpdated: new Date('2024-01-01T00:00:00.000Z')
        }
      },
      {
        account: {
          id: '2',
          name: 'RBC Credit Card',
          type: 'credit_card',
          institution: 'RBC',
          createdDate: new Date('2024-01-01T00:00:00.000Z'),
          lastUpdated: new Date('2024-01-01T00:00:00.000Z')
        },
        balance: {
          id: 'b2',
          accountId: '2',
          balance: 4890,
          minimumPayment: 125,
          interestRate: 19.99,
          balanceDate: new Date('2024-01-01T00:00:00.000Z'),
          lastUpdated: new Date('2024-01-01T00:00:00.000Z')
        }
      }
    ];

    const mockStrategy = {
      id: 'snowball-test',
      name: 'Debt Snowball',
      type: 'SNOWBALL',
      debts: [
        {
          debtId: '1',
          payoffOrder: 1,
          monthlyPayment: 145,
          payoffDate: new Date('2025-01-01'),
          totalInterest: 100,
          isPriority: true
        },
        {
          debtId: '2',
          payoffOrder: 2,
          monthlyPayment: 125,
          payoffDate: new Date('2026-01-01'),
          totalInterest: 500,
          isPriority: false
        }
      ],
      totalInterestSaved: 200,
      payoffDate: new Date('2026-01-01'),
      monthlyPayment: 270
    };

    mockDataStoreService.getAllAccountsWithBalances.mockResolvedValue(mockAccountsWithBalances);
    mockDataStoreService.getSettings.mockResolvedValue({
      extraPayment: 100,
      strategy: 'SNOWBALL',
      currency: 'CAD',
      dateFormat: 'YYYY-MM-DD',
      notifications: {
        enabled: true,
        dueDateReminders: true,
        paymentReminders: true,
        reminderDays: 3
      }
    });
    mockDebtService.calculateSnowballStrategy.mockReturnValue(mockStrategy);

    const { toJSON } = render(<Dashboard />);
    
    // Wait for component to finish loading
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render loading state', () => {
    // Mock services to never resolve (loading state)
    mockDataStoreService.getAllAccountsWithBalances.mockImplementation(() => new Promise(() => {}));
    mockDataStoreService.getSettings.mockImplementation(() => new Promise(() => {}));

    const { toJSON } = render(<Dashboard />);
    
    expect(toJSON()).toMatchSnapshot();
  });

  it('should handle error state', async () => {
    // Mock services to reject
    mockDataStoreService.getAllAccountsWithBalances.mockRejectedValue(new Error('Failed to load debts'));
    mockDataStoreService.getSettings.mockRejectedValue(new Error('Failed to load settings'));

    const { toJSON } = render(<Dashboard />);
    
    // Wait for error handling
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(toJSON()).toMatchSnapshot();
  });
});