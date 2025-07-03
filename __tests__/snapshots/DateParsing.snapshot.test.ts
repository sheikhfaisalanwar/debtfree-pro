import { PDFParsingService } from '../../src/services/PDFParsingService';
import { DataStoreService } from '../../src/services/DataStoreService';

describe('Date Parsing Snapshot Tests', () => {
  describe('PDFParsingService Date Extraction', () => {
    it('should parse dates correctly from statement text', () => {
      const sampleStatementText = `
        STATEMENT DATE: 01/15/2024
        DUE DATE: 02/15/2024
        PAYMENT DUE DATE: 02/15/2024
        CLOSING DATE: 01/15/2024
      `;

      const result = PDFParsingService.parseCreditCardStatement(sampleStatementText);
      
      expect({
        statementDate: result.statementDate?.toISOString(),
        dueDate: result.dueDate?.toISOString(),
        statementDateValid: result.statementDate instanceof Date && !isNaN(result.statementDate.getTime()),
        dueDateValid: result.dueDate instanceof Date && !isNaN(result.dueDate.getTime())
      }).toMatchSnapshot();
    });

    it('should handle various date formats', () => {
      const testCases = [
        'STATEMENT DATE: 01/15/2024',
        'STATEMENT DATE: 1/15/24', 
        'STATEMENT DATE: 01-15-2024',
        'DUE DATE: 12/31/2024',
        'DUE DATE: 2/28/24'
      ];

      const results = testCases.map(text => {
        const parsed = PDFParsingService.parseCreditCardStatement(text);
        return {
          input: text,
          statementDate: parsed.statementDate?.toISOString(),
          dueDate: parsed.dueDate?.toISOString(),
          statementDateValid: parsed.statementDate instanceof Date && !isNaN(parsed.statementDate.getTime()),
          dueDateValid: parsed.dueDate instanceof Date && !isNaN(parsed.dueDate.getTime())
        };
      });

      expect(results).toMatchSnapshot();
    });

    it('should handle invalid date formats gracefully', () => {
      const invalidDates = [
        'STATEMENT DATE: 13/45/2024', // Invalid month/day
        'DUE DATE: 02/30/2024',       // Invalid day for February
        'STATEMENT DATE: invalid',     // Non-date text
        'DUE DATE: 00/00/0000'        // Zero dates
      ];

      const results = invalidDates.map(text => {
        const parsed = PDFParsingService.parseCreditCardStatement(text);
        return {
          input: text,
          statementDate: parsed.statementDate,
          dueDate: parsed.dueDate,
          hasValidStatementDate: parsed.statementDate instanceof Date && !isNaN(parsed.statementDate.getTime()),
          hasValidDueDate: parsed.dueDate instanceof Date && !isNaN(parsed.dueDate.getTime())
        };
      });

      expect(results).toMatchSnapshot();
    });
  });

  describe('DataStoreService Date Serialization', () => {
    it('should serialize dates correctly to JSON', () => {
      const testDate = new Date('2024-01-15T10:30:00.000Z');
      const testData = {
        version: '2.0.0',
        accounts: [{
          id: '1',
          name: 'Test Account',
          type: 'CREDIT_CARD',
          institution: 'Test Bank',
          createdDate: testDate,
          lastUpdated: testDate
        }],
        balances: [{
          id: 'bal_1',
          accountId: '1',
          balance: 1000,
          minimumPayment: 50,
          interestRate: 18.99,
          balanceDate: testDate,
          lastUpdated: testDate
        }],
        documents: [{
          id: 'doc_1',
          fileName: 'test.pdf',
          filePath: '/path/to/test.pdf',
          fileType: 'PDF_STATEMENT',
          fileSize: 1024,
          uploadDate: testDate,
          lastModified: testDate,
          processed: false,
          processingStatus: 'PENDING'
        }],
        statements: [{
          id: 'stmt_1',
          accountId: '1',
          statementDate: testDate,
          dueDate: testDate,
          balance: 1000,
          minimumPayment: 50,
          interestCharged: 15,
          transactions: [{
            id: 'txn_1',
            date: testDate,
            amount: 100,
            description: 'Test Transaction',
            type: 'purchase'
          }],
          payments: [{
            id: 'pay_1',
            date: testDate,
            amount: 200,
            description: 'Test Payment',
            type: 'payment'
          }],
          importedDate: testDate,
          lastUpdated: testDate
        }],
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
          createdDate: testDate,
          lastUpdated: testDate,
          dataVersion: '2.0.0',
          totalMigrations: 0
        }
      };

      // Test serialization
      const serialized = (DataStoreService as any).serializeDataStore(testData);
      
      expect({
        serializedType: typeof serialized,
        accountCreatedDate: serialized.accounts[0].createdDate,
        balanceDate: serialized.balances[0].balanceDate,
        documentUploadDate: serialized.documents[0].uploadDate,
        statementDate: serialized.statements[0].statementDate,
        transactionDate: serialized.statements[0].transactions[0].date,
        paymentDate: serialized.statements[0].payments[0].date,
        metadataCreatedDate: serialized.metadata.createdDate
      }).toMatchSnapshot();
    });

    it('should parse dates correctly from JSON', () => {
      const serializedData = {
        version: '2.0.0',
        accounts: [{
          id: '1',
          name: 'Test Account',
          type: 'CREDIT_CARD',
          institution: 'Test Bank',
          createdDate: '2024-01-15T10:30:00.000Z',
          lastUpdated: '2024-01-15T10:30:00.000Z'
        }],
        balances: [{
          id: 'bal_1',
          accountId: '1',
          balance: 1000,
          minimumPayment: 50,
          interestRate: 18.99,
          balanceDate: '2024-01-15T10:30:00.000Z',
          lastUpdated: '2024-01-15T10:30:00.000Z'
        }],
        documents: [{
          id: 'doc_1',
          fileName: 'test.pdf',
          filePath: '/path/to/test.pdf',
          fileType: 'PDF_STATEMENT',
          fileSize: 1024,
          uploadDate: '2024-01-15T10:30:00.000Z',
          lastModified: '2024-01-15T10:30:00.000Z',
          processed: false,
          processingStatus: 'PENDING'
        }],
        statements: [{
          id: 'stmt_1',
          accountId: '1',
          statementDate: '2024-01-15T10:30:00.000Z',
          dueDate: '2024-02-15T10:30:00.000Z',
          balance: 1000,
          minimumPayment: 50,
          interestCharged: 15,
          transactions: [{
            id: 'txn_1',
            date: '2024-01-15T10:30:00.000Z',
            amount: 100,
            description: 'Test Transaction',
            type: 'purchase'
          }],
          payments: [{
            id: 'pay_1',
            date: '2024-01-15T10:30:00.000Z',
            amount: 200,
            description: 'Test Payment',
            type: 'payment'
          }],
          importedDate: '2024-01-15T10:30:00.000Z',
          lastUpdated: '2024-01-15T10:30:00.000Z'
        }],
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
          createdDate: '2024-01-15T10:30:00.000Z',
          lastUpdated: '2024-01-15T10:30:00.000Z',
          dataVersion: '2.0.0',
          totalMigrations: 0
        }
      };

      // Test parsing
      const parsed = (DataStoreService as any).parseDataStore(serializedData);
      
      expect({
        accountCreatedDateType: typeof parsed.accounts[0].createdDate,
        accountCreatedDateValid: parsed.accounts[0].createdDate instanceof Date && !isNaN(parsed.accounts[0].createdDate.getTime()),
        balanceDateType: typeof parsed.balances[0].balanceDate,
        balanceDateValid: parsed.balances[0].balanceDate instanceof Date && !isNaN(parsed.balances[0].balanceDate.getTime()),
        documentUploadDateType: typeof parsed.documents[0].uploadDate,
        documentUploadDateValid: parsed.documents[0].uploadDate instanceof Date && !isNaN(parsed.documents[0].uploadDate.getTime()),
        statementDateType: typeof parsed.statements[0].statementDate,
        statementDateValid: parsed.statements[0].statementDate instanceof Date && !isNaN(parsed.statements[0].statementDate.getTime()),
        transactionDateType: typeof parsed.statements[0].transactions[0].date,
        transactionDateValid: parsed.statements[0].transactions[0].date instanceof Date && !isNaN(parsed.statements[0].transactions[0].date.getTime()),
        paymentDateType: typeof parsed.statements[0].payments[0].date,
        paymentDateValid: parsed.statements[0].payments[0].date instanceof Date && !isNaN(parsed.statements[0].payments[0].date.getTime()),
        metadataCreatedDateType: typeof parsed.metadata.createdDate,
        metadataCreatedDateValid: parsed.metadata.createdDate instanceof Date && !isNaN(parsed.metadata.createdDate.getTime())
      }).toMatchSnapshot();
    });

    it('should handle invalid date strings gracefully', () => {
      const invalidDateData = {
        version: '2.0.0',
        accounts: [{
          id: '1',
          name: 'Test Account',
          type: 'CREDIT_CARD',
          institution: 'Test Bank',
          createdDate: 'invalid-date-string',
          lastUpdated: 'another-invalid-date'
        }],
        balances: [{
          id: 'bal_1',
          accountId: '1',
          balance: 1000,
          minimumPayment: 50,
          interestRate: 18.99,
          balanceDate: 'not-a-date',
          lastUpdated: 'also-not-a-date'
        }],
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
          createdDate: 'bad-date',
          lastUpdated: 'worse-date',
          dataVersion: '2.0.0',
          totalMigrations: 0
        }
      };

      try {
        const parsed = (DataStoreService as any).parseDataStore(invalidDateData);
        
        expect({
          accountCreatedDateValid: parsed.accounts[0].createdDate instanceof Date && !isNaN(parsed.accounts[0].createdDate.getTime()),
          accountLastUpdatedValid: parsed.accounts[0].lastUpdated instanceof Date && !isNaN(parsed.accounts[0].lastUpdated.getTime()),
          balanceDateValid: parsed.balances[0].balanceDate instanceof Date && !isNaN(parsed.balances[0].balanceDate.getTime()),
          balanceLastUpdatedValid: parsed.balances[0].lastUpdated instanceof Date && !isNaN(parsed.balances[0].lastUpdated.getTime()),
          metadataCreatedDateValid: parsed.metadata.createdDate instanceof Date && !isNaN(parsed.metadata.createdDate.getTime()),
          metadataLastUpdatedValid: parsed.metadata.lastUpdated instanceof Date && !isNaN(parsed.metadata.lastUpdated.getTime())
        }).toMatchSnapshot();
      } catch (error) {
        expect({
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: typeof error
        }).toMatchSnapshot();
      }
    });
  });
});