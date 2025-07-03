// No filesystem dependencies - PDFs require manual entry in React Native

export interface PDFTextData {
  text: string;
  pages: number;
  info: any;
}

export interface CreditCardStatementData {
  previousBalance?: number;
  interest?: number;
  payments?: number;
  purchases?: number;
  interestRate?: number;
  statementDate?: Date;
  dueDate?: Date;
  minimumPayment?: number;
  creditLimit?: number;
  availableCredit?: number;
}

export class PDFParsingService {
  /**
   * Extract text content from PDF file
   * NOTE: PDF text extraction is not available in React Native with open-source libraries.
   * This method provides a fallback that indicates manual entry is required.
   */
  static async extractTextFromPDF(filePath: string): Promise<PDFTextData> {
    try {
      // Handle null/undefined filePath safely
      let filename = 'statement.pdf';
      
      if (filePath && typeof filePath === 'string' && filePath.length > 0) {
        // Extract filename from path for user-friendly display
        // Handle both forward slashes (Unix/iOS) and backslashes (Windows)
        const pathSeparators = /[/\\]/;
        const pathParts = filePath.split(pathSeparators);
        filename = pathParts.pop() || 'statement.pdf';
      }
      
      // Since we can't extract text from PDFs in React Native with open-source libraries,
      // we return a placeholder that indicates manual data entry is needed
      const placeholderText = `PDF_REQUIRES_MANUAL_ENTRY:${filename}`;
      
      return {
        text: placeholderText,
        pages: 1, // Unknown page count
        info: {
          filename,
          requiresManualEntry: true
        }
      };
    } catch (error) {
      console.error('Failed to process PDF:', error);
      throw new Error(`PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse credit card statement data from PDF text
   */
  static parseCreditCardStatement(pdfText: string): CreditCardStatementData {
    const statementData: CreditCardStatementData = {};
    
    // Check if this is a manual entry placeholder
    if (pdfText.startsWith('PDF_REQUIRES_MANUAL_ENTRY:')) {
      // Return empty data object - user will need to enter data manually
      return statementData;
    }
    
    // Normalize text for easier parsing
    const normalizedText = pdfText.replace(/\s+/g, ' ').toUpperCase();
    
    // Extract Previous Balance
    statementData.previousBalance = this.extractAmount(normalizedText, [
      /PREVIOUS\s+(?:STATEMENT\s+)?BALANCE[:\s]+\$?([\d,]+\.?\d*)/,
      /BEGINNING\s+BALANCE[:\s]+\$?([\d,]+\.?\d*)/,
      /OPENING\s+BALANCE[:\s]+\$?([\d,]+\.?\d*)/
    ]);

    // Extract Interest/Finance Charges
    statementData.interest = this.extractAmount(normalizedText, [
      /INTEREST\s+CHARGED?[:\s]+\$?([\d,]+\.?\d*)/,
      /FINANCE\s+CHARGE[:\s]+\$?([\d,]+\.?\d*)/,
      /INTEREST\s+FEES?[:\s]+\$?([\d,]+\.?\d*)/
    ]);

    // Extract Payments
    statementData.payments = this.extractAmount(normalizedText, [
      /PAYMENTS?(?:\s+AND\s+OTHER\s+CREDITS?)?[:\s]+\$?([\d,]+\.?\d*)/,
      /PAYMENT\s+RECEIVED[:\s]+\$?([\d,]+\.?\d*)/,
      /CREDITS?[:\s]+\$?([\d,]+\.?\d*)/
    ]);

    // Extract Purchases
    statementData.purchases = this.extractAmount(normalizedText, [
      /PURCHASES?(?:\s+AND\s+ADJUSTMENTS?)?[:\s]+\$?([\d,]+\.?\d*)/,
      /NEW\s+PURCHASES?[:\s]+\$?([\d,]+\.?\d*)/,
      /TRANSACTIONS?[:\s]+\$?([\d,]+\.?\d*)/
    ]);

    // Extract Interest Rate
    statementData.interestRate = this.extractRate(normalizedText, [
      /ANNUAL\s+PERCENTAGE\s+RATE\s+FOR\s+PURCHASES[:\s]+([\d.]+)%/,
      /PURCHASE\s+APR[:\s]+([\d.]+)%/,
      /ANNUAL\s+PERCENTAGE\s+RATE[:\s]+([\d.]+)%/,
      /INTEREST\s+RATE[:\s]+([\d.]+)%/,
      /APR[:\s]+([\d.]+)%/
    ]);

    // Extract Minimum Payment
    statementData.minimumPayment = this.extractAmount(normalizedText, [
      /MINIMUM\s+PAYMENT\s+DUE[:\s]+\$?([\d,]+\.?\d*)/,
      /MINIMUM\s+PAYMENT[:\s]+\$?([\d,]+\.?\d*)/,
      /MINIMUM\s+DUE[:\s]+\$?([\d,]+\.?\d*)/,
      /PAYMENT\s+DUE[:\s]+\$?([\d,]+\.?\d*)/
    ]);

    // Extract Credit Limit
    statementData.creditLimit = this.extractAmount(normalizedText, [
      /CREDIT\s+LINE[:\s]+\$?([\d,]+\.?\d*)/,
      /CREDIT\s+LIMIT[:\s]+\$?([\d,]+\.?\d*)/,
      /TOTAL\s+CREDIT\s+LINE[:\s]+\$?([\d,]+\.?\d*)/
    ]);

    // Extract Available Credit
    statementData.availableCredit = this.extractAmount(normalizedText, [
      /AVAILABLE\s+CREDIT[:\s]+\$?([\d,]+\.?\d*)/,
      /CREDIT\s+AVAILABLE[:\s]+\$?([\d,]+\.?\d*)/
    ]);

    // Extract Statement Date
    statementData.statementDate = this.extractDate(normalizedText, [
      /STATEMENT\s+DATE[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
      /CLOSING\s+DATE[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
      /CYCLE\s+ENDING[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/
    ]);

    // Extract Due Date
    statementData.dueDate = this.extractDate(normalizedText, [
      /DUE\s+DATE[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
      /PAYMENT\s+DUE\s+DATE[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
      /PAYMENT\s+DUE[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/
    ]);

    return statementData;
  }

  /**
   * Extract amount using regex patterns
   */
  private static extractAmount(text: string, patterns: RegExp[]): number | undefined {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const cleanAmount = match[1].replace(/,/g, '');
        const amount = parseFloat(cleanAmount);
        if (!isNaN(amount)) {
          return amount;
        }
      }
    }
    return undefined;
  }

  /**
   * Extract percentage rate using regex patterns
   */
  private static extractRate(text: string, patterns: RegExp[]): number | undefined {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const rate = parseFloat(match[1]);
        if (!isNaN(rate)) {
          return rate;
        }
      }
    }
    return undefined;
  }

  /**
   * Extract date using regex patterns with improved parsing
   */
  private static extractDate(text: string, patterns: RegExp[]): Date | undefined {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        try {
          // Normalize date string to handle different formats
          let dateString = match[1].trim();
          
          // Convert MM-DD-YYYY to MM/DD/YYYY
          dateString = dateString.replace(/-/g, '/');
          
          // Parse the date
          const date = new Date(dateString);
          
          // Validate the date is actually valid and reasonable
          if (!isNaN(date.getTime()) && this.isReasonableDate(date)) {
            return date;
          }
        } catch {
          // Continue to next pattern
        }
      }
    }
    return undefined;
  }

  /**
   * Validate that a date is reasonable for a financial statement
   */
  private static isReasonableDate(date: Date): boolean {
    const now = new Date();
    const fiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
    const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    
    // Date should be within a reasonable range for financial statements
    return date >= fiveYearsAgo && date <= oneYearFromNow;
  }

  /**
   * Validate extracted credit card statement data
   */
  static validateStatementData(data: CreditCardStatementData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if we extracted any meaningful data
    const hasData = Object.values(data).some(value => value !== undefined);
    if (!hasData) {
      errors.push('No recognizable credit card statement data found in PDF');
    }

    // Validate amounts are positive
    const amounts = ['previousBalance', 'interest', 'payments', 'purchases', 'minimumPayment', 'creditLimit', 'availableCredit'] as const;
    for (const field of amounts) {
      const value = data[field];
      if (value !== undefined && (value < 0 || isNaN(value))) {
        errors.push(`Invalid ${field}: ${value}`);
      }
    }

    // Validate interest rate is reasonable
    if (data.interestRate !== undefined && (data.interestRate < 0 || data.interestRate > 50)) {
      errors.push(`Interest rate seems unrealistic: ${data.interestRate}%`);
    }

    // Validate credit limit vs available credit
    if (data.creditLimit !== undefined && data.availableCredit !== undefined) {
      if (data.availableCredit > data.creditLimit) {
        errors.push('Available credit cannot exceed credit limit');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get a summary of extracted data for user review
   */
  static getDataSummary(data: CreditCardStatementData): string {
    const summary: string[] = [];
    
    if (data.previousBalance !== undefined) {
      summary.push(`Previous Balance: $${data.previousBalance.toFixed(2)}`);
    }
    if (data.purchases !== undefined) {
      summary.push(`Purchases: $${data.purchases.toFixed(2)}`);
    }
    if (data.payments !== undefined) {
      summary.push(`Payments: $${data.payments.toFixed(2)}`);
    }
    if (data.interest !== undefined) {
      summary.push(`Interest/Fees: $${data.interest.toFixed(2)}`);
    }
    if (data.interestRate !== undefined) {
      summary.push(`Interest Rate: ${data.interestRate}%`);
    }
    if (data.creditLimit !== undefined) {
      summary.push(`Credit Limit: $${data.creditLimit.toFixed(2)}`);
    }
    if (data.minimumPayment !== undefined) {
      summary.push(`Minimum Payment: $${data.minimumPayment.toFixed(2)}`);
    }
    if (data.dueDate) {
      summary.push(`Due Date: ${data.dueDate.toLocaleDateString()}`);
    }

    return summary.length > 0 ? summary.join('\n') : 'No statement data extracted';
  }
}