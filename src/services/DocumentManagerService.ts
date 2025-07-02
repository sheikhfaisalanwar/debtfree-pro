import { DocumentUploadService, UploadedDocument } from './DocumentUploadService';
import { DocumentValidationService, ValidationResult } from './DocumentValidationService';
import { Statement, StatementTransaction, StatementPayment } from '../types/Statement';
import { DataStoreService } from './DataStoreService';
import { CreditCardStatementData } from './PDFParsingService';

export interface ProcessedDocument extends UploadedDocument {
  validationResult?: ValidationResult;
  extractedData?: Statement;
  processingError?: string;
}

export interface DocumentProcessingResult {
  success: boolean;
  document?: ProcessedDocument;
  statement?: Statement;
  error?: string;
}

export class DocumentManagerService {
  static async uploadAndProcessDocument(debtId?: string): Promise<DocumentProcessingResult> {
    try {
      const uploadResult = await DocumentUploadService.pickDocument();
      
      if (!uploadResult.success || !uploadResult.document) {
        return {
          success: false,
          error: uploadResult.error
        };
      }

      const document = uploadResult.document;
      if (debtId) {
        document.debtId = debtId;
      }

      const processingResult = await this.processDocument(document);
      
      return {
        success: processingResult.success,
        document: processingResult.document,
        statement: processingResult.statement,
        error: processingResult.error
      };
    } catch (error) {
      return {
        success: false,
        error: `Upload and processing failed: ${error}`
      };
    }
  }

  static async processDocument(document: UploadedDocument): Promise<DocumentProcessingResult> {
    try {
      let content = '';
      
      if (document.fileType === 'csv') {
        content = await DocumentUploadService.readDocumentContent(document);
      }

      const validationResult = await DocumentValidationService.validateDocument(document, content);
      
      const processedDoc: ProcessedDocument = {
        ...document,
        validationResult
      };

      if (!validationResult.isValid) {
        processedDoc.processingError = 'Document validation failed';
        return {
          success: false,
          document: processedDoc,
          error: `Validation failed: ${validationResult.errors.join(', ')}`
        };
      }

      if (document.fileType === 'csv' && content) {
        const statement = await this.extractStatementFromCSV(document, content, validationResult);
        processedDoc.extractedData = statement;
        processedDoc.processed = true;

        await DataStoreService.addStatement(statement);

        return {
          success: true,
          document: processedDoc,
          statement
        };
      }

      if (document.fileType === 'pdf') {
        const statement = await this.extractStatementFromPDF(document, validationResult);
        processedDoc.extractedData = statement;
        processedDoc.processed = true;

        await DataStoreService.addStatement(statement);

        return {
          success: true,
          document: processedDoc,
          statement
        };
      }

      processedDoc.processed = true;
      
      return {
        success: true,
        document: processedDoc
      };
    } catch (error) {
      return {
        success: false,
        document: {
          ...document,
          processingError: `Processing failed: ${error}`
        },
        error: `Document processing failed: ${error}`
      };
    }
  }

  static async getProcessedDocuments(debtId?: string): Promise<ProcessedDocument[]> {
    try {
      const allDocuments = await DocumentUploadService.getUploadedDocuments();
      
      return allDocuments
        .filter(doc => !debtId || doc.debtId === debtId)
        .map(doc => doc as ProcessedDocument);
    } catch (error) {
      console.error('Failed to get processed documents:', error);
      return [];
    }
  }

  static async deleteDocument(documentId: string): Promise<boolean> {
    return await DocumentUploadService.deleteDocument(documentId);
  }

  private static async extractStatementFromCSV(
    document: UploadedDocument, 
    content: string, 
    _validationResult: ValidationResult
  ): Promise<Statement> {
    const lines = content.split('\n').filter(line => line.trim());
    const headers = this.parseCSVRow(lines[0]).map(h => h.toLowerCase().trim());
    
    const transactions: StatementTransaction[] = [];
    const payments: StatementPayment[] = [];
    let balance = 0;
    let minimumPayment = 0;
    let interestCharged = 0;

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVRow(lines[i]);
      
      if (values.length === headers.length) {
        const row: {[key: string]: string} = {};
        headers.forEach((header, index) => {
          row[header] = values[index].trim();
        });

        const transaction = this.parseTransactionRow(row, headers);
        if (transaction) {
          if (transaction.amount < 0) {
            payments.push({
              date: transaction.date,
              amount: Math.abs(transaction.amount),
              description: transaction.description
            });
          } else {
            transactions.push(transaction);
          }
        }
      }
    }

    if (transactions.length > 0) {
      balance = transactions.reduce((sum, t) => sum + t.amount, 0);
    }

    const statement: Statement = {
      id: `stmt_${document.id}`,
      debtId: document.debtId || 'unknown',
      statementDate: new Date(),
      balance,
      minimumPayment,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      interestCharged,
      payments,
      purchases: transactions,
      fileName: document.fileName,
      imported: new Date()
    };

