import { DocumentUploadService, UploadedDocument } from '../../src/services/DocumentUploadService';
import RNFS from 'react-native-fs';
import DocumentPicker from 'react-native-document-picker';

jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/mock/documents',
  exists: jest.fn(),
  mkdir: jest.fn(),
  copyFile: jest.fn(),
  unlink: jest.fn(),
  readDir: jest.fn(),
  stat: jest.fn(),
  readFile: jest.fn(),
}));

jest.mock('react-native-document-picker', () => ({
  pick: jest.fn(),
  isCancel: jest.fn(),
  types: {
    csv: 'text/csv',
    pdf: 'application/pdf',
  },
}));

const mockRNFS = RNFS as jest.Mocked<typeof RNFS>;
const mockDocumentPicker = DocumentPicker as jest.Mocked<typeof DocumentPicker>;

describe('DocumentUploadService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeStorage', () => {
    it('should create upload directory if it does not exist', async () => {
      mockRNFS.exists.mockResolvedValue(false);
      mockRNFS.mkdir.mockResolvedValue();

      await DocumentUploadService.initializeStorage();

      expect(mockRNFS.exists).toHaveBeenCalledWith('/mock/documents/uploads');
      expect(mockRNFS.mkdir).toHaveBeenCalledWith('/mock/documents/uploads');
    });

    it('should not create directory if it already exists', async () => {
      mockRNFS.exists.mockResolvedValue(true);

      await DocumentUploadService.initializeStorage();

      expect(mockRNFS.exists).toHaveBeenCalledWith('/mock/documents/uploads');
      expect(mockRNFS.mkdir).not.toHaveBeenCalled();
    });

    it('should throw error if directory creation fails', async () => {
      mockRNFS.exists.mockResolvedValue(false);
      mockRNFS.mkdir.mockRejectedValue(new Error('Permission denied'));

      await expect(DocumentUploadService.initializeStorage()).rejects.toThrow(
        'Failed to initialize storage: Error: Permission denied'
      );
    });
  });

  describe('pickDocument', () => {
    it('should successfully pick and upload a CSV file', async () => {
      const mockFile = {
        uri: 'file:///path/to/file.csv',
        name: 'statement.csv',
        type: 'text/csv',
        size: 1024,
      };

      mockDocumentPicker.pick.mockResolvedValue([mockFile]);
      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.copyFile.mockResolvedValue();

      const result = await DocumentUploadService.pickDocument();

      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();
      expect(result.document?.fileName).toBe('statement.csv');
      expect(result.document?.fileType).toBe('csv');
    });

    it('should successfully pick and upload a PDF file', async () => {
      const mockFile = {
        uri: 'file:///path/to/file.pdf',
        name: 'statement.pdf',
        type: 'application/pdf',
        size: 2048,
      };

      mockDocumentPicker.pick.mockResolvedValue([mockFile]);
      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.copyFile.mockResolvedValue();

      const result = await DocumentUploadService.pickDocument();

      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();
      expect(result.document?.fileName).toBe('statement.pdf');
      expect(result.document?.fileType).toBe('pdf');
    });

    it('should handle user cancellation', async () => {
      const cancelError = new Error('User cancelled');
      mockDocumentPicker.pick.mockRejectedValue(cancelError);
      mockDocumentPicker.isCancel.mockReturnValue(true);

      const result = await DocumentUploadService.pickDocument();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload cancelled');
    });

    it('should handle file selection errors', async () => {
      const error = new Error('File access denied');
      mockDocumentPicker.pick.mockRejectedValue(error);
      mockDocumentPicker.isCancel.mockReturnValue(false);

      const result = await DocumentUploadService.pickDocument();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Document selection failed');
    });
  });

  describe('uploadDocument', () => {
    it('should reject unsupported file types', async () => {
      const mockFile = {
        uri: 'file:///path/to/file.txt',
        name: 'document.txt',
        type: 'text/plain',
        size: 1024,
      };

      const result = await DocumentUploadService.uploadDocument(mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toContain('File type not supported');
    });

    it('should reject files that exceed size limit', async () => {
      const mockFile = {
        uri: 'file:///path/to/file.csv',
        name: 'large-file.csv',
        type: 'text/csv',
        size: 11 * 1024 * 1024, // 11MB
      };

      const result = await DocumentUploadService.uploadDocument(mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toContain('File size exceeds 10MB limit');
    });

    it('should handle file copy errors', async () => {
      const mockFile = {
        uri: 'file:///path/to/file.csv',
        name: 'statement.csv',
        type: 'text/csv',
        size: 1024,
      };

      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.copyFile.mockRejectedValue(new Error('Disk full'));

      const result = await DocumentUploadService.uploadDocument(mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Upload failed');
    });
  });

  describe('deleteDocument', () => {
    it('should successfully delete an existing document', async () => {
      // Setup mock document for deletion test

      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.readDir.mockResolvedValue([
        {
          name: 'doc_123.csv',
          path: '/mock/documents/uploads/doc_123.csv',
          size: 1024,
          isFile: () => true,
          isDirectory: () => false,
          mtime: new Date(),
          ctime: new Date(),
        },
      ]);
      mockRNFS.stat.mockResolvedValue({
        size: 1024,
        mtime: new Date(),
        ctime: new Date(),
        isFile: () => true,
        isDirectory: () => false,
        path: '/mock/documents/uploads/doc_123.csv',
      });
      mockRNFS.unlink.mockResolvedValue();

      const result = await DocumentUploadService.deleteDocument('doc_123');

      expect(result).toBe(true);
      expect(mockRNFS.unlink).toHaveBeenCalledWith('/mock/documents/uploads/doc_123.csv');
    });

    it('should return false for non-existent document', async () => {
      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.readDir.mockResolvedValue([]);

      const result = await DocumentUploadService.deleteDocument('non_existent');

      expect(result).toBe(false);
    });

    it('should handle deletion errors gracefully', async () => {
      // Setup mock document for error handling test

      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.readDir.mockResolvedValue([
        {
          name: 'doc_123.csv',
          path: '/mock/documents/uploads/doc_123.csv',
          size: 1024,
          isFile: () => true,
          isDirectory: () => false,
          mtime: new Date(),
          ctime: new Date(),
        },
      ]);
      mockRNFS.stat.mockResolvedValue({
        size: 1024,
        mtime: new Date(),
        ctime: new Date(),
        isFile: () => true,
        isDirectory: () => false,
        path: '/mock/documents/uploads/doc_123.csv',
      });
      mockRNFS.unlink.mockRejectedValue(new Error('Permission denied'));

      const result = await DocumentUploadService.deleteDocument('doc_123');

      expect(result).toBe(false);
    });
  });

  describe('getUploadedDocuments', () => {
    it('should return list of uploaded documents', async () => {
      const mockDate = new Date('2024-01-01');
      
      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.readDir.mockResolvedValue([
        {
          name: 'doc_123.csv',
          path: '/mock/documents/uploads/doc_123.csv',
          size: 1024,
          isFile: () => true,
          isDirectory: () => false,
          mtime: mockDate,
          ctime: mockDate,
        },
        {
          name: 'doc_456.pdf',
          path: '/mock/documents/uploads/doc_456.pdf',
          size: 2048,
          isFile: () => true,
          isDirectory: () => false,
          mtime: mockDate,
          ctime: mockDate,
        },
      ]);
      mockRNFS.stat.mockResolvedValueOnce({
        size: 1024,
        mtime: mockDate,
        ctime: mockDate,
        isFile: () => true,
        isDirectory: () => false,
        path: '/mock/documents/uploads/doc_123.csv',
      }).mockResolvedValueOnce({
        size: 2048,
        mtime: mockDate,
        ctime: mockDate,
        isFile: () => true,
        isDirectory: () => false,
        path: '/mock/documents/uploads/doc_456.pdf',
      });

      const documents = await DocumentUploadService.getUploadedDocuments();

      expect(documents).toHaveLength(2);
      expect(documents[0].id).toBe('doc_123');
      expect(documents[0].fileType).toBe('csv');
      expect(documents[1].id).toBe('doc_456');
      expect(documents[1].fileType).toBe('pdf');
    });

    it('should handle empty upload directory', async () => {
      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.readDir.mockResolvedValue([]);

      const documents = await DocumentUploadService.getUploadedDocuments();

      expect(documents).toHaveLength(0);
    });

    it('should handle directory read errors', async () => {
      mockRNFS.exists.mockResolvedValue(true);
      mockRNFS.readDir.mockRejectedValue(new Error('Directory not accessible'));

      const documents = await DocumentUploadService.getUploadedDocuments();

      expect(documents).toHaveLength(0);
    });
  });

  describe('readDocumentContent', () => {
    it('should read CSV file content', async () => {
      const mockDocument: UploadedDocument = {
        id: 'doc_123',
        fileName: 'test.csv',
        filePath: '/mock/documents/uploads/doc_123.csv',
        fileType: 'csv',
        fileSize: 1024,
        uploadDate: new Date(),
        processed: false,
      };

      const mockContent = 'Date,Amount,Description\n2024-01-01,100.00,Test Transaction';
      mockRNFS.readFile.mockResolvedValue(mockContent);

      const content = await DocumentUploadService.readDocumentContent(mockDocument);

      expect(content).toBe(mockContent);
      expect(mockRNFS.readFile).toHaveBeenCalledWith(mockDocument.filePath, 'utf8');
    });

    it('should reject PDF file reading', async () => {
      const mockDocument: UploadedDocument = {
        id: 'doc_456',
        fileName: 'test.pdf',
        filePath: '/mock/documents/uploads/doc_456.pdf',
        fileType: 'pdf',
        fileSize: 2048,
        uploadDate: new Date(),
        processed: false,
      };

      await expect(DocumentUploadService.readDocumentContent(mockDocument)).rejects.toThrow(
        'PDF content reading not yet implemented'
      );
    });

    it('should handle file read errors', async () => {
      const mockDocument: UploadedDocument = {
        id: 'doc_123',
        fileName: 'test.csv',
        filePath: '/mock/documents/uploads/doc_123.csv',
        fileType: 'csv',
        fileSize: 1024,
        uploadDate: new Date(),
        processed: false,
      };

      mockRNFS.readFile.mockRejectedValue(new Error('File not found'));

      await expect(DocumentUploadService.readDocumentContent(mockDocument)).rejects.toThrow(
        'Failed to read document content'
      );
    });
  });
});