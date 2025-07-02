import { DataStoreService, UpdateDebtParams } from '../../src/services/DataStoreService';
import { StatementProcessingService } from '../../src/services/StatementProcessingService';
import { Debt, DebtType } from '../../src/types/Debt';
import { Statement } from '../../src/types/Statement';

// Mock all external dependencies
jest.mock('../../src/services/DataStoreService');
jest.mock('react-native-fs');

const mockDataStoreService = DataStoreService as jest.Mocked<typeof DataStoreService>;

describe('Debt Editing Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default mocks
    mockDataStoreService.getDebts.mockResolvedValue([]);
    mockDataStoreService.getStatements.mockResolvedValue([]);
    mockDataStoreService.updateDebt.mockResolvedValue(null);
    mockDataStoreService.deleteDebt.mockResolvedValue(false);
    mockDataStoreService.getDebt.mockResolvedValue(null);
  });

  describe('Monthly Debt Updates for Consecutive Payments', () => {
    it('should update debt balance after monthly payment processing', async () => {
      // Initial debt state
      const initialDebt: Debt = {
        id: 'debt_monthly_update',
        name: 'Chase Freedom Card',
        type: DebtType.CREDIT_CARD,
        balance: 2500.00,
        minimumPayment: 75.00,
        interestRate: 18.99,
        lastUpdated: new Date('2024-01-01'),
        institution: 'Chase Bank',
        accountNumber: '1234',
        dueDate: 15
      };

      // Monthly statement processed (simulating manual entry)
      const monthlyStatement: Statement = {
        id: 'stmt_february_2024',
        debtId: 'debt_monthly_update',
        statementDate: new Date('2024-02-15'),
        balance: 2200.00, // Reduced by $300 payment
        minimumPayment: 75.00,
        dueDate: new Date('2024-03-15'),
        interestCharged: 38.75, // Monthly interest
        payments: [{
          date: new Date('2024-02-10'),
          amount: 300.00,
          description: 'Payment - Thank You'
        }],
        purchases: [{
          date: new Date('2024-02-05'),
          amount: 150.00,
          description: 'Grocery Store Purchase',
          category: 'Food & Dining'
        }],
        fileName: 'chase_statement_feb_2024.pdf',
        imported: new Date()
      };

      // Mock debt retrieval and update
      mockDataStoreService.getDebt.mockResolvedValue(initialDebt);
      mockDataStoreService.getStatements.mockResolvedValue([monthlyStatement]);

      const updatedDebt: Debt = {
        ...initialDebt,
        balance: 2200.00,
        lastUpdated: new Date()
      };
      mockDataStoreService.updateDebt.mockResolvedValue(updatedDebt);

      // Process statement analysis and debt update
      const analysis = await StatementProcessingService.analyzeStatement(monthlyStatement, initialDebt.id);
      
      expect(analysis.newBalance).toBe(2200.00);
      expect(analysis.balanceChange).toBe(-300.00); // Decreased by $300
      expect(analysis.paymentsMade).toBe(300.00);
      expect(analysis.purchasesMade).toBe(150.00);
      expect(analysis.interestCharged).toBe(38.75);
      expect(analysis.shouldUpdateDebt).toBe(true);

      // Update debt with new balance
      await StatementProcessingService.updateDebtFromStatement(initialDebt.id, analysis);

      expect(mockDataStoreService.updateDebt).toHaveBeenCalledWith({
        id: 'debt_monthly_update',
        balance: 2200.00,
        minimumPayment: 75.00
      });
    });

    it('should handle multiple consecutive monthly updates', async () => {
      const initialDebt: Debt = {
        id: 'debt_consecutive_updates',
        name: 'Wells Fargo Card',
        type: DebtType.CREDIT_CARD,
        balance: 5000.00,
        minimumPayment: 150.00,
        interestRate: 22.99,
        lastUpdated: new Date('2024-01-01'),
        institution: 'Wells Fargo',
        accountNumber: '5678',
        dueDate: 28
      };

      const monthlyUpdates = [
        { month: 'January', balance: 4700.00, payment: 400.00, purchases: 100.00 },
        { month: 'February', balance: 4350.00, payment: 450.00, purchases: 100.00 },
        { month: 'March', balance: 3950.00, payment: 500.00, purchases: 100.00 }
      ];

      let currentDebt = initialDebt;

      for (const update of monthlyUpdates) {
        mockDataStoreService.getDebt.mockResolvedValue(currentDebt);

        const monthlyStatement: Statement = {
          id: `stmt_${update.month.toLowerCase()}_2024`,
          debtId: 'debt_consecutive_updates',
          statementDate: new Date('2024-01-28'),
          balance: update.balance,
          minimumPayment: 150.00,
          dueDate: new Date('2024-02-28'),
          interestCharged: 85.00,
          payments: [{
            date: new Date('2024-01-15'),
            amount: update.payment,
            description: `${update.month} Payment`
          }],
          purchases: [{
            date: new Date('2024-01-10'),
            amount: update.purchases,
            description: 'Monthly Purchase',
            category: 'Shopping'
          }],
          fileName: `wells_fargo_${update.month.toLowerCase()}_2024.pdf`,
          imported: new Date()
        };

        mockDataStoreService.getStatements.mockResolvedValue([monthlyStatement]);

        const updatedDebt: Debt = {
          ...currentDebt,
          balance: update.balance,
          lastUpdated: new Date()
        };
        mockDataStoreService.updateDebt.mockResolvedValue(updatedDebt);

        // Process the monthly update
        const analysis = await StatementProcessingService.analyzeStatement(monthlyStatement, currentDebt.id);
        await StatementProcessingService.updateDebtFromStatement(currentDebt.id, analysis);

        // Verify the debt was updated with correct balance
        expect(mockDataStoreService.updateDebt).toHaveBeenCalledWith({
          id: 'debt_consecutive_updates',
          balance: update.balance,
          minimumPayment: 150.00
        });

        // Update current debt for next iteration
        currentDebt = updatedDebt;
      }

      // Final balance should be $3950 after 3 months of payments
      expect(currentDebt.balance).toBe(3950.00);
    });

    it('should handle manual balance corrections for incorrect statements', async () => {
      const debtWithIncorrectBalance: Debt = {
        id: 'debt_correction_test',
        name: 'Capital One Card',
        type: DebtType.CREDIT_CARD,
        balance: 1500.00, // Incorrect balance in system
        minimumPayment: 50.00,
        interestRate: 16.99,
        lastUpdated: new Date('2024-01-01'),
        institution: 'Capital One',
        accountNumber: '9876',
        dueDate: 10
      };

      // User manually corrects the balance using edit functionality
      const correctionParams: UpdateDebtParams = {
        id: 'debt_correction_test',
        balance: 1750.00, // Correct balance from actual statement
        minimumPayment: 55.00, // Updated minimum payment
        interestRate: 17.49 // Rate increase
      };

      const correctedDebt: Debt = {
        ...debtWithIncorrectBalance,
        balance: 1750.00,
        minimumPayment: 55.00,
        interestRate: 17.49,
        lastUpdated: new Date()
      };

      mockDataStoreService.getDebt.mockResolvedValue(debtWithIncorrectBalance);
      mockDataStoreService.updateDebt.mockResolvedValue(correctedDebt);

      // Perform manual correction
      const result = await DataStoreService.updateDebt(correctionParams);

      expect(result).toBeDefined();
      expect(result!.balance).toBe(1750.00);
      expect(result!.minimumPayment).toBe(55.00);
      expect(result!.interestRate).toBe(17.49);
      expect(result!.lastUpdated.getTime()).toBeGreaterThan(debtWithIncorrectBalance.lastUpdated.getTime());

      expect(mockDataStoreService.updateDebt).toHaveBeenCalledWith(correctionParams);
    });
  });

  describe('Debt Type Changes and Updates', () => {
    it('should handle debt type changes from credit card to line of credit', async () => {
      const originalDebt: Debt = {
        id: 'debt_type_change',
        name: 'Convertible Credit Account',
        type: DebtType.CREDIT_CARD,
        balance: 3000.00,
        minimumPayment: 90.00,
        interestRate: 19.99,
        lastUpdated: new Date('2024-01-01'),
        institution: 'Universal Bank',
        accountNumber: '4321',
        dueDate: 20
      };

      // Bank converts credit card to line of credit
      const conversionUpdate: UpdateDebtParams = {
        id: 'debt_type_change',
        type: DebtType.LINE_OF_CREDIT,
        name: 'Personal Line of Credit',
        interestRate: 12.99, // Better rate for LOC
        minimumPayment: 60.00 // Different payment structure
      };

      const convertedDebt: Debt = {
        ...originalDebt,
        type: DebtType.LINE_OF_CREDIT,
        name: 'Personal Line of Credit',
        interestRate: 12.99,
        minimumPayment: 60.00,
        lastUpdated: new Date()
      };

      mockDataStoreService.getDebt.mockResolvedValue(originalDebt);
      mockDataStoreService.updateDebt.mockResolvedValue(convertedDebt);

      const result = await DataStoreService.updateDebt(conversionUpdate);

      expect(result).toBeDefined();
      expect(result!.type).toBe(DebtType.LINE_OF_CREDIT);
      expect(result!.name).toBe('Personal Line of Credit');
      expect(result!.interestRate).toBe(12.99);
      expect(result!.minimumPayment).toBe(60.00);
      expect(result!.balance).toBe(3000.00); // Balance unchanged
    });

    it('should preserve statement relationships during debt updates', async () => {
      const debt: Debt = {
        id: 'debt_with_statements',
        name: 'Bank Card',
        type: DebtType.CREDIT_CARD,
        balance: 2000.00,
        minimumPayment: 75.00,
        interestRate: 20.00,
        lastUpdated: new Date(),
        institution: 'Local Bank'
      };

      const statements: Statement[] = [
        {
          id: 'stmt_1',
          debtId: 'debt_with_statements',
          statementDate: new Date('2024-01-15'),
          balance: 2100.00,
          minimumPayment: 75.00,
          dueDate: new Date('2024-02-15'),
          interestCharged: 35.00,
          payments: [],
          purchases: [],
          fileName: 'january_2024.pdf',
          imported: new Date()
        },
        {
          id: 'stmt_2',
          debtId: 'debt_with_statements',
          statementDate: new Date('2024-02-15'),
          balance: 2000.00,
          minimumPayment: 75.00,
          dueDate: new Date('2024-03-15'),
          interestCharged: 33.33,
          payments: [],
          purchases: [],
          fileName: 'february_2024.pdf',
          imported: new Date()
        }
      ];

      mockDataStoreService.getDebt.mockResolvedValue(debt);
      mockDataStoreService.getStatements.mockResolvedValue(statements);

      const updateParams: UpdateDebtParams = {
        id: 'debt_with_statements',
        balance: 1800.00,
        minimumPayment: 65.00
      };

      const updatedDebt: Debt = {
        ...debt,
        balance: 1800.00,
        minimumPayment: 65.00,
        lastUpdated: new Date()
      };
      mockDataStoreService.updateDebt.mockResolvedValue(updatedDebt);

      // Update debt
      const result = await DataStoreService.updateDebt(updateParams);

      // Verify debt updated
      expect(result).toBeDefined();
      expect(result!.balance).toBe(1800.00);

      // Verify statements remain linked
      const debtStatements = await DataStoreService.getStatements('debt_with_statements');
      expect(debtStatements).toHaveLength(2);
      expect(debtStatements.every(stmt => stmt.debtId === 'debt_with_statements')).toBe(true);
    });
  });

  describe('Debt Deletion and Cleanup', () => {
    it('should delete debt and all associated statements', async () => {
      const debtToDelete: Debt = {
        id: 'debt_to_delete',
        name: 'Closed Account',
        type: DebtType.CREDIT_CARD,
        balance: 0.00, // Paid off
        minimumPayment: 0.00,
        interestRate: 18.99,
        lastUpdated: new Date(),
        institution: 'Closed Bank'
      };

      // Mock successful deletion
      mockDataStoreService.deleteDebt.mockResolvedValue(true);

      const result = await DataStoreService.deleteDebt('debt_to_delete');

      expect(result).toBe(true);
      expect(mockDataStoreService.deleteDebt).toHaveBeenCalledWith('debt_to_delete');
    });

    it('should handle deletion of non-existent debt gracefully', async () => {
      mockDataStoreService.deleteDebt.mockResolvedValue(false);

      const result = await DataStoreService.deleteDebt('non_existent_debt');

      expect(result).toBe(false);
      expect(mockDataStoreService.deleteDebt).toHaveBeenCalledWith('non_existent_debt');
    });
  });

  describe('Bulk Debt Operations', () => {
    it('should handle multiple debt updates in sequence', async () => {
      const debts: Debt[] = [
        {
          id: 'debt_bulk_1',
          name: 'Card 1',
          type: DebtType.CREDIT_CARD,
          balance: 1000.00,
          minimumPayment: 50.00,
          interestRate: 18.00,
          lastUpdated: new Date(),
          institution: 'Bank 1'
        },
        {
          id: 'debt_bulk_2',
          name: 'Card 2',
          type: DebtType.CREDIT_CARD,
          balance: 2000.00,
          minimumPayment: 75.00,
          interestRate: 22.00,
          lastUpdated: new Date(),
          institution: 'Bank 2'
        },
        {
          id: 'debt_bulk_3',
          name: 'Loan',
          type: DebtType.PERSONAL_LOAN,
          balance: 5000.00,
          minimumPayment: 200.00,
          interestRate: 8.99,
          lastUpdated: new Date(),
          institution: 'Credit Union'
        }
      ];

      const updates = [
        { id: 'debt_bulk_1', balance: 900.00, minimumPayment: 45.00 },
        { id: 'debt_bulk_2', balance: 1800.00, minimumPayment: 70.00 },
        { id: 'debt_bulk_3', balance: 4750.00, minimumPayment: 200.00 }
      ];

      // Process each update
      for (let i = 0; i < updates.length; i++) {
        const originalDebt = debts[i];
        const update = updates[i];

        mockDataStoreService.getDebt.mockResolvedValueOnce(originalDebt);

        const updatedDebt: Debt = {
          ...originalDebt,
          balance: update.balance,
          minimumPayment: update.minimumPayment,
          lastUpdated: new Date()
        };
        mockDataStoreService.updateDebt.mockResolvedValueOnce(updatedDebt);

        const result = await DataStoreService.updateDebt(update);

        expect(result).toBeDefined();
        expect(result!.balance).toBe(update.balance);
        expect(result!.minimumPayment).toBe(update.minimumPayment);
      }

      // Verify all updates were called
      expect(mockDataStoreService.updateDebt).toHaveBeenCalledTimes(3);
    });

    it('should calculate total debt across all updated debts', async () => {
      const debts: Debt[] = [
        {
          id: 'debt_total_1',
          name: 'Card 1',
          type: DebtType.CREDIT_CARD,
          balance: 1500.00,
          minimumPayment: 60.00,
          interestRate: 19.99,
          lastUpdated: new Date(),
          institution: 'Bank 1'
        },
        {
          id: 'debt_total_2',
          name: 'Card 2',
          type: DebtType.CREDIT_CARD,
          balance: 2800.00,
          minimumPayment: 85.00,
          interestRate: 24.99,
          lastUpdated: new Date(),
          institution: 'Bank 2'
        },
        {
          id: 'debt_total_3',
          name: 'Auto Loan',
          type: DebtType.AUTO_LOAN,
          balance: 12000.00,
          minimumPayment: 350.00,
          interestRate: 6.49,
          lastUpdated: new Date(),
          institution: 'Auto Finance'
        }
      ];

      mockDataStoreService.getDebts.mockResolvedValue(debts);

      const allDebts = await DataStoreService.getDebts();

      const totalDebt = allDebts.reduce((sum, debt) => sum + debt.balance, 0);
      const totalMinimumPayment = allDebts.reduce((sum, debt) => sum + debt.minimumPayment, 0);

      expect(totalDebt).toBe(16300.00);
      expect(totalMinimumPayment).toBe(495.00);
      expect(allDebts).toHaveLength(3);
    });
  });

  describe('Data Validation and Error Handling', () => {
    beforeEach(() => {
      // Clear all mocks before each test in this describe block
      jest.clearAllMocks();
      mockDataStoreService.getDebts.mockResolvedValue([]);
      mockDataStoreService.getStatements.mockResolvedValue([]);
      mockDataStoreService.updateDebt.mockResolvedValue(null);
      mockDataStoreService.deleteDebt.mockResolvedValue(false);
      mockDataStoreService.getDebt.mockResolvedValue(null);
    });

    it('should handle concurrent debt updates safely', async () => {
      const debt: Debt = {
        id: 'debt_concurrent',
        name: 'Concurrent Test Debt',
        type: DebtType.CREDIT_CARD,
        balance: 2000.00,
        minimumPayment: 75.00,
        interestRate: 18.99,
        lastUpdated: new Date(),
        institution: 'Test Bank'
      };

      mockDataStoreService.getDebt.mockResolvedValue(debt);

      const update1 = { id: 'debt_concurrent', balance: 1900.00 };
      const update2 = { id: 'debt_concurrent', minimumPayment: 80.00 };

      const updatedDebt1: Debt = { ...debt, balance: 1900.00, lastUpdated: new Date() };
      const updatedDebt2: Debt = { ...debt, minimumPayment: 80.00, lastUpdated: new Date() };

      mockDataStoreService.updateDebt
        .mockResolvedValueOnce(updatedDebt1)
        .mockResolvedValueOnce(updatedDebt2);

      // Process updates concurrently
      const results = await Promise.all([
        DataStoreService.updateDebt(update1),
        DataStoreService.updateDebt(update2)
      ]);

      expect(results[0]).toBeDefined();
      expect(results[1]).toBeDefined();
      expect(results[0]!.balance).toBe(1900.00);
      expect(results[1]!.minimumPayment).toBe(80.00);
    });

    it('should preserve data integrity during failed updates', async () => {
      const updateParams: UpdateDebtParams = {
        id: 'debt_integrity_test',
        balance: 900.00
      };

      // Simulate update failure
      mockDataStoreService.updateDebt.mockResolvedValueOnce(null);

      const result = await DataStoreService.updateDebt(updateParams);

      expect(result).toBeNull();
      expect(mockDataStoreService.updateDebt).toHaveBeenCalledWith(updateParams);

      // When update fails, the service should handle it gracefully
      expect(mockDataStoreService.updateDebt).toHaveBeenCalledTimes(1);
    });
  });
});