    return statement;
  }

  private static async extractStatementFromPDF(
    document: UploadedDocument,
    validationResult: ValidationResult
  ): Promise<Statement> {
    // Get the extracted data from validation result
    const extractedData: CreditCardStatementData = (validationResult as any).extractedData || {};
    
    // Check if this is a manual entry PDF (no text extraction available)
    const isManualEntry = validationResult.warnings?.some(warning => 
      warning.includes('PDF text extraction is not available')
    );

    // Check if meaningful data was actually extracted
    const hasExtractedData = !isManualEntry && (
      extractedData.previousBalance !== undefined ||
      extractedData.purchases !== undefined ||
      extractedData.payments !== undefined ||
      extractedData.interest !== undefined ||
      extractedData.minimumPayment !== undefined
    );

    // Create a statement from the extracted PDF data
    const statement: Statement = {
      id: `stmt_${document.id}`,
      debtId: document.debtId || 'unknown',
      statementDate: extractedData.statementDate || new Date(),
      balance: isManualEntry ? 0 : this.calculateCurrentBalance(extractedData),
      minimumPayment: extractedData.minimumPayment || 0,
      dueDate: extractedData.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      interestCharged: extractedData.interest || 0,
      payments: isManualEntry ? [] : this.createPaymentsFromPDF(extractedData),
      purchases: isManualEntry ? [] : this.createPurchasesFromPDF(extractedData),
      fileName: document.fileName,
      imported: new Date(),
      creditLimit: extractedData.creditLimit,
      availableCredit: extractedData.availableCredit,
      interestRate: extractedData.interestRate
    };

    // Store whether meaningful data was extracted for later use
    (statement as any).hasExtractedData = hasExtractedData;

    return statement;
  }

  private static calculateCurrentBalance(data: CreditCardStatementData): number {
    // Calculate current balance: Previous Balance + Purchases + Interest - Payments
    const previousBalance = data.previousBalance || 0;
    const purchases = data.purchases || 0;
    const interest = data.interest || 0;
    const payments = data.payments || 0;

    return previousBalance + purchases + interest - payments;
  }

  private static createPaymentsFromPDF(data: CreditCardStatementData): StatementPayment[] {
    const payments: StatementPayment[] = [];
    
    // Add payment if found in PDF
    if (data.payments && data.payments > 0) {
      payments.push({
        date: data.statementDate || new Date(),
        amount: data.payments,
        description: 'Payment'
      });
    }

    return payments;
  }

  private static createPurchasesFromPDF(data: CreditCardStatementData): StatementTransaction[] {
    const transactions: StatementTransaction[] = [];
    
    // Add purchases as a single transaction if found in PDF
    if (data.purchases && data.purchases > 0) {
      transactions.push({
        date: data.statementDate || new Date(),
        amount: data.purchases,
        description: 'Purchases',
        category: 'general'
      });
    }

    // Add interest as a separate transaction if found
    if (data.interest && data.interest > 0) {
      transactions.push({
        date: data.statementDate || new Date(),
        amount: data.interest,
        description: 'Interest Charged',
        category: 'fees'
      });
    }

    return transactions;
  }

  private static parseTransactionRow(row: {[key: string]: string}, headers: string[]): StatementTransaction | null {
    try {
      const dateField = this.findFieldByPatterns(row, ['date', 'transaction_date', 'posted_date']);
      const amountField = this.findFieldByPatterns(row, ['amount', 'transaction_amount', 'debit', 'credit']);
      const descriptionField = this.findFieldByPatterns(row, ['description', 'merchant', 'payee']);

      if (!dateField || !amountField || !descriptionField) {
        return null;
      }

      const date = new Date(row[dateField]);
      if (isNaN(date.getTime())) {
        return null;
      }

      let amount = parseFloat(row[amountField].replace(/[$,]/g, ''));
      
      if (headers.includes('debit') && headers.includes('credit')) {
        const debit = parseFloat((row.debit || '0').replace(/[$,]/g, ''));
        const credit = parseFloat((row.credit || '0').replace(/[$,]/g, ''));
        amount = credit > 0 ? -credit : debit;
      }

      if (isNaN(amount)) {
        return null;
      }

      return {
        date,
        amount,
        description: row[descriptionField],
        category: this.categorizeTransaction(row[descriptionField])
      };
    } catch {
      return null;
    }
  }

  private static findFieldByPatterns(row: {[key: string]: string}, patterns: string[]): string | null {
    const keys = Object.keys(row);
    
    for (const pattern of patterns) {
      const found = keys.find(key => key.toLowerCase().includes(pattern));
      if (found) return found;
    }
    
    return null;
  }

  private static categorizeTransaction(description: string): string {
    const desc = description.toLowerCase();
    
    if (desc.includes('grocery') || desc.includes('food') || desc.includes('restaurant')) {
      return 'Food & Dining';
    }
    if (desc.includes('gas') || desc.includes('fuel') || desc.includes('auto')) {
      return 'Transportation';
    }
    if (desc.includes('store') || desc.includes('retail') || desc.includes('shop')) {
      return 'Shopping';
    }
    if (desc.includes('payment') || desc.includes('transfer')) {
      return 'Payment';
    }
    
    return 'Other';
  }

  private static parseCSVRow(row: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      const nextChar = row[i + 1];

      if (char === '"' && !inQuotes) {
        inQuotes = true;
      } else if (char === '"' && inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else if (char === '"' && inQuotes) {
        inQuotes = false;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }

  static getDocumentSummary(document: ProcessedDocument): string {
    const parts: string[] = [];
    
    parts.push(`📄 ${document.fileName}`);
    parts.push(`📊 ${document.fileType.toUpperCase()}`);
    parts.push(`📅 ${document.uploadDate.toLocaleDateString()}`);
    
    if (document.validationResult) {
      if (document.validationResult.isValid) {
        parts.push('✅ Valid');
      } else {
        parts.push('❌ Invalid');
      }
      
      if (document.validationResult.detectedType) {
        parts.push(`🏷️ ${document.validationResult.detectedType.replace('_', ' ')}`);
      }
    }
    
    if (document.extractedData) {
      const txCount = document.extractedData.purchases.length + document.extractedData.payments.length;
      parts.push(`💳 ${txCount} transactions`);
    }
    
    return parts.join(' • ');
  }
}