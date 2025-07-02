import { DocumentValidationService, ValidationResult } from '../../src/services/DocumentValidationService';
import { UploadedDocument } from '../../src/services/DocumentUploadService';

// Mock PDFParsingService
jest.mock('../../src/services/PDFParsingService', () => ({
  PDFParsingService: {
    extractTextFromPDF: jest.fn(),
    parseCreditCardStatement: jest.fn(),
    validateStatementData: jest.fn(),
    getDataSummary: jest.fn()
  }
}));

const mockPDFParsingService = require('../../src/services/PDFParsingService');

describe('DocumentValidationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Interface Compliance Tests', () => {
    it('should handle complete UploadedDocument with all required fields', async () => {
      const validDocument: UploadedDocument = {
        id: 'doc_123',
        fileName: 'statement.pdf',
        filePath: '/valid/path/statement.pdf',
        fileType: 'pdf',
        fileSize: 150000,
        uploadDate: new Date(),
        processed: false
      };

      mockPDFParsingService.PDFParsingService.extractTextFromPDF.mockResolvedValue({
        text: 'PDF_REQUIRES_MANUAL_ENTRY:statement.pdf',
        pages: 1,
        info: { requiresManualEntry: true }
      });

      const result = await DocumentValidationService.validateDocument(validDocument);

      expect(result.isValid).toBe(true);
      expect(mockPDFParsingService.PDFParsingService.extractTextFromPDF).toHaveBeenCalledWith('/valid/path/statement.pdf');
    });

    it('should handle UploadedDocument with optional fields', async () => {
      const documentWithOptionals: UploadedDocument = {
        id: 'doc_456',
        fileName: 'statement.pdf',
        filePath: '/valid/path/statement.pdf',
        fileType: 'pdf',
        fileSize: 150000,
        uploadDate: new Date(),
        debtId: 'debt_123', // Optional field
        processed: false
      };

      mockPDFParsingService.PDFParsingService.extractTextFromPDF.mockResolvedValue({
        text: 'PDF_REQUIRES_MANUAL_ENTRY:statement.pdf',
        pages: 1,
        info: { requiresManualEntry: true }
      });

      const result = await DocumentValidationService.validateDocument(documentWithOptionals);

      expect(result.isValid).toBe(true);
    });
  });

  describe('Missing Field Tests', () => {
    it('should reject document with missing filePath', async () => {
      const documentMissingFilePath = {
        id: 'doc_789',
        fileName: 'statement.pdf',
        // filePath: missing!
        fileType: 'pdf' as const,
        fileSize: 150000,
        uploadDate: new Date(),
        processed: false
      } as UploadedDocument;

      const result = await DocumentValidationService.validateDocument(documentMissingFilePath);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('PDF document file path is missing');
      expect(mockPDFParsingService.PDFParsingService.extractTextFromPDF).not.toHaveBeenCalled();
    });

    it('should reject document with null filePath', async () => {
      const documentWithNullFilePath: UploadedDocument = {
        id: 'doc_null',
        fileName: 'statement.pdf',
        filePath: null as any,
        fileType: 'pdf',
        fileSize: 150000,
        uploadDate: new Date(),
        processed: false
      };

      const result = await DocumentValidationService.validateDocument(documentWithNullFilePath);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('PDF document file path is missing');
    });

    it('should reject document with empty filePath', async () => {
      const documentWithEmptyFilePath: UploadedDocument = {
        id: 'doc_empty',
        fileName: 'statement.pdf',
        filePath: '',
        fileType: 'pdf',
        fileSize: 150000,
        uploadDate: new Date(),
        processed: false
      };

      const result = await DocumentValidationService.validateDocument(documentWithEmptyFilePath);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('PDF document file path is missing');
    });
  });

  describe('File Size Validation Tests', () => {
    it('should reject oversized PDF files', async () => {
      const oversizedDocument: UploadedDocument = {
        id: 'doc_large',
        fileName: 'large_statement.pdf',
        filePath: '/path/large_statement.pdf',
        fileType: 'pdf',
        fileSize: 15 * 1024 * 1024, // 15MB - over 10MB limit
        uploadDate: new Date(),
        processed: false
      };

      const result = await DocumentValidationService.validateDocument(oversizedDocument);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('PDF file is too large (max 10MB)');
      expect(mockPDFParsingService.PDFParsingService.extractTextFromPDF).not.toHaveBeenCalled();
    });

    it('should accept files at the size limit', async () => {
      const limitSizeDocument: UploadedDocument = {
        id: 'doc_limit',
        fileName: 'limit_statement.pdf',
        filePath: '/path/limit_statement.pdf',
        fileType: 'pdf',
        fileSize: 10 * 1024 * 1024, // Exactly 10MB
        uploadDate: new Date(),
        processed: false
      };

      mockPDFParsingService.PDFParsingService.extractTextFromPDF.mockResolvedValue({
        text: 'PDF_REQUIRES_MANUAL_ENTRY:limit_statement.pdf',
        pages: 1,
        info: { requiresManualEntry: true }
      });

      const result = await DocumentValidationService.validateDocument(limitSizeDocument);

      expect(result.isValid).toBe(true);
    });

    it('should reject zero-size files', async () => {
      const zeroSizeDocument: UploadedDocument = {
        id: 'doc_zero',
        fileName: 'zero_statement.pdf',
        filePath: '/path/zero_statement.pdf',
        fileType: 'pdf',
        fileSize: 0,
        uploadDate: new Date(),
        processed: false
      };

      const result = await DocumentValidationService.validateDocument(zeroSizeDocument);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('PDF file appears to be empty');
    });
  });

  describe('CSV Validation Tests', () => {
    it('should validate CSV with valid content', async () => {
      const csvDocument: UploadedDocument = {
        id: 'csv_doc',
        fileName: 'transactions.csv',
        filePath: '/path/transactions.csv',
        fileType: 'csv',
        fileSize: 5000,
        uploadDate: new Date(),
        processed: false
      };

      const csvContent = 'date,amount,description\n2024-01-01,100.00,Purchase\n2024-01-02,50.00,Another Purchase';

      const result = await DocumentValidationService.validateDocument(csvDocument, csvContent);

      expect(result.isValid).toBe(true);
    });

    it('should reject CSV with empty content', async () => {
      const csvDocument: UploadedDocument = {
        id: 'csv_empty',
        fileName: 'empty.csv',
        filePath: '/path/empty.csv',
        fileType: 'csv',
        fileSize: 0,
        uploadDate: new Date(),
        processed: false
      };

      const result = await DocumentValidationService.validateDocument(csvDocument, '');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('CSV file is empty');
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle PDF parsing errors gracefully', async () => {
      const validDocument: UploadedDocument = {
        id: 'doc_error',
        fileName: 'error_statement.pdf',
        filePath: '/path/error_statement.pdf',
        fileType: 'pdf',
        fileSize: 150000,
        uploadDate: new Date(),
        processed: false
      };

      mockPDFParsingService.PDFParsingService.extractTextFromPDF.mockRejectedValue(
        new Error('PDF processing failed: File not found')
      );

      const result = await DocumentValidationService.validateDocument(validDocument);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Failed to process PDF'))).toBe(true);
    });

    it('should handle unsupported file types', async () => {
      const unsupportedDocument = {
        id: 'doc_unsupported',
        fileName: 'document.txt',
        filePath: '/path/document.txt',
        fileType: 'txt' as any, // Not 'csv' or 'pdf'
        fileSize: 1000,
        uploadDate: new Date(),
        processed: false
      } as UploadedDocument;

      const result = await DocumentValidationService.validateDocument(unsupportedDocument);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unsupported file type');
    });
  });

  describe('Type Safety Tests', () => {
    it('should handle documents with missing required fields at runtime', async () => {
      // Simulate what might happen if the interface isn't followed
      const malformedDocument = {
        // Missing id, fileName, fileType, etc.
        filePath: '/path/statement.pdf',
        fileSize: 150000
      } as any;

      // This should not crash but should handle gracefully
      const result = await DocumentValidationService.validateDocument(malformedDocument);
      
      // The function should still return a result (even if it fails validation)
      expect(result).toBeDefined();
      expect(result.isValid).toBeDefined();
      expect(result.errors).toBeDefined();
    });

    it('should handle completely null/undefined document', async () => {
      const result1 = await DocumentValidationService.validateDocument(null as any);
      expect(result1.isValid).toBe(false);

      const result2 = await DocumentValidationService.validateDocument(undefined as any);
      expect(result2.isValid).toBe(false);
    });
  });

  describe('FilePath Format Tests', () => {
    it('should handle various filePath formats', async () => {
      const testCases = [
        '/unix/style/path/statement.pdf',
        'C:\\Windows\\style\\path\\statement.pdf',
        './relative/path/statement.pdf',
        '../parent/path/statement.pdf',
        'just-filename.pdf'
      ];

      for (const filePath of testCases) {
        const document: UploadedDocument = {
          id: `doc_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`,
          fileName: 'statement.pdf',
          filePath,
          fileType: 'pdf',
          fileSize: 150000,
          uploadDate: new Date(),
          processed: false
        };

        mockPDFParsingService.PDFParsingService.extractTextFromPDF.mockResolvedValue({
          text: 'PDF_REQUIRES_MANUAL_ENTRY:statement.pdf',
          pages: 1,
          info: { requiresManualEntry: true }
        });

        const result = await DocumentValidationService.validateDocument(document);
        
        expect(result.isValid).toBe(true);
        expect(mockPDFParsingService.PDFParsingService.extractTextFromPDF).toHaveBeenCalledWith(filePath);
      }
    });
  });
});