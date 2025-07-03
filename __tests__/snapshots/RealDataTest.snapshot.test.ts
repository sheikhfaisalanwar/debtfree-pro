import { DataStoreService } from '../../src/services/DataStoreService';
import RNFS from 'react-native-fs';

// Mock RNFS
jest.mock('react-native-fs');
const mockRNFS = RNFS as jest.Mocked<typeof RNFS>;

describe('Real Data Loading Test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRNFS.DocumentDirectoryPath = '/mock/documents';
    (DataStoreService as any)._initialized = false;
  });

  it('should load real debts.json data correctly', async () => {
    // Load the actual debts.json file content
    const realDebtData = require('../../src/data/debts.json');
    
    mockRNFS.exists.mockResolvedValue(true);
    mockRNFS.readFile.mockResolvedValue(JSON.stringify(realDebtData));

    // Test that the service can load the real data
    const debts = await DataStoreService.getDebts();
    
    expect({
      realDataStructure: {
        hasAccounts: Array.isArray(realDebtData.accounts),
        hasBalances: Array.isArray(realDebtData.balances),
        accountsCount: realDebtData.accounts?.length || 0,
        balancesCount: realDebtData.balances?.length || 0,
        firstAccountType: realDebtData.accounts?.[0]?.type,
        firstBalanceAmount: realDebtData.balances?.[0]?.balance
      },
      loadedDebts: {
        count: debts.length,
        firstDebt: debts[0] ? {
          id: debts[0].id,
          name: debts[0].name,
          type: debts[0].type,
          balance: debts[0].balance,
          hasValidBalance: typeof debts[0].balance === 'number' && !isNaN(debts[0].balance),
          hasValidName: typeof debts[0].name === 'string' && debts[0].name.length > 0,
          hasValidInterestRate: typeof debts[0].interestRate === 'number' && !isNaN(debts[0].interestRate)
        } : null,
        allDebtsValid: debts.every(debt => 
          debt.id && 
          debt.name && 
          typeof debt.balance === 'number' && 
          !isNaN(debt.balance) &&
          typeof debt.interestRate === 'number' &&
          !isNaN(debt.interestRate)
        )
      }
    }).toMatchSnapshot();
  });

  it('should correctly map account types for debt cards', async () => {
    const realDebtData = require('../../src/data/debts.json');
    
    mockRNFS.exists.mockResolvedValue(true);
    mockRNFS.readFile.mockResolvedValue(JSON.stringify(realDebtData));

    const debts = await DataStoreService.getDebts();
    
    // Test that debt types are properly mapped for DebtCard component
    const debtTypeMapping = debts.map(debt => ({
      id: debt.id,
      name: debt.name,
      type: debt.type,
      typeIsString: typeof debt.type === 'string',
      typeLength: debt.type?.length || 0,
      canBeUsedByDebtCard: debt.type && (
        debt.type === 'CREDIT_CARD' || 
        debt.type === 'credit_card' ||
        debt.type === 'AUTO_LOAN' ||
        debt.type === 'auto_loan' ||
        debt.type === 'LINE_OF_CREDIT' ||
        debt.type === 'line_of_credit' ||
        debt.type === 'PERSONAL_LOAN' ||
        debt.type === 'personal_loan'
      )
    }));

    expect({
      debtTypeMappings: debtTypeMapping,
      allTypesCompatible: debtTypeMapping.every(mapping => mapping.canBeUsedByDebtCard)
    }).toMatchSnapshot();
  });

  it('should handle empty data gracefully', async () => {
    const emptyData = {
      version: '2.0.0',
      accounts: [],
      balances: [],
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
    mockRNFS.readFile.mockResolvedValue(JSON.stringify(emptyData));

    const debts = await DataStoreService.getDebts();
    const settings = await DataStoreService.getSettings();

    expect({
      emptyDataHandling: {
        debtsCount: debts.length,
        settingsLoaded: settings ? true : false,
        extraPayment: settings?.extraPayment,
        strategy: settings?.strategy
      }
    }).toMatchSnapshot();
  });

  it('should verify debt card props compatibility', async () => {
    const realDebtData = require('../../src/data/debts.json');
    
    mockRNFS.exists.mockResolvedValue(true);
    mockRNFS.readFile.mockResolvedValue(JSON.stringify(realDebtData));

    const debts = await DataStoreService.getDebts();
    
    // Verify that each debt has all required props for DebtCard
    const debtCardCompatibility = debts.map(debt => ({
      id: debt.id,
      hasRequiredProps: {
        id: !!debt.id,
        name: !!debt.name,
        type: !!debt.type,
        balance: typeof debt.balance === 'number',
        minimumPayment: typeof debt.minimumPayment === 'number',
        interestRate: typeof debt.interestRate === 'number',
        lastUpdated: debt.lastUpdated instanceof Date,
        institution: debt.institution !== undefined
      },
      allPropsValid: !!debt.id && 
                    !!debt.name && 
                    !!debt.type && 
                    typeof debt.balance === 'number' &&
                    typeof debt.minimumPayment === 'number' &&
                    typeof debt.interestRate === 'number' &&
                    debt.lastUpdated instanceof Date
    }));

    expect({
      debtCardCompatibility,
      allDebtsCompatible: debtCardCompatibility.every(debt => debt.allPropsValid)
    }).toMatchSnapshot();
  });
});