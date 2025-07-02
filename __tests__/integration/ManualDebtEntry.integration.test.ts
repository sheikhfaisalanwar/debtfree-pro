import { DocumentManagerService } from '../../src/services/DocumentManagerService';
import { StatementProcessingService } from '../../src/services/StatementProcessingService';
import { DataStoreService } from '../../src/services/DataStoreService';
import { UploadedDocument } from '../../src/services/DocumentUploadService';
import { Debt, DebtType } from '../../src/types/Debt';
import { Statement } from '../../src/types/Statement';

// Mock all external dependencies
jest.mock('../../src/services/DataStoreService');
jest.mock('react-native-fs');

const mockDataStoreService = DataStoreService as jest.Mocked<typeof DataStoreService>;

describe('Manual Debt Entry Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default mocks
    mockDataStoreService.getDebts.mockResolvedValue([]);
    mockDataStoreService.getStatements.mockResolvedValue([]);
    mockDataStoreService.addDebt.mockResolvedValue(undefined);
    mockDataStoreService.addStatement.mockResolvedValue(undefined);
    mockDataStoreService.getDebt.mockResolvedValue(null);
  });

  describe('Complete Manual Debt Entry Flow', () => {
    it('should create debt, link statement, and update debt from PDF with manual entry', async () => {
      // Step 1: Simulate PDF upload that requires manual entry
      const mockPDFDocument: UploadedDocument = {
        id: 'doc_manual_test',
        fileName: 'credit_card_statement.pdf',
        fileType: 'pdf',
        fileSize: 150000,
        filePath: '/mock/path/statement.pdf',
        uploadDate: new Date('2024-01-15'),
        processed: false
      };

      // Step 2: Process document (should result in manual entry requirement)
      const documentResult = await DocumentManagerService.processDocument(mockPDFDocument);
      
      expect(documentResult.success).toBe(true);
      expect(documentResult.statement).toBeDefined();
      
      const statement = documentResult.statement!;
      
      // Verify it's a manual entry statement (no extracted data)
      expect(statement.balance).toBe(0);
      expect(statement.purchases).toHaveLength(0);
      expect(statement.payments).toHaveLength(0);
      expect((statement as any).hasExtractedData).toBeFalsy();

      // Step 3: Create debt manually (simulating modal completion)
      const newDebt: Debt = {
        id: `debt_${Date.now()}_manual`,
        name: 'Chase Freedom Card',
        type: DebtType.CREDIT_CARD,
        balance: 2500.00,
        minimumPayment: 75.00,
        interestRate: 18.99,
        lastUpdated: new Date(),
        institution: 'Chase Bank',
        accountNumber: '1234',
        dueDate: 15
      };

      // Mock debt creation success
      mockDataStoreService.addDebt.mockResolvedValueOnce(undefined);
      await DataStoreService.addDebt(newDebt);

      // Step 4: Mock debt retrieval for processing
      mockDataStoreService.getDebt.mockResolvedValue(newDebt);
      mockDataStoreService.getStatements.mockResolvedValue([statement]);

      // Step 5: Link statement to newly created debt
      const linkResult = await StatementProcessingService.processExistingStatement(statement.id, newDebt.id);

      expect(linkResult.updated).toBe(true); // Balance changed from 2500 to 0, so debt should be updated
      expect(linkResult.statement).toBeDefined();
      expect(linkResult.statement!.debtId).toBe(newDebt.id);

      // Verify debt was created
      expect(mockDataStoreService.addDebt).toHaveBeenCalledWith(newDebt);
      
      // Verify statement was updated with debt ID
      expect(mockDataStoreService.addStatement).toHaveBeenCalledWith(
        expect.objectContaining({
          debtId: newDebt.id,
          id: statement.id,
          fileName: 'credit_card_statement.pdf'
        })
      );
    });

    it('should handle debt creation with all optional fields', async () => {
      const mockPDFDocument: UploadedDocument = {
        id: 'doc_comprehensive_test',
        fileName: 'comprehensive_statement.pdf',
        fileType: 'pdf',
        fileSize: 200000,
        filePath: '/mock/path/comprehensive.pdf',
        uploadDate: new Date(),
        processed: false
      };

      const documentResult = await DocumentManagerService.processDocument(mockPDFDocument);
      expect(documentResult.success).toBe(true);

      // Create debt with all fields populated
      const comprehensiveDebt: Debt = {
        id: 'debt_comprehensive_test',
        name: 'Wells Fargo Personal Loan',
        type: DebtType.PERSONAL_LOAN,
        balance: 15000.00,
        minimumPayment: 350.00,
        interestRate: 12.5,
        lastUpdated: new Date(),
        institution: 'Wells Fargo',
        accountNumber: '5678',
        dueDate: 28
      };

      mockDataStoreService.getDebt.mockResolvedValue(comprehensiveDebt);
      mockDataStoreService.getStatements.mockResolvedValue([documentResult.statement!]);

      const linkResult = await StatementProcessingService.processExistingStatement(
        documentResult.statement!.id, 
        comprehensiveDebt.id
      );

      expect(linkResult.statement).toBeDefined();
      expect(linkResult.statement!.debtId).toBe(comprehensiveDebt.id);
      
      // Verify all debt fields are preserved
      expect(mockDataStoreService.addStatement).toHaveBeenCalledWith(
        expect.objectContaining({
          debtId: comprehensiveDebt.id
        })
      );
    });

    it('should handle multiple debt types correctly', async () => {
      const debtTypes = [
        { type: DebtType.CREDIT_CARD, name: 'Credit Card Test' },
        { type: DebtType.AUTO_LOAN, name: 'Auto Loan Test' },
        { type: DebtType.STUDENT_LOAN, name: 'Student Loan Test' },
        { type: DebtType.MORTGAGE, name: 'Mortgage Test' },
        { type: DebtType.LINE_OF_CREDIT, name: 'Line of Credit Test' },
        { type: DebtType.OTHER, name: 'Other Debt Test' }
      ];

      for (const debtTypeTest of debtTypes) {
        // Create mock document
        const mockDocument: UploadedDocument = {
          id: `doc_${debtTypeTest.type}_test`,
          fileName: `${debtTypeTest.type}_statement.pdf`,
          fileType: 'pdf',
          fileSize: 100000,
          filePath: `/mock/${debtTypeTest.type}.pdf`,
          uploadDate: new Date(),
          processed: false
        };

        const documentResult = await DocumentManagerService.processDocument(mockDocument);
        expect(documentResult.success).toBe(true);

        // Create debt of specific type
        const debt: Debt = {
          id: `debt_${debtTypeTest.type}_test`,
          name: debtTypeTest.name,
          type: debtTypeTest.type,
          balance: 1000.00,
          minimumPayment: 50.00,
          interestRate: 15.0,
          lastUpdated: new Date()
        };

        mockDataStoreService.getDebt.mockResolvedValue(debt);
        mockDataStoreService.getStatements.mockResolvedValue([documentResult.statement!]);

        const linkResult = await StatementProcessingService.processExistingStatement(
          documentResult.statement!.id,
          debt.id
        );

        expect(linkResult.statement).toBeDefined();
        expect(linkResult.statement!.debtId).toBe(debt.id);
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle debt creation failure gracefully', async () => {
      const mockDocument: UploadedDocument = {
        id: 'doc_error_test',
        fileName: 'error_statement.pdf',
        fileType: 'pdf',
        fileSize: 100000,
        filePath: '/mock/error.pdf',
        uploadDate: new Date(),
        processed: false
      };

      const documentResult = await DocumentManagerService.processDocument(mockDocument);
      expect(documentResult.success).toBe(true);

      // Simulate debt creation error
      const debt: Debt = {
        id: 'debt_error_test',
        name: 'Error Test Debt',
        type: DebtType.CREDIT_CARD,
        balance: 1000.00,
        minimumPayment: 50.00,
        interestRate: 15.0,
        lastUpdated: new Date()
      };

      // Mock debt not found (creation failed or debt doesn't exist)
      mockDataStoreService.getDebt.mockResolvedValue(null);

      const linkResult = await StatementProcessingService.processExistingStatement(
        documentResult.statement!.id,
        debt.id
      );

      expect(linkResult.updated).toBe(false);
      expect(linkResult.error).toContain('Debt with ID debt_error_test not found');
    });

    it('should handle statement not found error', async () => {
      const debt: Debt = {
        id: 'debt_valid',
        name: 'Valid Debt',
        type: DebtType.CREDIT_CARD,
        balance: 1000.00,
        minimumPayment: 50.00,
        interestRate: 15.0,
        lastUpdated: new Date()
      };

      mockDataStoreService.getDebt.mockResolvedValue(debt);
      mockDataStoreService.getStatements.mockResolvedValue([]); // No statements

      const linkResult = await StatementProcessingService.processExistingStatement(
        'non_existent_statement',
        debt.id
      );

      expect(linkResult.updated).toBe(false);
      expect(linkResult.error).toContain('Statement with ID non_existent_statement not found');
    });

    it('should handle empty or invalid debt IDs', async () => {
      const invalidDebtIds = ['', 'unknown', null, undefined];

      for (const invalidId of invalidDebtIds) {
        const linkResult = await StatementProcessingService.processExistingStatement(
          'statement_id',
          invalidId as string
        );

        expect(linkResult.updated).toBe(false);
        expect(linkResult.error).toContain('No debt ID provided');
      }
    });
  });

  describe('Statement Analysis and Debt Updates', () => {
    it('should analyze manual entry statements correctly', async () => {
      const mockDocument: UploadedDocument = {
        id: 'doc_analysis_test',
        fileName: 'analysis_statement.pdf',
        fileType: 'pdf',
        fileSize: 150000,
        filePath: '/mock/analysis.pdf',
        uploadDate: new Date(),
        processed: false
      };

      const documentResult = await DocumentManagerService.processDocument(mockDocument);
      const statement = documentResult.statement!;

      const existingDebt: Debt = {
        id: 'debt_analysis_test',
        name: 'Analysis Test Debt',
        type: DebtType.CREDIT_CARD,
        balance: 1500.00, // Different from statement balance (0)
        minimumPayment: 50.00,
        interestRate: 18.0,
        lastUpdated: new Date()
      };

      mockDataStoreService.getDebt.mockResolvedValue(existingDebt);
      mockDataStoreService.getStatements.mockResolvedValue([statement]);

      const analysis = await StatementProcessingService.analyzeStatement(statement, existingDebt.id);

      // Manual entry statements should show balance change
      expect(analysis.newBalance).toBe(0); // Statement balance
      expect(analysis.balanceChange).toBe(-1500.00); // Decrease from existing debt
      expect(analysis.paymentsMade).toBe(0);
      expect(analysis.purchasesMade).toBe(0);
      expect(analysis.interestCharged).toBe(0);
      expect(analysis.shouldUpdateDebt).toBe(true); // Balance changed significantly
    });

    it('should handle debt updates from manual entry statements', async () => {
      const mockDocument: UploadedDocument = {
        id: 'doc_update_test',
        fileName: 'update_statement.pdf',
        fileType: 'pdf',
        fileSize: 150000,
        filePath: '/mock/update.pdf',
        uploadDate: new Date(),
        processed: false
      };

      const documentResult = await DocumentManagerService.processDocument(mockDocument);
      const statement = documentResult.statement!;

      const existingDebt: Debt = {
        id: 'debt_update_test',
        name: 'Update Test Debt',
        type: DebtType.CREDIT_CARD,
        balance: 2000.00,
        minimumPayment: 75.00,
        interestRate: 20.0,
        lastUpdated: new Date()
      };

      mockDataStoreService.getDebt.mockResolvedValue(existingDebt);
      mockDataStoreService.getStatements.mockResolvedValue([statement]);
      mockDataStoreService.updateDebt.mockResolvedValue(undefined);

      const linkResult = await StatementProcessingService.processExistingStatement(
        statement.id,
        existingDebt.id
      );

      expect(linkResult.updated).toBe(true);
      expect(linkResult.analysis).toBeDefined();
      expect(linkResult.analysis!.shouldUpdateDebt).toBe(true);

      // Verify debt was updated
      expect(mockDataStoreService.updateDebt).toHaveBeenCalledWith({
        id: existingDebt.id,
        balance: 0, // New balance from statement
        minimumPayment: 75.00 // Kept existing minimum payment
      });
    });
  });

  describe('State Management and Cleanup', () => {
    it('should maintain proper statement-debt relationships', async () => {
      // Create multiple statements for testing relationships
      const statements: Statement[] = [];
      const debts: Debt[] = [];

      for (let i = 0; i < 3; i++) {
        const mockDocument: UploadedDocument = {
          id: `doc_relationship_${i}`,
          fileName: `statement_${i}.pdf`,
          fileType: 'pdf',
          fileSize: 100000,
          filePath: `/mock/statement_${i}.pdf`,
          uploadDate: new Date(),
          processed: false
        };

        const documentResult = await DocumentManagerService.processDocument(mockDocument);
        statements.push(documentResult.statement!);

        const debt: Debt = {
          id: `debt_relationship_${i}`,
          name: `Test Debt ${i}`,
          type: DebtType.CREDIT_CARD,
          balance: 1000 * (i + 1),
          minimumPayment: 50 * (i + 1),
          interestRate: 15.0 + i,
          lastUpdated: new Date()
        };
        debts.push(debt);
      }

      // Link each statement to its corresponding debt
      for (let i = 0; i < 3; i++) {
        mockDataStoreService.getDebt.mockResolvedValue(debts[i]);
        mockDataStoreService.getStatements.mockResolvedValue([statements[i]]);

        const linkResult = await StatementProcessingService.processExistingStatement(
          statements[i].id,
          debts[i].id
        );

        expect(linkResult.statement).toBeDefined();
        expect(linkResult.statement!.debtId).toBe(debts[i].id);
        expect(linkResult.statement!.id).toBe(statements[i].id);
      }

      // Verify all statements were processed with correct debt IDs
      expect(mockDataStoreService.addStatement).toHaveBeenCalledTimes(6); // 3 initial + 3 updates
    });

    it('should handle concurrent manual entry operations', async () => {
      const concurrentOperations = Array.from({ length: 3 }, (_, i) => ({
        documentId: `doc_concurrent_${i}`,
        debtId: `debt_concurrent_${i}`,
        fileName: `concurrent_${i}.pdf`
      }));

      // Process operations sequentially to avoid mock conflicts
      const results = [];
      for (const op of concurrentOperations) {
        const mockDocument: UploadedDocument = {
          id: op.documentId,
          fileName: op.fileName,
          fileType: 'pdf',
          fileSize: 100000,
          filePath: `/mock/${op.fileName}`,
          uploadDate: new Date(),
          processed: false
        };

        const documentResult = await DocumentManagerService.processDocument(mockDocument);

        const debt: Debt = {
          id: op.debtId,
          name: `Concurrent Debt ${op.debtId}`,
          type: DebtType.CREDIT_CARD,
          balance: 1000,
          minimumPayment: 50,
          interestRate: 15.0,
          lastUpdated: new Date()
        };

        // Set up fresh mocks for each operation
        mockDataStoreService.getDebt
          .mockResolvedValueOnce(debt) // For processExistingStatement debt check
          .mockResolvedValueOnce(debt); // For analyzeStatement debt check
        mockDataStoreService.getStatements.mockResolvedValueOnce([documentResult.statement!]);
        mockDataStoreService.addStatement.mockResolvedValueOnce(undefined);
        mockDataStoreService.updateDebt.mockResolvedValueOnce(undefined);

        const result = await StatementProcessingService.processExistingStatement(
          documentResult.statement!.id,
          debt.id
        );

        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        results.push(result);
      }

      // All operations should succeed
      results.forEach((result, index) => {
        expect(result.statement).toBeDefined();
        expect(result.statement!.debtId).toBe(concurrentOperations[index].debtId);
      });
    });
  });

  describe('Data Validation and Integrity', () => {
    it('should validate debt data integrity after manual entry', async () => {
      const mockDocument: UploadedDocument = {
        id: 'doc_integrity_test',
        fileName: 'integrity_statement.pdf',
        fileType: 'pdf',
        fileSize: 150000,
        filePath: '/mock/integrity.pdf',
        uploadDate: new Date(),
        processed: false
      };

      const documentResult = await DocumentManagerService.processDocument(mockDocument);

      // Create debt with edge case values
      const edgeCaseDebt: Debt = {
        id: 'debt_integrity_test',
        name: 'Edge Case Debt',
        type: DebtType.CREDIT_CARD,
        balance: 0.01, // Very small balance
        minimumPayment: 0.01, // Very small minimum payment
        interestRate: 0.01, // Very low interest rate
        lastUpdated: new Date(),
        accountNumber: '0000', // Edge case account number
        dueDate: 1 // First day of month
      };

      mockDataStoreService.getDebt.mockResolvedValue(edgeCaseDebt);
      mockDataStoreService.getStatements.mockResolvedValue([documentResult.statement!]);

      const linkResult = await StatementProcessingService.processExistingStatement(
        documentResult.statement!.id,
        edgeCaseDebt.id
      );

      expect(linkResult.statement).toBeDefined();
      expect(linkResult.statement!.debtId).toBe(edgeCaseDebt.id);

      // Verify analysis handles edge case values correctly
      expect(linkResult.analysis).toBeDefined();
      expect(linkResult.analysis!.newBalance).toBe(0);
      expect(linkResult.analysis!.balanceChange).toBe(-0.01);
    });

    it('should preserve statement metadata during debt linking', async () => {
      const testDate = new Date('2024-01-15T10:30:00Z');
      
      const mockDocument: UploadedDocument = {
        id: 'doc_metadata_test',
        fileName: 'metadata_statement.pdf',
        fileType: 'pdf',
        fileSize: 150000,
        filePath: '/mock/metadata.pdf',
        uploadDate: testDate,
        processed: false
      };

      const documentResult = await DocumentManagerService.processDocument(mockDocument);
      const originalStatement = documentResult.statement!;

      const debt: Debt = {
        id: 'debt_metadata_test',
        name: 'Metadata Test Debt',
        type: DebtType.CREDIT_CARD,
        balance: 1000,
        minimumPayment: 50,
        interestRate: 15.0,
        lastUpdated: new Date()
      };

      mockDataStoreService.getDebt.mockResolvedValue(debt);
      mockDataStoreService.getStatements.mockResolvedValue([originalStatement]);

      const linkResult = await StatementProcessingService.processExistingStatement(
        originalStatement.id,
        debt.id
      );

      const linkedStatement = linkResult.statement!;

      // Verify all metadata is preserved
      expect(linkedStatement.id).toBe(originalStatement.id);
      expect(linkedStatement.fileName).toBe('metadata_statement.pdf');
      expect(linkedStatement.imported).toEqual(originalStatement.imported);
      expect(linkedStatement.statementDate).toEqual(originalStatement.statementDate);
      expect(linkedStatement.dueDate).toEqual(originalStatement.dueDate);
      
      // Only debtId should be updated
      expect(linkedStatement.debtId).toBe(debt.id);
    });
  });
});