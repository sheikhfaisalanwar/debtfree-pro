import { DocumentValidationService, ValidationResult } from '../../src/services/DocumentValidationService';
import { UploadedDocument } from '../../src/services/DocumentUploadService';

describe('DocumentValidationService', () => {
  describe('validateDocument', () => {
    it('should validate a valid CSV document', async () => {
      const mockDocument: UploadedDocument = {
        id: 'doc_123',
        fileName: 'statement.csv',
        filePath: '/mock/path/statement.csv',
        fileType: 'csv',
        fileSize: 1024,
        uploadDate: new Date(),
        processed: false,
      };

      const csvContent = `Date,Amount,Description
2024-01-01,100.50,Grocery Store
2024-01-02,-50.00,Payment
2024-01-03,25.75,Gas Station`;

      const result = await DocumentValidationService.validateDocument(mockDocument, csvContent);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.detectedType).toBeDefined();
    });

    it('should reject empty CSV content', async () => {
      const mockDocument: UploadedDocument = {
        id: 'doc_123',
        fileName: 'empty.csv',
        filePath: '/mock/path/empty.csv',
        fileType: 'csv',
        fileSize: 0,
        uploadDate: new Date(),
        processed: false,
      };

      const result = await DocumentValidationService.validateDocument(mockDocument, '');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('CSV file is empty');
    });

    it('should reject CSV with insufficient data', async () => {
      const mockDocument: UploadedDocument = {
        id: 'doc_123',
        fileName: 'minimal.csv',
        filePath: '/mock/path/minimal.csv',
        fileType: 'csv',
        fileSize: 50,
        uploadDate: new Date(),
        processed: false,
      };

      const csvContent = 'Date,Amount,Description';

      const result = await DocumentValidationService.validateDocument(mockDocument, csvContent);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('CSV file must contain at least a header row and one data row');
    });

    it('should reject CSV with invalid headers', async () => {
      const mockDocument: UploadedDocument = {
        id: 'doc_123',
        fileName: 'invalid.csv',
        filePath: '/mock/path/invalid.csv',
        fileType: 'csv',
        fileSize: 100,
        uploadDate: new Date(),
        processed: false,
      };

      const csvContent = `Invalid,Headers,Format
2024-01-01,100.50,Test`;

      const result = await DocumentValidationService.validateDocument(mockDocument, csvContent);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('CSV headers not recognized');
    });

    it('should validate different CSV header formats', async () => {
      const mockDocument: UploadedDocument = {
        id: 'doc_123',
        fileName: 'transaction.csv',
        filePath: '/mock/path/transaction.csv',
        fileType: 'csv',
        fileSize: 200,
        uploadDate: new Date(),
        processed: false,
      };

      const csvContent = `Transaction Date,Transaction Amount,Description
01/01/2024,100.50,Purchase
01/02/2024,25.75,Gas`;

      const result = await DocumentValidationService.validateDocument(mockDocument, csvContent);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate debit/credit format CSV', async () => {
      const mockDocument: UploadedDocument = {
        id: 'doc_123',
        fileName: 'bank.csv',
        filePath: '/mock/path/bank.csv',
        fileType: 'csv',
        fileSize: 200,
        uploadDate: new Date(),
        processed: false,
      };

      const csvContent = `Date,Debit,Credit,Description
2024-01-01,100.50,,Purchase
2024-01-02,,200.00,Payment`;

      const result = await DocumentValidationService.validateDocument(mockDocument, csvContent);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid date formats', async () => {
      const mockDocument: UploadedDocument = {
        id: 'doc_123',
        fileName: 'invalid_dates.csv',
        filePath: '/mock/path/invalid_dates.csv',
        fileType: 'csv',
        fileSize: 150,
        uploadDate: new Date(),
        processed: false,
      };

      const csvContent = `Date,Amount,Description
invalid-date,100.50,Test
2024-01-02,25.75,Valid`;

      const result = await DocumentValidationService.validateDocument(mockDocument, csvContent);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Invalid date format'))).toBe(true);
    });

    it('should detect invalid amount formats', async () => {
      const mockDocument: UploadedDocument = {
        id: 'doc_123',
        fileName: 'invalid_amounts.csv',
        filePath: '/mock/path/invalid_amounts.csv',
        fileType: 'csv',
        fileSize: 150,
        uploadDate: new Date(),
        processed: false,
      };

      const csvContent = `Date,Amount,Description
2024-01-01,invalid-amount,Test
2024-01-02,25.75,Valid`;

      const result = await DocumentValidationService.validateDocument(mockDocument, csvContent);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Invalid amount format'))).toBe(true);
    });

    it('should validate PDF documents', async () => {
      const mockDocument: UploadedDocument = {
        id: 'doc_456',
        fileName: 'statement.pdf',
        filePath: '/mock/path/statement.pdf',
        fileType: 'pdf',
        fileSize: 1024 * 1024, // 1MB
        uploadDate: new Date(),
        processed: false,
      };

      const result = await DocumentValidationService.validateDocument(mockDocument);

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(warning => warning.includes('PDF validation is basic'))).toBe(true);
    });

    it('should reject empty PDF files', async () => {
      const mockDocument: UploadedDocument = {
        id: 'doc_456',
        fileName: 'empty.pdf',
        filePath: '/mock/path/empty.pdf',
        fileType: 'pdf',
        fileSize: 0,
        uploadDate: new Date(),
        processed: false,
      };

      const result = await DocumentValidationService.validateDocument(mockDocument);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('PDF file appears to be empty');
    });

    it('should reject oversized PDF files', async () => {
      const mockDocument: UploadedDocument = {
        id: 'doc_456',
        fileName: 'large.pdf',
        filePath: '/mock/path/large.pdf',
        fileType: 'pdf',
        fileSize: 11 * 1024 * 1024, // 11MB
        uploadDate: new Date(),
        processed: false,
      };

      const result = await DocumentValidationService.validateDocument(mockDocument);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('PDF file is too large (max 10MB)');
    });
  });

  describe('document type detection', () => {
    it('should detect credit card statements', async () => {
      const mockDocument: UploadedDocument = {
        id: 'doc_123',
        fileName: 'credit_card.csv',
        filePath: '/mock/path/credit_card.csv',
        fileType: 'csv',
        fileSize: 500,
        uploadDate: new Date(),
        processed: false,
      };

      const csvContent = `Date,Amount,Description
2024-01-01,100.50,PURCHASE GROCERY STORE
2024-01-02,25.75,CREDIT CARD PAYMENT DUE
2024-01-03,50.00,STATEMENT BALANCE`;

      const result = await DocumentValidationService.validateDocument(mockDocument, csvContent);

      expect(result.detectedType).toBe('credit_card');
    });

    it('should detect line of credit statements', async () => {
      const mockDocument: UploadedDocument = {
        id: 'doc_123',
        fileName: 'line_of_credit.csv',
        filePath: '/mock/path/line_of_credit.csv',
        fileType: 'csv',
        fileSize: 500,
        uploadDate: new Date(),
        processed: false,
      };

      const csvContent = `Date,Amount,Description
2024-01-01,1000.00,LINE OF CREDIT ADVANCE
2024-01-02,-500.00,PAYMENT TO CREDIT LINE
2024-01-03,200.00,AVAILABLE BALANCE UPDATE`;

      const result = await DocumentValidationService.validateDocument(mockDocument, csvContent);

      expect(result.detectedType).toBe('line_of_credit');
    });

    it('should default to unknown type for ambiguous content', async () => {
      const mockDocument: UploadedDocument = {
        id: 'doc_123',
        fileName: 'generic.csv',
        filePath: '/mock/path/generic.csv',
        fileType: 'csv',
        fileSize: 200,
        uploadDate: new Date(),
        processed: false,
      };

      const csvContent = `Date,Amount,Description
2024-01-01,100.50,Some transaction
2024-01-02,25.75,Another transaction`;

      const result = await DocumentValidationService.validateDocument(mockDocument, csvContent);

      expect(result.detectedType).toBe('unknown');
    });
  });

  describe('CSV parsing edge cases', () => {
    it('should handle CSV with quoted fields', async () => {
      const mockDocument: UploadedDocument = {
        id: 'doc_123',
        fileName: 'quoted.csv',
        filePath: '/mock/path/quoted.csv',
        fileType: 'csv',
        fileSize: 300,
        uploadDate: new Date(),
        processed: false,
      };

      const csvContent = `Date,Amount,Description
"2024-01-01","100.50","Purchase at ""Best Store"""
"2024-01-02","25.75","Gas, oil change"`;

      const result = await DocumentValidationService.validateDocument(mockDocument, csvContent);

      expect(result.isValid).toBe(true);
    });

    it('should handle mixed valid and invalid rows', async () => {
      const mockDocument: UploadedDocument = {
        id: 'doc_123',
        fileName: 'mixed.csv',
        filePath: '/mock/path/mixed.csv',
        fileType: 'csv',
        fileSize: 400,
        uploadDate: new Date(),
        processed: false,
      };

      const csvContent = `Date,Amount,Description
2024-01-01,100.50,Valid transaction
invalid-date,25.75,Invalid date
2024-01-03,invalid-amount,Invalid amount
2024-01-04,50.00,Another valid transaction`;

      const result = await DocumentValidationService.validateDocument(mockDocument, csvContent);

      expect(result.isValid).toBe(false);
      expect(result.warnings.some(warning => warning.includes('rows contain errors'))).toBe(true);
    });

    it('should handle currency symbols in amounts', async () => {
      const mockDocument: UploadedDocument = {
        id: 'doc_123',
        fileName: 'currency.csv',
        filePath: '/mock/path/currency.csv',
        fileType: 'csv',
        fileSize: 250,
        uploadDate: new Date(),
        processed: false,
      };

      const csvContent = `Date,Amount,Description
2024-01-01,$100.50,Purchase with dollar sign
2024-01-02,"$1,250.75",Large amount with comma`;

      const result = await DocumentValidationService.validateDocument(mockDocument, csvContent);

      expect(result.isValid).toBe(true);
    });
  });

  describe('getValidationSummary', () => {
    it('should generate summary for valid document', () => {
      const validResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: ['Successfully parsed 5 transactions'],
        detectedType: 'credit_card'
      };

      const summary = DocumentValidationService.getValidationSummary(validResult);

      expect(summary).toContain('✅ Document is valid');
      expect(summary).toContain('📄 Detected type: credit card');
      expect(summary).toContain('⚠️ 1 warning(s)');
    });

    it('should generate summary for invalid document', () => {
      const invalidResult: ValidationResult = {
        isValid: false,
        errors: ['Invalid CSV headers', 'No valid data rows'],
        warnings: [],
        detectedType: 'unknown'
      };

      const summary = DocumentValidationService.getValidationSummary(invalidResult);

      expect(summary).toContain('❌ Document has errors');
      expect(summary).toContain('🚨 2 error(s)');
    });

    it('should handle result with no detected type', () => {
      const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
      };

      const summary = DocumentValidationService.getValidationSummary(result);

      expect(summary).toContain('✅ Document is valid');
      expect(summary).not.toContain('Detected type');
    });
  });
});