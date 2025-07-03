import { DataStoreService } from '../../src/services/DataStoreService';
import RNFS from 'react-native-fs';

// Mock RNFS
jest.mock('react-native-fs');
const mockRNFS = RNFS as jest.Mocked<typeof RNFS>;

describe('Debt Card Loading Snapshot Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRNFS.DocumentDirectoryPath = '/mock/documents';
    (DataStoreService as any)._initialized = false;
  });

  describe('DataStoreService.getDebts()', () => {
    it('should load debts correctly from current data format', async () => {
      const mockData = {
        version: '2.0.0',
        accounts: [
          {
            id: '1',
            name: 'Store Credit Card',
            type: 'CREDIT_CARD',
            institution: 'Store Bank',
            createdDate: '2024-01-01T00:00:00.000Z',
            lastUpdated: '2024-01-01T00:00:00.000Z'
          },
          {
            id: '2',
            name: 'RBC Credit Card',
            type: 'CREDIT_CARD',
            institution: 'RBC',
            createdDate: '2024-01-01T00:00:00.000Z',
            lastUpdated: '2024-01-01T00:00:00.000Z'
          }
        ],
        balances: [
          {
            id: 'bal_1',
            accountId: '1',
            balance: 1247,
            minimumPayment: 45,
            interestRate: 24.99,
            balanceDate: '2024-01-01T00:00:00.000Z',
            lastUpdated: '2024-01-01T00:00:00.000Z'
          },
          {
            id: 'bal_2',
            accountId: '2',
            balance: 4890,
            minimumPayment: 125,
            interestRate: 19.99,
            balanceDate: '2024-01-01T00:00:00.000Z',
            lastUpdated: '2024-01-01T00:00:00.000Z'
          }
        ],
        documents: [],
        statements: [],
        settings: {
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
        },
        metadata: {
          createdDate: '2024-01-01T00:00:00.000Z',
          lastUpdated: '2024-01-01T00:00:00.000Z',
          dataVersion: '2.0.0',
          totalMigrations: 0
        }
      };

      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.readFile.mockResolvedValue(JSON.stringify(mockData));

      const debts = await DataStoreService.getDebts();

      expect({
        debtsCount: debts.length,
        firstDebt: debts[0] ? {
          id: debts[0].id,
          name: debts[0].name,
          type: debts[0].type,
          balance: debts[0].balance,
          minimumPayment: debts[0].minimumPayment,
          interestRate: debts[0].interestRate,
          institution: debts[0].institution,
          lastUpdatedType: typeof debts[0].lastUpdated,
          lastUpdatedValid: debts[0].lastUpdated instanceof Date && !isNaN(debts[0].lastUpdated.getTime())
        } : null,
        secondDebt: debts[1] ? {
          id: debts[1].id,
          name: debts[1].name,
          type: debts[1].type,
          balance: debts[1].balance,
          minimumPayment: debts[1].minimumPayment,
          interestRate: debts[1].interestRate,
          institution: debts[1].institution,
          lastUpdatedType: typeof debts[1].lastUpdated,
          lastUpdatedValid: debts[1].lastUpdated instanceof Date && !isNaN(debts[1].lastUpdated.getTime())
        } : null
      }).toMatchSnapshot();
    });

    it('should handle missing balance data gracefully', async () => {
      const mockDataMissingBalances = {
        version: '2.0.0',
        accounts: [
          {
            id: '1',
            name: 'Store Credit Card',
            type: 'CREDIT_CARD',
            institution: 'Store Bank',
            createdDate: '2024-01-01T00:00:00.000Z',
            lastUpdated: '2024-01-01T00:00:00.000Z'
          }
        ],
        balances: [], // No balances
        documents: [],
        statements: [],
        settings: {
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
        },
        metadata: {
          createdDate: '2024-01-01T00:00:00.000Z',
          lastUpdated: '2024-01-01T00:00:00.000Z',
          dataVersion: '2.0.0',
          totalMigrations: 0
        }
      };

      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.readFile.mockResolvedValue(JSON.stringify(mockDataMissingBalances));

      const debts = await DataStoreService.getDebts();

      expect({
        debtsCount: debts.length,
        accountsWithoutBalances: 'Should return empty array when no balances exist'
      }).toMatchSnapshot();
    });

    it('should handle corrupted data file', async () => {
      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.readFile.mockResolvedValue('invalid json data');

      const debts = await DataStoreService.getDebts();

      expect({
        debtsCount: debts.length,
        fallbackBehavior: 'Should return empty array on parse error'
      }).toMatchSnapshot();
    });

    it('should handle missing data file', async () => {
      mockRNFS.exists.mockResolvedValue(false);
      
      const debts = await DataStoreService.getDebts();

      expect({
        debtsCount: debts.length,
        missingFileBehavior: 'Should initialize and return empty array'
      }).toMatchSnapshot();
    });

    it('should handle file system errors', async () => {
      mockRNFS.exists.mockRejectedValue(new Error('File system error'));
      
      const debts = await DataStoreService.getDebts();

      expect({
        debtsCount: debts.length,
        errorHandling: 'Should return empty array on file system error'
      }).toMatchSnapshot();
    });
  });

  describe('DataStoreService.getAllAccountsWithBalances()', () => {
    it('should correctly combine accounts with their current balances', async () => {
      const mockData = {
        version: '2.0.0',
        accounts: [
          {
            id: '1',
            name: 'Test Card',
            type: 'CREDIT_CARD',
            institution: 'Test Bank',
            createdDate: '2024-01-01T00:00:00.000Z',
            lastUpdated: '2024-01-01T00:00:00.000Z'
          }
        ],
        balances: [
          {
            id: 'bal_1',
            accountId: '1',
            balance: 1000,
            minimumPayment: 50,
            interestRate: 18.99,
            balanceDate: '2024-01-01T00:00:00.000Z',
            lastUpdated: '2024-01-01T00:00:00.000Z'
          },
          {
            id: 'bal_2',
            accountId: '1',
            balance: 900,
            minimumPayment: 45,
            interestRate: 18.99,
            balanceDate: '2024-01-15T00:00:00.000Z',
            lastUpdated: '2024-01-15T00:00:00.000Z'
          }
        ],
        documents: [],
        statements: [],
        settings: {
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
        },
        metadata: {
          createdDate: '2024-01-01T00:00:00.000Z',
          lastUpdated: '2024-01-01T00:00:00.000Z',
          dataVersion: '2.0.0',
          totalMigrations: 0
        }
      };

      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.readFile.mockResolvedValue(JSON.stringify(mockData));

      const accountsWithBalances = await DataStoreService.getAllAccountsWithBalances();

      expect({
        accountsCount: accountsWithBalances.length,
        firstAccountBalance: accountsWithBalances[0] ? {
          accountId: accountsWithBalances[0].account.id,
          accountName: accountsWithBalances[0].account.name,
          balanceId: accountsWithBalances[0].balance.id,
          balanceAmount: accountsWithBalances[0].balance.balance,
          balanceDate: accountsWithBalances[0].balance.balanceDate.toISOString(),
          isCurrentBalance: 'Should be the most recent balance (2024-01-15)'
        } : null
      }).toMatchSnapshot();
    });
  });

  describe('Initialize behavior', () => {
    it('should properly initialize data store on first run', async () => {
      mockRNFS.exists.mockResolvedValue(false);
      mockRNFS.writeFile.mockResolvedValue();

      await DataStoreService.initializeDataStore();

      expect({
        existsCallCount: mockRNFS.exists.mock.calls.length,
        writeFileCallCount: mockRNFS.writeFile.mock.calls.length,
        writeFileCalledWith: mockRNFS.writeFile.mock.calls[0] ? {
          path: mockRNFS.writeFile.mock.calls[0][0],
          contentType: typeof mockRNFS.writeFile.mock.calls[0][1],
          encoding: mockRNFS.writeFile.mock.calls[0][2]
        } : null
      }).toMatchSnapshot();
    });

    it('should not reinitialize if file exists', async () => {
      mockRNFS.exists.mockResolvedValue(true);

      await DataStoreService.initializeDataStore();

      expect({
        existsCallCount: mockRNFS.exists.mock.calls.length,
        writeFileCallCount: mockRNFS.writeFile.mock.calls.length,
        shouldNotWriteWhenFileExists: true
      }).toMatchSnapshot();
    });
  });
});