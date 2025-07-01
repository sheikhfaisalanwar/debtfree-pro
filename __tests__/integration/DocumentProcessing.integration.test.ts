import { DocumentValidationService } from '../../src/services/DocumentValidationService';
import { DocumentManagerService } from '../../src/services/DocumentManagerService';
import { UploadedDocument } from '../../src/services/DocumentUploadService';
import fs from 'fs';
import path from 'path';

describe('Document Processing Integration Tests', () => {
  const fixturesPath = path.join(__dirname, '../fixtures');

  const readFixtureFile = (filename: string): string => {
    return fs.readFileSync(path.join(fixturesPath, filename), 'utf8');
  };

  const createMockDocument = (filename: string, type: 'csv' | 'pdf'): UploadedDocument => ({
    id: `doc_${Date.now()}`,
    fileName: filename,
    filePath: path.join(fixturesPath, filename),
    fileType: type,
    fileSize: fs.statSync(path.join(fixturesPath, filename)).size,
    uploadDate: new Date(),
    processed: false,
  });

  describe('Credit Card Statement Processing', () => {
    it('should validate and process sample credit card CSV', async () => {
      const csvContent = readFixtureFile('sample-credit-card.csv');
      const mockDocument = createMockDocument('sample-credit-card.csv', 'csv');

      const validationResult = await DocumentValidationService.validateDocument(mockDocument, csvContent);

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
      expect(validationResult.detectedType).toBe('credit_card');
      expect(validationResult.warnings.some(w => w.includes('Successfully parsed'))).toBe(true);

      const summary = DocumentValidationService.getValidationSummary(validationResult);
      expect(summary).toContain('✅ Document is valid');
      expect(summary).toContain('📄 Detected type: credit card');
    });

    it('should extract statement data from credit card CSV', async () => {
      const csvContent = readFixtureFile('sample-credit-card.csv');
      const mockDocument = createMockDocument('sample-credit-card.csv', 'csv');
      mockDocument.debtId = 'credit_card_001';

      jest.spyOn(require('../../src/services/DocumentUploadService').DocumentUploadService, 'readDocumentContent')
        .mockResolvedValue(csvContent);
      jest.spyOn(require('../../src/services/DocumentValidationService').DocumentValidationService, 'validateDocument')
        .mockResolvedValue({
          isValid: true,
          errors: [],
          warnings: ['Successfully parsed 15 transactions'],
          detectedType: 'credit_card'
        });

      const result = await DocumentManagerService.processDocument(mockDocument);

      expect(result.success).toBe(true);
      expect(result.statement).toBeDefined();
      expect(result.statement?.debtId).toBe('credit_card_001');
      expect(result.statement?.purchases.length).toBeGreaterThan(10);
      expect(result.statement?.payments.length).toBeGreaterThan(0);

      const totalPurchases = result.statement?.purchases.reduce((sum, p) => sum + p.amount, 0) || 0;
      const totalPayments = result.statement?.payments.reduce((sum, p) => sum + p.amount, 0) || 0;
      expect(totalPurchases).toBeGreaterThan(0);
      expect(totalPayments).toBeGreaterThan(0);

      const categorizedTransactions = result.statement?.purchases.filter(p => p.category !== 'Other') || [];
      expect(categorizedTransactions.length).toBeGreaterThan(0);
    });
  });

  describe('Bank Statement Processing', () => {
    it('should validate and process sample bank statement CSV', async () => {
      const csvContent = readFixtureFile('sample-bank-statement.csv');
      const mockDocument = createMockDocument('sample-bank-statement.csv', 'csv');

      const validationResult = await DocumentValidationService.validateDocument(mockDocument, csvContent);

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
      expect(validationResult.warnings.some(w => w.includes('Successfully parsed'))).toBe(true);
    });

    it('should handle different date formats in bank statements', async () => {
      const csvContent = readFixtureFile('sample-bank-statement.csv');
      const mockDocument = createMockDocument('sample-bank-statement.csv', 'csv');

      const validationResult = await DocumentValidationService.validateDocument(mockDocument, csvContent);

      expect(validationResult.isValid).toBe(true);
      
      const lines = csvContent.split('\n');
      expect(lines[1]).toContain('01/01/2024'); // MM/DD/YYYY format
      expect(validationResult.errors).toHaveLength(0);
    });
  });

  describe('Line of Credit Processing', () => {
    it('should validate and process line of credit CSV', async () => {
      const csvContent = readFixtureFile('sample-line-of-credit.csv');
      const mockDocument = createMockDocument('sample-line-of-credit.csv', 'csv');

      const validationResult = await DocumentValidationService.validateDocument(mockDocument, csvContent);

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
      expect(validationResult.detectedType).toBe('line_of_credit');
    });

    it('should handle debit/credit format correctly', async () => {
      const csvContent = readFixtureFile('sample-line-of-credit.csv');
      const mockDocument = createMockDocument('sample-line-of-credit.csv', 'csv');
      mockDocument.debtId = 'line_of_credit_001';

      jest.spyOn(require('../../src/services/DocumentUploadService').DocumentUploadService, 'readDocumentContent')
        .mockResolvedValue(csvContent);
      jest.spyOn(require('../../src/services/DocumentValidationService').DocumentValidationService, 'validateDocument')
        .mockResolvedValue({
          isValid: true,
          errors: [],
          warnings: ['Successfully parsed 14 transactions'],
          detectedType: 'line_of_credit'
        });

      const result = await DocumentManagerService.processDocument(mockDocument);

      expect(result.success).toBe(true);
      expect(result.statement).toBeDefined();
      
      const hasAdvances = result.statement?.payments.some(p => p.description.includes('ADVANCE')) || false;
      const hasPayments = result.statement?.payments.some(p => p.description.includes('PAYMENT')) || false;
      
      expect(hasAdvances || hasPayments).toBe(true);
    });
  });

  describe('Error Handling in Real Data', () => {
    it('should handle malformed CSV gracefully', async () => {
      const malformedCsv = `Date,Amount,Description
2024-01-01,100.50,"Incomplete quote
2024-01-02,25.75,Valid transaction
Invalid date,50.00,Invalid date row`;

      const mockDocument: UploadedDocument = {
        id: 'doc_malformed',
        fileName: 'malformed.csv',
        filePath: '/mock/path/malformed.csv',
        fileType: 'csv',
        fileSize: malformedCsv.length,
        uploadDate: new Date(),
        processed: false,
      };

      const validationResult = await DocumentValidationService.validateDocument(mockDocument, malformedCsv);

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.length).toBeGreaterThan(0);
    });

    it('should provide meaningful error messages for common issues', async () => {
      const invalidAmountsCsv = `Date,Amount,Description
2024-01-01,not-a-number,Invalid amount
2024-01-02,$invalid$,Invalid currency format
2024-01-03,25.75,Valid transaction`;

      const mockDocument: UploadedDocument = {
        id: 'doc_invalid_amounts',
        fileName: 'invalid-amounts.csv',
        filePath: '/mock/path/invalid-amounts.csv',
        fileType: 'csv',
        fileSize: invalidAmountsCsv.length,
        uploadDate: new Date(),
        processed: false,
      };

      const validationResult = await DocumentValidationService.validateDocument(mockDocument, invalidAmountsCsv);

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.some(e => e.includes('Invalid amount format'))).toBe(true);
    });
  });

  describe('Transaction Categorization', () => {
    it('should categorize transactions from real sample data', async () => {
      const csvContent = readFixtureFile('sample-credit-card.csv');
      const mockDocument = createMockDocument('sample-credit-card.csv', 'csv');

      jest.spyOn(require('../../src/services/DocumentUploadService').DocumentUploadService, 'readDocumentContent')
        .mockResolvedValue(csvContent);
      jest.spyOn(require('../../src/services/DocumentValidationService').DocumentValidationService, 'validateDocument')
        .mockResolvedValue({
          isValid: true,
          errors: [],
          warnings: [],
          detectedType: 'credit_card'
        });

      const result = await DocumentManagerService.processDocument(mockDocument);

      expect(result.success).toBe(true);
      expect(result.statement?.purchases).toBeDefined();

      const categories = result.statement?.purchases.map(p => p.category) || [];
      const uniqueCategories = Array.from(new Set(categories));

      expect(uniqueCategories).toContain('Food & Dining');
      expect(uniqueCategories).toContain('Transportation');
      expect(uniqueCategories).toContain('Shopping');

      const foodTransactions = result.statement?.purchases.filter(p => p.category === 'Food & Dining') || [];
      expect(foodTransactions.length).toBeGreaterThan(0);
      expect(foodTransactions.some(t => t.description.toLowerCase().includes('restaurant') || 
                                      t.description.toLowerCase().includes('starbucks') ||
                                      t.description.toLowerCase().includes('mcdonald'))).toBe(true);
    });
  });

  describe('Document Summary Generation', () => {
    it('should generate accurate summaries for processed documents', async () => {
      const csvContent = readFixtureFile('sample-credit-card.csv');
      const mockDocument = createMockDocument('sample-credit-card.csv', 'csv');
      mockDocument.debtId = 'test_debt';

      jest.spyOn(require('../../src/services/DocumentUploadService').DocumentUploadService, 'readDocumentContent')
        .mockResolvedValue(csvContent);
      jest.spyOn(require('../../src/services/DocumentValidationService').DocumentValidationService, 'validateDocument')
        .mockResolvedValue({
          isValid: true,
          errors: [],
          warnings: [],
          detectedType: 'credit_card'
        });

      const result = await DocumentManagerService.processDocument(mockDocument);
      
      if (result.success && result.document) {
        const summary = DocumentManagerService.getDocumentSummary(result.document);

        expect(summary).toContain('sample-credit-card.csv');
        expect(summary).toContain('CSV');
        expect(summary).toContain('✅ Valid');
        expect(summary).toContain('credit card');
        expect(summary).toContain('transactions');
      }
    });
  });

  describe('Performance with Large Files', () => {
    it('should handle large CSV files efficiently', async () => {
      const largeTransactionCount = 100;
      const largeCsvLines = ['Date,Amount,Description'];
      
      for (let i = 1; i <= largeTransactionCount; i++) {
        const date = new Date(2024, 0, i % 30 + 1).toISOString().split('T')[0];
        const amount = (Math.random() * 200).toFixed(2);
        const description = `Transaction ${i} - Random Purchase`;
        largeCsvLines.push(`${date},${amount},${description}`);
      }
      
      const largeCsvContent = largeCsvLines.join('\n');
      
      const mockDocument: UploadedDocument = {
        id: 'doc_large',
        fileName: 'large-statement.csv',
        filePath: '/mock/path/large-statement.csv',
        fileType: 'csv',
        fileSize: largeCsvContent.length,
        uploadDate: new Date(),
        processed: false,
      };

      const startTime = Date.now();
      const validationResult = await DocumentValidationService.validateDocument(mockDocument, largeCsvContent);
      const endTime = Date.now();

      expect(validationResult.isValid).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(validationResult.warnings.some(w => w.includes(`${largeTransactionCount} transactions`))).toBe(true);
    });
  });
});