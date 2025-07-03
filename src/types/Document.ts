export interface Document {
  id: string;
  fileName: string;
  filePath: string;
  fileType: DocumentType;
  fileSize: number;
  uploadDate: Date;
  lastModified: Date;
  processed: boolean;
  processingStatus: ProcessingStatus;
  processingError?: string;
}

export enum DocumentType {
  PDF = 'pdf',
  CSV = 'csv',
  IMAGE = 'image',
  OTHER = 'other'
}

export enum ProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing', 
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface CreateDocumentParams {
  fileName: string;
  filePath: string;
  fileType: DocumentType;
  fileSize: number;
}

export interface UpdateDocumentParams {
  id: string;
  processed?: boolean;
  processingStatus?: ProcessingStatus;
  processingError?: string;
}

export interface DocumentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  detectedType?: string;
  extractedData?: any;
}