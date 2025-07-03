import { DataStoreService } from '../../src/services/DataStoreService';
import { DataStoreV2 } from '../../src/types/DataStore';
import { DebtAccountType } from '../../src/types/DebtAccount';
import RNFS from 'react-native-fs';

// Legacy compatibility - define DebtType for tests
const DebtType = DebtAccountType;

jest.mock('react-native-fs');

const mockRNFS = RNFS as jest.Mocked<typeof RNFS>;

describe('DataStoreService', () => {
  const mockDataStore: DataStoreV2 = {
    version: '2.0.0',
    accounts: [
      {
        id: '1',
        name: 'Test Credit Card',
        type: DebtAccountType.CREDIT_CARD,
        institution: 'Test Bank',
        createdDate: new Date('2024-01-01'),
        lastUpdated: new Date('2024-01-01')
      }
    ],
    balances: [
      {
        id: 'bal_1',
        accountId: '1',
        balance: 1000,
        minimumPayment: 50,
        interestRate: 18.99,
        balanceDate: new Date('2024-01-01'),
        lastUpdated: new Date('2024-01-01')
      }
    ],
    documents: [],
    statements: [],
    settings: {
      extraPayment: 100,
      strategy: 'SNOWBALL' as any,
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
      createdDate: new Date('2024-01-01'),
      lastUpdated: new Date('2024-01-01'),
      dataVersion: '2.0.0',
      totalMigrations: 0
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRNFS.DocumentDirectoryPath = '/mock/documents';
    // Reset initialization state for each test
    (DataStoreService as any)._initialized = false;
  });

  describe('initialize', () => {
    it('should create data file if it does not exist', async () => {
      mockRNFS.exists.mockResolvedValue(false);
      mockRNFS.writeFile.mockResolvedValue();

      await DataStoreService.initializeDataStore();

      expect(mockRNFS.exists).toHaveBeenCalledWith('/mock/documents/debts.json');
      expect(mockRNFS.writeFile).toHaveBeenCalled();
    });

    it('should not create file if it already exists', async () => {
      mockRNFS.exists.mockResolvedValue(true);

      await DataStoreService.initializeDataStore();

      expect(mockRNFS.exists).toHaveBeenCalledWith('/mock/documents/debts.json');
      expect(mockRNFS.writeFile).not.toHaveBeenCalled();
    });
  });

  describe('loadData', () => {
    it('should load and parse data correctly', async () => {
      const mockFileContent = JSON.stringify(mockDataStore);

      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.readFile.mockResolvedValue(mockFileContent);

      const result = await DataStoreService.loadData();

      expect(result.accounts).toHaveLength(1);
      expect(result.accounts[0].name).toBe('Test Credit Card');
      expect(result.accounts[0].lastUpdated).toBeInstanceOf(Date);
      expect(result.balances).toHaveLength(1);
      expect(result.balances[0].balance).toBe(1000);
    });

    it('should return empty store on error', async () => {
      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.readFile.mockRejectedValue(new Error('File read error'));

      const result = await DataStoreService.loadData();

      expect(result.accounts).toHaveLength(0);
      expect(result.balances).toHaveLength(0);
      expect(result.statements).toHaveLength(0);
    });
  });

  describe('saveData', () => {
    it('should serialize and save data correctly', async () => {
      mockRNFS.writeFile.mockResolvedValue();

      await DataStoreService.saveData(mockDataStore);

      expect(mockRNFS.writeFile).toHaveBeenCalledWith(
        '/mock/documents/debts.json',
        expect.stringContaining('"name": "Test Credit Card"'),
        'utf8'
      );
    });

    it('should handle save errors', async () => {
      mockRNFS.writeFile.mockRejectedValue(new Error('Write error'));

      await expect(DataStoreService.saveData(mockDataStore)).rejects.toThrow('Failed to save data');
    });
  });

  describe('addDebt (legacy compatibility)', () => {
    it('should add new debt with CreateDebtParams and save', async () => {
      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.readFile.mockResolvedValue(JSON.stringify(mockDataStore));
      mockRNFS.writeFile.mockResolvedValue();

      const newDebt = await DataStoreService.addDebt({
        name: 'New Card',
        type: DebtAccountType.CREDIT_CARD,
        balance: 2000,
        minimumPayment: 75,
        interestRate: 22.99,
        institution: 'New Bank'
      });

      expect(newDebt.name).toBe('New Card');
      expect(newDebt.id).toBeDefined();
      expect(mockRNFS.writeFile).toHaveBeenCalled();
    });

    it('should add new debt with full Debt object and preserve ID', async () => {
      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.readFile.mockResolvedValue(JSON.stringify(mockDataStore));
      mockRNFS.writeFile.mockResolvedValue();

      const fullDebt = {
        id: 'custom_debt_id',
        name: 'Custom Debt',
        type: DebtType.AUTO_LOAN,
        balance: 15000,
        minimumPayment: 350,
        interestRate: 5.99,
        lastUpdated: new Date(),
        institution: 'Auto Finance',
        accountNumber: '1234',
        dueDate: 15
      };

      const newDebt = await DataStoreService.addDebt(fullDebt);

      expect(newDebt.id).toBe('custom_debt_id');
      expect(newDebt.name).toBe('Custom Debt');
      expect(newDebt.accountNumber).toBe('1234');
      expect(newDebt.dueDate).toBe(15);
      expect(mockRNFS.writeFile).toHaveBeenCalled();
    });

    it('should generate unique IDs for CreateDebtParams', async () => {
      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.readFile.mockResolvedValue(JSON.stringify(mockDataStore));
      mockRNFS.writeFile.mockResolvedValue();

      const debtParams = {
        name: 'Test Debt',
        type: DebtType.CREDIT_CARD,
        balance: 1000,
        minimumPayment: 50,
        interestRate: 15,
        institution: 'Bank'
      };

      const debt1 = await DataStoreService.addDebt(debtParams);
      const debt2 = await DataStoreService.addDebt(debtParams);

      expect(debt1.id).not.toBe(debt2.id);
      expect(debt1.id).toBeDefined();
      expect(debt2.id).toBeDefined();
    });
  });

  describe('updateDebt', () => {
    it('should update existing debt with all fields', async () => {
      const debtWithAllFields = {
        ...mockDataStore,
        accounts: [{
          id: '1',
          name: 'Original Card',
          type: DebtType.CREDIT_CARD,
          institution: 'Original Bank',
          accountNumber: '0000',
          dueDate: 1,
          createdDate: new Date('2024-01-01'),
          lastUpdated: new Date('2024-01-01')
        }],
        balances: [{
          id: 'bal_1',
          accountId: '1',
          balance: 1000,
          minimumPayment: 50,
          interestRate: 18.99,
          balanceDate: new Date('2024-01-01'),
          lastUpdated: new Date('2024-01-01')
        }]
      };

      // Track the data that gets written
      let currentData = debtWithAllFields;
      
      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.readFile.mockImplementation(() => Promise.resolve(JSON.stringify(currentData)));
      mockRNFS.writeFile.mockImplementation((path, content) => {
        currentData = JSON.parse(content);
        return Promise.resolve();
      });

      const updatedDebt = await DataStoreService.updateDebt({
        id: '1',
        name: 'Updated Card',
        type: DebtType.AUTO_LOAN,
        balance: 900,
        minimumPayment: 45,
        interestRate: 12.5,
        institution: 'New Bank',
        accountNumber: '9999',
        dueDate: 31
      });

      expect(updatedDebt).not.toBeNull();
      expect(updatedDebt?.name).toBe('Updated Card');
      expect(updatedDebt?.type).toBe(DebtType.AUTO_LOAN);
      expect(updatedDebt?.balance).toBe(900);
      expect(updatedDebt?.minimumPayment).toBe(45);
      expect(updatedDebt?.interestRate).toBe(12.5);
      expect(updatedDebt?.institution).toBe('New Bank');
      expect(updatedDebt?.accountNumber).toBe('9999');
      expect(updatedDebt?.dueDate).toBe(31);
      expect(updatedDebt?.lastUpdated.getTime()).toBeGreaterThan(new Date('2024-01-01').getTime());
      expect(mockRNFS.writeFile).toHaveBeenCalled();
    });

    it('should update debt with partial fields', async () => {
      // Track the data that gets written
      let currentData = mockDataStore;
      
      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.readFile.mockImplementation(() => Promise.resolve(JSON.stringify(currentData)));
      mockRNFS.writeFile.mockImplementation((path, content) => {
        currentData = JSON.parse(content);
        return Promise.resolve();
      });

      const updatedDebt = await DataStoreService.updateDebt({
        id: '1',
        balance: 900,
        minimumPayment: 45
      });

      expect(updatedDebt).not.toBeNull();
      expect(updatedDebt?.balance).toBe(900);
      expect(updatedDebt?.minimumPayment).toBe(45);
      expect(updatedDebt?.name).toBe('Test Credit Card'); // Unchanged
      expect(updatedDebt?.type).toBe(DebtType.CREDIT_CARD); // Unchanged
      expect(mockRNFS.writeFile).toHaveBeenCalled();
    });

    it('should preserve undefined optional fields', async () => {
      const debtWithOptionals = {
        ...mockDataStore,
        accounts: [{
          id: '1',
          name: 'Test Card',
          type: DebtType.CREDIT_CARD,
          institution: 'Test Bank',
          accountNumber: '1234',
          dueDate: 15,
          createdDate: new Date('2024-01-01'),
          lastUpdated: new Date('2024-01-01')
        }],
        balances: [{
          id: 'bal_1',
          accountId: '1',
          balance: 1000,
          minimumPayment: 50,
          interestRate: 18.99,
          balanceDate: new Date('2024-01-01'),
          lastUpdated: new Date('2024-01-01')
        }]
      };

      // Track the data that gets written
      let currentData = debtWithOptionals;
      
      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.readFile.mockImplementation(() => Promise.resolve(JSON.stringify(currentData)));
      mockRNFS.writeFile.mockImplementation((path, content) => {
        currentData = JSON.parse(content);
        return Promise.resolve();
      });

      const updatedDebt = await DataStoreService.updateDebt({
        id: '1',
        balance: 900,
        accountNumber: undefined,
        dueDate: undefined
      });

      expect(updatedDebt).not.toBeNull();
      expect(updatedDebt?.balance).toBe(900);
      expect(updatedDebt?.accountNumber).toBe('1234'); // Should remain unchanged
      expect(updatedDebt?.dueDate).toBe(15); // Should remain unchanged
    });

    it('should return null for non-existent debt', async () => {
      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.readFile.mockResolvedValue(JSON.stringify(mockDataStore));

      const result = await DataStoreService.updateDebt({
        id: 'non-existent',
        balance: 500
      });

      expect(result).toBeNull();
    });
  });

  describe('deleteDebt', () => {
    it('should delete debt and related statements', async () => {
      const dataWithStatements = {
        ...mockDataStore,
        statements: [{
          id: 'stmt1',
          accountId: '1',
          statementDate: new Date(),
          balance: 1000,
          minimumPayment: 50,
          dueDate: new Date(),
          interestCharged: 15,
          transactions: [],
          payments: [],
          importedDate: new Date(),
          lastUpdated: new Date()
        }]
      };

      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.readFile.mockResolvedValue(JSON.stringify(dataWithStatements));
      mockRNFS.writeFile.mockResolvedValue();

      const result = await DataStoreService.deleteDebt('1');

      expect(result).toBe(true);
      expect(mockRNFS.writeFile).toHaveBeenCalled();
    });

    it('should return false for non-existent debt', async () => {
      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.readFile.mockResolvedValue(JSON.stringify(mockDataStore));

      const result = await DataStoreService.deleteDebt('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('statement operations', () => {
    it('should add statement correctly', async () => {
      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.readFile.mockResolvedValue(JSON.stringify(mockDataStore));
      mockRNFS.writeFile.mockResolvedValue();

      const statement = {
        id: 'stmt1',
        debtId: '1',
        statementDate: new Date(),
        balance: 1000,
        minimumPayment: 50,
        dueDate: new Date(),
        interestCharged: 15,
        payments: [],
        purchases: [],
        fileName: 'test.csv',
        imported: new Date()
      };

      await DataStoreService.addStatement(statement);

      expect(mockRNFS.writeFile).toHaveBeenCalled();
    });

    it('should get statements for specific debt', async () => {
      const dataWithStatements = {
        ...mockDataStore,
        statements: [
          {
            id: 'stmt1',
            accountId: '1',
            statementDate: new Date(),
            balance: 1000,
            minimumPayment: 50,
            dueDate: new Date(),
            interestCharged: 15,
            transactions: [],
            payments: [],
            importedDate: new Date(),
            lastUpdated: new Date()
          },
          {
            id: 'stmt2',
            accountId: '2',
            statementDate: new Date(),
            balance: 2000,
            minimumPayment: 100,
            dueDate: new Date(),
            interestCharged: 25,
            transactions: [],
            payments: [],
            importedDate: new Date(),
            lastUpdated: new Date()
          }
        ]
      };

      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.readFile.mockResolvedValue(JSON.stringify(dataWithStatements));

      const statements = await DataStoreService.getStatements('1');

      expect(statements).toHaveLength(1);
      expect(statements[0].debtId).toBe('1');
    });
  });

  describe('settings operations', () => {
    it('should update settings', async () => {
      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.readFile.mockResolvedValue(JSON.stringify(mockDataStore));
      mockRNFS.writeFile.mockResolvedValue();

      await DataStoreService.updateSettings({
        extraPayment: 200,
        strategy: 'AVALANCHE'
      });

      expect(mockRNFS.writeFile).toHaveBeenCalled();
    });

    it('should get current settings', async () => {
      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.readFile.mockResolvedValue(JSON.stringify(mockDataStore));

      const settings = await DataStoreService.getSettings();

      expect(settings.extraPayment).toBe(100);
      expect(settings.strategy).toBe('SNOWBALL');
      expect(settings.currency).toBe('CAD');
    });
  });

  describe('data export/import', () => {
    it('should export data as JSON string', async () => {
      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.readFile.mockResolvedValue(JSON.stringify(mockDataStore));

      const exportedData = await DataStoreService.exportData();

      expect(typeof exportedData).toBe('string');
      const parsed = JSON.parse(exportedData);
      expect(parsed.accounts).toHaveLength(1);
    });

    it('should import valid JSON data', async () => {
      mockRNFS.writeFile.mockResolvedValue();

      const importData = JSON.stringify(mockDataStore);

      await DataStoreService.importData(importData);

      expect(mockRNFS.writeFile).toHaveBeenCalled();
    });

    it('should reject invalid JSON data', async () => {
      const invalidData = 'invalid json';

      await expect(DataStoreService.importData(invalidData)).rejects.toThrow('Failed to import data');
    });
  });
});