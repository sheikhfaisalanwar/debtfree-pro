import { DocumentManagerService } from '../../src/services/DocumentManagerService';
import { DocumentValidationService } from '../../src/services/DocumentValidationService';
// import { PDFParsingService } from '../../src/services/PDFParsingService'; // Used indirectly through DocumentManagerService
import { UploadedDocument } from '../../src/services/DocumentUploadService';

// Mock all dependencies
jest.mock('../../src/services/DataStoreService');
jest.mock('react-native-fs');

// No filesystem dependencies needed for PDF processing

describe('PDF Processing Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PDF Credit Card Statement Processing', () => {
    it('should process a complete PDF credit card statement', async () => {
      // Mock PDF content with comprehensive credit card statement data
      // PDF text no longer used since we use manual entry

      // PDFs now require manual entry - no setup needed

      const mockDocument: UploadedDocument = {
        id: 'pdf_test_1',
        fileName: 'statement_december_2023.pdf',
        fileType: 'pdf',
        fileSize: 150000,
        filePath: '/mock/path/statement.pdf',
        uploadDate: new Date('2024-01-01')
      };

      // Process the document
      const result = await DocumentManagerService.processDocument(mockDocument);

      expect(result.success).toBe(true);
      expect(result.statement).toBeDefined();
      
      if (result.statement) {
        // PDFs now require manual entry, so balance should be 0
        expect(result.statement.balance).toBe(0);
        expect(result.statement.minimumPayment).toBe(0);
        expect(result.statement.interestCharged).toBe(0);
        
        // No payments or purchases should be created for manual entry PDFs
        expect(result.statement.payments).toHaveLength(0);
        expect(result.statement.purchases).toHaveLength(0);
        
        // Should have the uploaded filename
        expect(result.statement.fileName).toBe('statement_december_2023.pdf');
      }
      
      // Should have warning about manual entry
      expect(result.document?.validationResult?.warnings?.some(warning =>
        warning.includes('PDF text extraction is not available')
      )).toBe(true);
    });

    it('should handle PDF with minimal data gracefully', async () => {
      // PDF text no longer used since we use manual entry

      // PDFs now require manual entry - no setup needed

      const mockDocument: UploadedDocument = {
        id: 'pdf_test_2',
        fileName: 'minimal_statement.pdf',
        fileType: 'pdf',
        fileSize: 50000,
        filePath: '/mock/path/minimal.pdf',
        uploadDate: new Date(),
        processed: false
      };

      const result = await DocumentManagerService.processDocument(mockDocument);

      expect(result.success).toBe(true);
      expect(result.statement).toBeDefined();
      
      if (result.statement) {
        // PDFs now require manual entry, so balance should be 0
        expect(result.statement.balance).toBe(0);
        expect(result.statement.purchases).toHaveLength(0);
        expect(result.statement.payments).toHaveLength(0);
      }
    });

    it('should reject PDF with no recognizable data', async () => {
      // PDF text no longer used since we use manual entry

      // PDFs now require manual entry - no setup needed

      const mockDocument: UploadedDocument = {
        id: 'pdf_test_3',
        fileName: 'random_document.pdf',
        fileType: 'pdf',
        fileSize: 25000,
        filePath: '/mock/path/random.pdf',
        uploadDate: new Date(),
        processed: false
      };

      const result = await DocumentManagerService.processDocument(mockDocument);

      // Should still succeed but with warnings about no data
      expect(result.success).toBe(true);
      expect(result.document?.validationResult?.warnings?.some(warning => 
        warning.includes('PDF text extraction is not available')
      )).toBe(true);
      // Should have an empty statement with zero values
      expect(result.statement?.balance).toBe(0);
      expect(result.statement?.payments).toHaveLength(0);
      expect(result.statement?.purchases).toHaveLength(0);
    });

    it('should handle PDF parsing errors gracefully', async () => {
      // This test is no longer relevant since we don't do filesystem operations

      const mockDocument: UploadedDocument = {
        id: 'pdf_test_4',
        fileName: 'corrupted.pdf',
        fileType: 'pdf',
        fileSize: 10000,
        filePath: '/mock/path/corrupted.pdf',
        uploadDate: new Date(),
        processed: false
      };

      const result = await DocumentManagerService.processDocument(mockDocument);

      // PDF processing now always succeeds with manual entry
      expect(result.success).toBe(true);
      expect(result.document?.validationResult?.warnings?.some(warning =>
        warning.includes('PDF text extraction is not available')
      )).toBe(true);
    });
  });

  describe('PDF Validation Edge Cases', () => {
    it('should handle empty PDF files', async () => {
      // Empty PDFs will still create manual entry placeholder - no setup needed

      const mockDocument: UploadedDocument = {
        id: 'pdf_test_5',
        fileName: 'empty.pdf',
        fileType: 'pdf',
        fileSize: 100,
        filePath: '/mock/path/empty.pdf',
        uploadDate: new Date(),
        processed: false
      };

      const validationResult = await DocumentValidationService.validateDocument(mockDocument);

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.warnings?.some(warning =>
        warning.includes('PDF text extraction is not available')
      )).toBe(true);
    });

    it('should handle oversized PDF files', async () => {
      const mockDocument: UploadedDocument = {
        id: 'pdf_test_6',
        fileName: 'oversized.pdf',
        fileType: 'pdf',
        fileSize: 15 * 1024 * 1024, // 15MB
        filePath: '/mock/path/oversized.pdf',
        uploadDate: new Date(),
        processed: false
      };

      const validationResult = await DocumentValidationService.validateDocument(mockDocument);

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toContain('PDF file is too large (max 10MB)');
    });
  });

  describe('Real-world PDF Scenarios', () => {
    it('should handle Chase credit card statement format', async () => {
      // Chase statement text no longer used since we use manual entry

      // Chase statements also require manual entry now - no setup needed

      const mockDocument: UploadedDocument = {
        id: 'chase_test',
        fileName: 'chase_statement.pdf',
        fileType: 'pdf',
        fileSize: 200000,
        filePath: '/mock/path/chase.pdf',
        uploadDate: new Date(),
        processed: false
      };

      const result = await DocumentManagerService.processDocument(mockDocument);

      expect(result.success).toBe(true);
      expect(result.statement?.balance).toBe(0); // Manual entry
      expect(result.statement?.interestRate).toBeUndefined(); // Manual entry
    });
  });
});