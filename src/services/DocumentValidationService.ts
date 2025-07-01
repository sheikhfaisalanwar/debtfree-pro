import { UploadedDocument } from './DocumentUploadService';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  detectedType?: 'credit_card' | 'line_of_credit' | 'loan' | 'unknown';
}

export interface CSVRow {
  [key: string]: string;
}

export class DocumentValidationService {
  private static readonly CSV_REQUIRED_HEADERS = [
    ['date', 'amount', 'description'],
    ['transaction_date', 'transaction_amount', 'description'],
    ['posted_date', 'amount', 'merchant'],
    ['date', 'debit', 'credit', 'description']
  ];

  private static readonly CREDIT_CARD_INDICATORS = [
    'credit card',
    'card ending',
    'payment due',
    'minimum payment',
    'statement balance',
    'available credit'
  ];

  private static readonly LINE_OF_CREDIT_INDICATORS = [
    'line of credit',
    'credit line',
    'revolving credit',
    'available balance',
    'credit limit'
  ];

  static async validateDocument(document: UploadedDocument, content?: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: false,
      errors: [],
      warnings: []
    };

    try {
      if (document.fileType === 'csv') {
        return await this.validateCSV(content || '', result);
      } else if (document.fileType === 'pdf') {
        return await this.validatePDF(document, result);
      }

      result.errors.push('Unsupported file type');
      return result;
    } catch (error) {
      result.errors.push(`Validation failed: ${error}`);
      return result;
    }
  }

  private static async validateCSV(content: string, result: ValidationResult): Promise<ValidationResult> {
    if (!content.trim()) {
      result.errors.push('CSV file is empty');
      return result;
    }

    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      result.errors.push('CSV file must contain at least a header row and one data row');
      return result;
    }

    const headers = this.parseCSVRow(lines[0]).map(h => h.toLowerCase().trim());
    const validHeaderSet = this.findValidHeaderSet(headers);

    if (!validHeaderSet) {
      result.errors.push(
        `CSV headers not recognized. Expected one of: ${this.CSV_REQUIRED_HEADERS.map(set => set.join(', ')).join(' OR ')}`
      );
      return result;
    }

    const rows = this.parseCSVContent(content);
    
    if (rows.length === 0) {
      result.errors.push('No valid data rows found in CSV');
      return result;
    }

    const dataValidation = this.validateCSVData(rows, validHeaderSet);
    result.errors.push(...dataValidation.errors);
    result.warnings.push(...dataValidation.warnings);

    result.detectedType = this.detectDocumentType(content);
    result.isValid = result.errors.length === 0;

    if (result.isValid) {
      result.warnings.push(`Successfully parsed ${rows.length} transactions`);
    }

    return result;
  }

  private static async validatePDF(document: UploadedDocument, result: ValidationResult): Promise<ValidationResult> {
    result.warnings.push('PDF validation is basic - only checking file existence and size');
    
    if (document.fileSize === 0) {
      result.errors.push('PDF file appears to be empty');
      return result;
    }

    if (document.fileSize > 10 * 1024 * 1024) {
      result.errors.push('PDF file is too large (max 10MB)');
      return result;
    }

    result.isValid = true;
    result.warnings.push('PDF content parsing not yet implemented');
    
    return result;
  }

  private static findValidHeaderSet(headers: string[]): string[] | null {
    for (const headerSet of this.CSV_REQUIRED_HEADERS) {
      const hasAllRequired = headerSet.every(required => 
        headers.some(header => header.includes(required) || required.includes(header))
      );
      
      if (hasAllRequired) {
        return headerSet;
      }
    }
    return null;
  }

  private static parseCSVContent(content: string): CSVRow[] {
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) return [];

    const headers = this.parseCSVRow(lines[0]);
    const rows: CSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVRow(lines[i]);
      
      if (values.length === headers.length) {
        const row: CSVRow = {};
        headers.forEach((header, index) => {
          row[header.trim()] = values[index].trim();
        });
        rows.push(row);
      }
    }

    return rows;
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

  private static validateCSVData(rows: CSVRow[], headerSet: string[]): {errors: string[], warnings: string[]} {
    const errors: string[] = [];
    const warnings: string[] = [];
    let validRows = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowErrors: string[] = [];

      if (headerSet.includes('date') || headerSet.includes('transaction_date') || headerSet.includes('posted_date')) {
        const dateField = Object.keys(row).find(key => 
          key.toLowerCase().includes('date')
        );
        
        if (dateField && row[dateField]) {
          const date = new Date(row[dateField]);
          if (isNaN(date.getTime())) {
            rowErrors.push(`Invalid date format in row ${i + 1}: ${row[dateField]}`);
          }
        }
      }

      if (headerSet.includes('amount') || headerSet.includes('transaction_amount')) {
        const amountField = Object.keys(row).find(key => 
          key.toLowerCase().includes('amount')
        );
        
        if (amountField && row[amountField]) {
          const amount = parseFloat(row[amountField].replace(/[$,]/g, ''));
          if (isNaN(amount)) {
            rowErrors.push(`Invalid amount format in row ${i + 1}: ${row[amountField]}`);
          }
        }
      }

      if (rowErrors.length === 0) {
        validRows++;
      } else {
        errors.push(...rowErrors);
      }
    }

    if (validRows === 0) {
      errors.push('No valid data rows found');
    } else if (validRows < rows.length) {
      warnings.push(`${rows.length - validRows} rows contain errors and will be skipped`);
    }

    return { errors, warnings };
  }

  private static detectDocumentType(content: string): 'credit_card' | 'line_of_credit' | 'loan' | 'unknown' {
    const lowerContent = content.toLowerCase();

    const creditCardScore = this.CREDIT_CARD_INDICATORS.reduce((score, indicator) => {
      return lowerContent.includes(indicator) ? score + 1 : score;
    }, 0);

    const lineOfCreditScore = this.LINE_OF_CREDIT_INDICATORS.reduce((score, indicator) => {
      return lowerContent.includes(indicator) ? score + 1 : score;
    }, 0);

    if (creditCardScore > lineOfCreditScore && creditCardScore > 0) {
      return 'credit_card';
    } else if (lineOfCreditScore > 0) {
      return 'line_of_credit';
    }

    return 'unknown';
  }

  static getValidationSummary(result: ValidationResult): string {
    const parts: string[] = [];
    
    if (result.isValid) {
      parts.push('✅ Document is valid');
    } else {
      parts.push('❌ Document has errors');
    }

    if (result.detectedType && result.detectedType !== 'unknown') {
      parts.push(`📄 Detected type: ${result.detectedType.replace('_', ' ')}`);
    }

    if (result.errors.length > 0) {
      parts.push(`🚨 ${result.errors.length} error(s)`);
    }

    if (result.warnings.length > 0) {
      parts.push(`⚠️ ${result.warnings.length} warning(s)`);
    }

    return parts.join(' • ');
  }
}