import { DocumentManagerService, ProcessedDocument } from '../../src/services/DocumentManagerService';
import { DocumentUploadService, UploadedDocument } from '../../src/services/DocumentUploadService';
import { DocumentValidationService, ValidationResult } from '../../src/services/DocumentValidationService';

jest.mock('../../src/services/DocumentUploadService');
jest.mock('../../src/services/DocumentValidationService');

const mockDocumentUploadService = DocumentUploadService as jest.Mocked<typeof DocumentUploadService>;
const mockDocumentValidationService = DocumentValidationService as jest.Mocked<typeof DocumentValidationService>;

describe('DocumentManagerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadAndProcessDocument', () => {
    it('should successfully upload and process a CSV document', async () => {
      const mockDocument: UploadedDocument = {
        id: 'doc_123',
        fileName: 'statement.csv',
        filePath: '/mock/path/statement.csv',
        fileType: 'csv',
        fileSize: 1024,
        uploadDate: new Date(),
        processed: false,
      };

      const mockValidationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: ['Successfully parsed 3 transactions'],
        detectedType: 'credit_card'
      };

      // Statement data will be extracted during processing

      mockDocumentUploadService.pickDocument.mockResolvedValue({
        success: true,
        document: mockDocument
      });
      mockDocumentUploadService.readDocumentContent.mockResolvedValue(`Date,Amount,Description
2024-01-01,100.50,Grocery Store
2024-01-02,-50.00,Payment
2024-01-03,25.75,Gas Station`);
      mockDocumentValidationService.validateDocument.mockResolvedValue(mockValidationResult);

      const result = await DocumentManagerService.uploadAndProcessDocument('debt_456');

      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();
      expect(result.document?.debtId).toBe('debt_456');
      expect(result.document?.processed).toBe(true);
      expect(result.statement).toBeDefined();
      expect(result.statement?.purchases).toHaveLength(2);
      expect(result.statement?.payments).toHaveLength(1);
    });

    it('should handle upload failure', async () => {
      mockDocumentUploadService.pickDocument.mockResolvedValue({
        success: false,
        error: 'User cancelled upload'
      });

      const result = await DocumentManagerService.uploadAndProcessDocument();

      expect(result.success).toBe(false);
      expect(result.error).toBe('User cancelled upload');
    });

    it('should handle validation failure', async () => {
      const mockDocument: UploadedDocument = {
        id: 'doc_123',
        fileName: 'invalid.csv',
        filePath: '/mock/path/invalid.csv',
        fileType: 'csv',
        fileSize: 100,
        uploadDate: new Date(),
        processed: false,
      };

      const mockValidationResult: ValidationResult = {
        isValid: false,
        errors: ['Invalid CSV headers'],
        warnings: []
      };

      mockDocumentUploadService.pickDocument.mockResolvedValue({
        success: true,
        document: mockDocument
      });
      mockDocumentUploadService.readDocumentContent.mockResolvedValue('Invalid,Headers\nData,Row');
      mockDocumentValidationService.validateDocument.mockResolvedValue(mockValidationResult);

      const result = await DocumentManagerService.uploadAndProcessDocument();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
      expect(result.document?.processingError).toBe('Document validation failed');
    });

    it('should handle processing errors', async () => {
      const mockDocument: UploadedDocument = {
        id: 'doc_123',
        fileName: 'statement.csv',
        filePath: '/mock/path/statement.csv',
        fileType: 'csv',
        fileSize: 1024,
        uploadDate: new Date(),
        processed: false,
      };

      mockDocumentUploadService.pickDocument.mockResolvedValue({
        success: true,
        document: mockDocument
      });
      mockDocumentUploadService.readDocumentContent.mockRejectedValue(new Error('File read error'));

      const result = await DocumentManagerService.uploadAndProcessDocument();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Document processing failed');
    });
  });

  describe('processDocument', () => {
    it('should process a valid CSV document', async () => {
      const mockDocument: UploadedDocument = {
        id: 'doc_123',
        fileName: 'statement.csv',
        filePath: '/mock/path/statement.csv',
        fileType: 'csv',
        fileSize: 1024,
        uploadDate: new Date(),
        processed: false,
      };

      const mockValidationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        detectedType: 'credit_card'
      };

      mockDocumentUploadService.readDocumentContent.mockResolvedValue(`Date,Amount,Description
2024-01-01,100.50,Store Purchase
2024-01-02,-25.00,Payment`);
      mockDocumentValidationService.validateDocument.mockResolvedValue(mockValidationResult);

      const result = await DocumentManagerService.processDocument(mockDocument);

      expect(result.success).toBe(true);
      expect(result.document?.processed).toBe(true);
      expect(result.document?.validationResult).toBe(mockValidationResult);
      expect(result.statement).toBeDefined();
    });

    it('should process a PDF document', async () => {
      const mockDocument: UploadedDocument = {
        id: 'doc_456',
        fileName: 'statement.pdf',
        filePath: '/mock/path/statement.pdf',
        fileType: 'pdf',
        fileSize: 2048,
        uploadDate: new Date(),
        processed: false,
      };

      const mockValidationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: ['PDF validation is basic'],
      };

      mockDocumentValidationService.validateDocument.mockResolvedValue(mockValidationResult);

      const result = await DocumentManagerService.processDocument(mockDocument);

      expect(result.success).toBe(true);
      expect(result.document?.processed).toBe(true);
      expect(result.statement).toBeUndefined(); // No statement extraction for PDF yet
    });

    it('should handle invalid documents', async () => {
      const mockDocument: UploadedDocument = {
        id: 'doc_123',
        fileName: 'invalid.csv',
        filePath: '/mock/path/invalid.csv',
        fileType: 'csv',
        fileSize: 50,
        uploadDate: new Date(),
        processed: false,
      };

      const mockValidationResult: ValidationResult = {
        isValid: false,
        errors: ['No valid data found'],
        warnings: []
      };

      mockDocumentUploadService.readDocumentContent.mockResolvedValue('Invalid content');
      mockDocumentValidationService.validateDocument.mockResolvedValue(mockValidationResult);

      const result = await DocumentManagerService.processDocument(mockDocument);

      expect(result.success).toBe(false);
      expect(result.document?.processingError).toBe('Document validation failed');
    });
  });

  describe('getProcessedDocuments', () => {
    it('should return all documents when no debtId filter', async () => {
      const mockDocuments: UploadedDocument[] = [
        {
          id: 'doc_123',
          fileName: 'statement1.csv',
          filePath: '/mock/path/statement1.csv',
          fileType: 'csv',
          fileSize: 1024,
          uploadDate: new Date(),
          processed: true,
          debtId: 'debt_456'
        },
        {
          id: 'doc_789',
          fileName: 'statement2.pdf',
          filePath: '/mock/path/statement2.pdf',
          fileType: 'pdf',
          fileSize: 2048,
          uploadDate: new Date(),
          processed: false,
          debtId: 'debt_999'
        }
      ];

      mockDocumentUploadService.getUploadedDocuments.mockResolvedValue(mockDocuments);

      const documents = await DocumentManagerService.getProcessedDocuments();

      expect(documents).toHaveLength(2);
      expect(documents[0].id).toBe('doc_123');
      expect(documents[1].id).toBe('doc_789');
    });

    it('should filter documents by debtId', async () => {
      const mockDocuments: UploadedDocument[] = [
        {
          id: 'doc_123',
          fileName: 'statement1.csv',
          filePath: '/mock/path/statement1.csv',
          fileType: 'csv',
          fileSize: 1024,
          uploadDate: new Date(),
          processed: true,
          debtId: 'debt_456'
        },
        {
          id: 'doc_789',
          fileName: 'statement2.pdf',
          filePath: '/mock/path/statement2.pdf',
          fileType: 'pdf',
          fileSize: 2048,
          uploadDate: new Date(),
          processed: false,
          debtId: 'debt_999'
        }
      ];

      mockDocumentUploadService.getUploadedDocuments.mockResolvedValue(mockDocuments);

      const documents = await DocumentManagerService.getProcessedDocuments('debt_456');

      expect(documents).toHaveLength(1);
      expect(documents[0].id).toBe('doc_123');
      expect(documents[0].debtId).toBe('debt_456');
    });

    it('should handle service errors gracefully', async () => {
      mockDocumentUploadService.getUploadedDocuments.mockRejectedValue(new Error('Service error'));

      const documents = await DocumentManagerService.getProcessedDocuments();

      expect(documents).toHaveLength(0);
    });
  });

  describe('deleteDocument', () => {
    it('should delegate to DocumentUploadService', async () => {
      mockDocumentUploadService.deleteDocument.mockResolvedValue(true);

      const result = await DocumentManagerService.deleteDocument('doc_123');

      expect(result).toBe(true);
      expect(mockDocumentUploadService.deleteDocument).toHaveBeenCalledWith('doc_123');
    });

    it('should handle deletion failure', async () => {
      mockDocumentUploadService.deleteDocument.mockResolvedValue(false);

      const result = await DocumentManagerService.deleteDocument('non_existent');

      expect(result).toBe(false);
    });
  });

  describe('CSV parsing and statement extraction', () => {
    it('should correctly parse transactions with different amount formats', async () => {
      const mockDocument: UploadedDocument = {
        id: 'doc_123',
        fileName: 'formatted.csv',
        filePath: '/mock/path/formatted.csv',
        fileType: 'csv',
        fileSize: 500,
        uploadDate: new Date(),
        processed: false,
      };

      const mockValidationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        detectedType: 'credit_card'
      };

      mockDocumentUploadService.readDocumentContent.mockResolvedValue(`Date,Amount,Description
2024-01-01,$100.50,Store Purchase
2024-01-02,"-$25.00",Payment
2024-01-03,"$1,250.75",Large Purchase`);
      mockDocumentValidationService.validateDocument.mockResolvedValue(mockValidationResult);

      const result = await DocumentManagerService.processDocument(mockDocument);

      expect(result.success).toBe(true);
      expect(result.statement?.purchases).toHaveLength(2);
      expect(result.statement?.payments).toHaveLength(1);
      expect(result.statement?.purchases[0].amount).toBe(100.50);
      expect(result.statement?.purchases[1].amount).toBe(1250.75);
      expect(result.statement?.payments[0].amount).toBe(25.00);
    });

    it('should handle debit/credit format CSV', async () => {
      const mockDocument: UploadedDocument = {
        id: 'doc_123',
        fileName: 'debit_credit.csv',
        filePath: '/mock/path/debit_credit.csv',
        fileType: 'csv',
        fileSize: 400,
        uploadDate: new Date(),
        processed: false,
      };

      const mockValidationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        detectedType: 'credit_card'
      };

      mockDocumentUploadService.readDocumentContent.mockResolvedValue(`Date,Debit,Credit,Description
2024-01-01,100.50,,Store Purchase
2024-01-02,,25.00,Payment Received
2024-01-03,50.75,,Gas Station`);
      mockDocumentValidationService.validateDocument.mockResolvedValue(mockValidationResult);

      const result = await DocumentManagerService.processDocument(mockDocument);

      expect(result.success).toBe(true);
      expect(result.statement?.purchases).toHaveLength(2);
      expect(result.statement?.payments).toHaveLength(1);
    });

    it('should categorize transactions correctly', async () => {
      const mockDocument: UploadedDocument = {
        id: 'doc_123',
        fileName: 'categorized.csv',
        filePath: '/mock/path/categorized.csv',
        fileType: 'csv',
        fileSize: 600,
        uploadDate: new Date(),
        processed: false,
      };

      const mockValidationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        detectedType: 'credit_card'
      };

      mockDocumentUploadService.readDocumentContent.mockResolvedValue(`Date,Amount,Description
2024-01-01,50.25,Grocery Store Purchase
2024-01-02,35.00,Gas Station Fill-up
2024-01-03,125.99,Retail Store Shopping
2024-01-04,15.50,Restaurant Dining
2024-01-05,-100.00,Payment Transfer`);
      mockDocumentValidationService.validateDocument.mockResolvedValue(mockValidationResult);

      const result = await DocumentManagerService.processDocument(mockDocument);

      expect(result.success).toBe(true);
      expect(result.statement?.purchases).toHaveLength(4);
      expect(result.statement?.payments).toHaveLength(1);
      
      const categories = result.statement?.purchases.map(p => p.category);
      expect(categories).toContain('Food & Dining');
      expect(categories).toContain('Transportation');
      expect(categories).toContain('Shopping');
    });
  });

  describe('getDocumentSummary', () => {
    it('should generate comprehensive summary for processed document', () => {
      const mockProcessedDoc: ProcessedDocument = {
        id: 'doc_123',
        fileName: 'statement.csv',
        filePath: '/mock/path/statement.csv',
        fileType: 'csv',
        fileSize: 1024,
        uploadDate: new Date('2024-01-01T00:00:00.000Z'),
        processed: true,
        validationResult: {
          isValid: true,
          errors: [],
          warnings: [],
          detectedType: 'credit_card'
        },
        extractedData: {
          id: 'stmt_doc_123',
          debtId: 'debt_456',
          statementDate: new Date(),
          balance: 200.00,
          minimumPayment: 25.00,
          dueDate: new Date(),
          interestCharged: 15.50,
          payments: [{ date: new Date(), amount: 50.00, description: 'Payment' }],
          purchases: [
            { date: new Date(), amount: 100.00, description: 'Purchase 1' },
            { date: new Date(), amount: 150.00, description: 'Purchase 2' }
          ],
          fileName: 'statement.csv',
          imported: new Date()
        }
      };

      const summary = DocumentManagerService.getDocumentSummary(mockProcessedDoc);

      expect(summary).toContain('📄 statement.csv');
      expect(summary).toContain('📊 CSV');
      expect(summary).toContain('📅');
      expect(summary).toContain('✅ Valid');
      expect(summary).toContain('🏷️ credit card');
      expect(summary).toContain('💳 3 transactions');
    });

    it('should handle document without validation result', () => {
      const mockProcessedDoc: ProcessedDocument = {
        id: 'doc_123',
        fileName: 'basic.pdf',
        filePath: '/mock/path/basic.pdf',
        fileType: 'pdf',
        fileSize: 2048,
        uploadDate: new Date('2024-01-01T00:00:00.000Z'),
        processed: false,
      };

      const summary = DocumentManagerService.getDocumentSummary(mockProcessedDoc);

      expect(summary).toContain('📄 basic.pdf');
      expect(summary).toContain('📊 PDF');
      expect(summary).toContain('📅');
      expect(summary).not.toContain('✅');
      expect(summary).not.toContain('❌');
    });
  });
});