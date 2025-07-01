import RNFS from 'react-native-fs';
import DocumentPicker from 'react-native-document-picker';

export interface UploadedDocument {
  id: string;
  fileName: string;
  filePath: string;
  fileType: 'csv' | 'pdf';
  fileSize: number;
  uploadDate: Date;
  debtId?: string;
  processed: boolean;
}

export interface DocumentUploadResult {
  success: boolean;
  document?: UploadedDocument;
  error?: string;
}

export class DocumentUploadService {
  private static readonly UPLOAD_DIRECTORY = `${RNFS.DocumentDirectoryPath}/uploads`;
  private static readonly ALLOWED_TYPES = ['text/csv', 'application/pdf'];
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  static async initializeStorage(): Promise<void> {
    try {
      const exists = await RNFS.exists(this.UPLOAD_DIRECTORY);
      if (!exists) {
        await RNFS.mkdir(this.UPLOAD_DIRECTORY);
      }
    } catch (error) {
      throw new Error(`Failed to initialize storage: ${error}`);
    }
  }

  static async pickDocument(): Promise<DocumentUploadResult> {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.csv, DocumentPicker.types.pdf],
        allowMultiSelection: false,
      });

      const file = result[0];
      
      if (!file) {
        return {
          success: false,
          error: 'No file selected'
        };
      }

      return await this.uploadDocument(file);
    } catch (error) {
      if (DocumentPicker.isCancel(error)) {
        return {
          success: false,
          error: 'Upload cancelled'
        };
      }
      
      return {
        success: false,
        error: `Document selection failed: ${error}`
      };
    }
  }

  static async uploadDocument(file: any): Promise<DocumentUploadResult> {
    try {
      await this.initializeStorage();

      const validation = await this.validateFile(file);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        };
      }

      const documentId = this.generateDocumentId();
      const fileExtension = this.getFileExtension(file.name);
      const destinationPath = `${this.UPLOAD_DIRECTORY}/${documentId}.${fileExtension}`;

      await RNFS.copyFile(file.uri, destinationPath);

      const document: UploadedDocument = {
        id: documentId,
        fileName: file.name,
        filePath: destinationPath,
        fileType: this.getFileType(file.type),
        fileSize: file.size,
        uploadDate: new Date(),
        processed: false
      };

      return {
        success: true,
        document
      };
    } catch (error) {
      return {
        success: false,
        error: `Upload failed: ${error}`
      };
    }
  }

  static async deleteDocument(documentId: string): Promise<boolean> {
    try {
      const documents = await this.getUploadedDocuments();
      const document = documents.find(doc => doc.id === documentId);
      
      if (!document) {
        return false;
      }

      const exists = await RNFS.exists(document.filePath);
      if (exists) {
        await RNFS.unlink(document.filePath);
      }

      return true;
    } catch (error) {
      console.error('Failed to delete document:', error);
      return false;
    }
  }

  static async getUploadedDocuments(): Promise<UploadedDocument[]> {
    try {
      await this.initializeStorage();
      
      const files = await RNFS.readDir(this.UPLOAD_DIRECTORY);
      const documents: UploadedDocument[] = [];

      for (const file of files) {
        if (file.isFile()) {
          const stats = await RNFS.stat(file.path);
          const nameWithoutExt = file.name.split('.').slice(0, -1).join('.');
          const extension = this.getFileExtension(file.name);
          
          documents.push({
            id: nameWithoutExt,
            fileName: file.name,
            filePath: file.path,
            fileType: extension === 'csv' ? 'csv' : 'pdf',
            fileSize: stats.size,
            uploadDate: new Date(stats.mtime),
            processed: false
          });
        }
      }

      return documents.sort((a, b) => b.uploadDate.getTime() - a.uploadDate.getTime());
    } catch (error) {
      console.error('Failed to get uploaded documents:', error);
      return [];
    }
  }

  static async readDocumentContent(document: UploadedDocument): Promise<string> {
    try {
      if (document.fileType === 'pdf') {
        throw new Error('PDF content reading not yet implemented');
      }

      const content = await RNFS.readFile(document.filePath, 'utf8');
      return content;
    } catch (error) {
      throw new Error(`Failed to read document content: ${error}`);
    }
  }

  private static async validateFile(file: any): Promise<{isValid: boolean; error?: string}> {
    if (!file.type || !this.ALLOWED_TYPES.includes(file.type)) {
      return {
        isValid: false,
        error: 'File type not supported. Please upload CSV or PDF files only.'
      };
    }

    if (file.size > this.MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: 'File size exceeds 10MB limit.'
      };
    }

    return { isValid: true };
  }

  private static getFileType(mimeType: string): 'csv' | 'pdf' {
    return mimeType === 'text/csv' ? 'csv' : 'pdf';
  }

  private static getFileExtension(fileName: string): string {
    return fileName.split('.').pop()?.toLowerCase() || '';
  }

  private static generateDocumentId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}