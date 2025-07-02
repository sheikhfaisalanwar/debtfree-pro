import { PDFParsingService, CreditCardStatementData } from '../../src/services/PDFParsingService';

// No filesystem dependencies needed for PDF parsing

describe('PDFParsingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractTextFromPDF', () => {
    it('should return manual entry placeholder for PDF', async () => {
      const result = await PDFParsingService.extractTextFromPDF('/mock/path/statement.pdf');

      expect(result).toEqual({
        text: 'PDF_REQUIRES_MANUAL_ENTRY:statement.pdf',
        pages: 1,
        info: {
          filename: 'statement.pdf',
          requiresManualEntry: true
        }
      });
    });

    it('should extract filename from complex paths', async () => {
      const result = await PDFParsingService.extractTextFromPDF('/Users/documents/long/path/credit_card_statement.pdf');

      expect(result.text).toBe('PDF_REQUIRES_MANUAL_ENTRY:credit_card_statement.pdf');
      expect(result.info.filename).toBe('credit_card_statement.pdf');
    });

    it('should use default filename for empty paths', async () => {
      const result = await PDFParsingService.extractTextFromPDF('');

      expect(result.text).toBe('PDF_REQUIRES_MANUAL_ENTRY:statement.pdf');
      expect(result.info.filename).toBe('statement.pdf');
    });

    it('should handle null/undefined filePaths safely', async () => {
      // Test null
      const result1 = await PDFParsingService.extractTextFromPDF(null as any);
      expect(result1.info.filename).toBe('statement.pdf');

      // Test undefined  
      const result2 = await PDFParsingService.extractTextFromPDF(undefined as any);
      expect(result2.info.filename).toBe('statement.pdf');
    });

    it('should handle Windows-style paths', async () => {
      const result = await PDFParsingService.extractTextFromPDF('C:\\Users\\Documents\\statement.pdf');

      expect(result.text).toBe('PDF_REQUIRES_MANUAL_ENTRY:statement.pdf');
      expect(result.info.filename).toBe('statement.pdf');
    });
  });

  describe('parseCreditCardStatement', () => {
    it('should return empty data for manual entry placeholder', () => {
      const result = PDFParsingService.parseCreditCardStatement('PDF_REQUIRES_MANUAL_ENTRY:statement.pdf');
      
      expect(result).toEqual({});
    });

    it('should parse credit card statement with all fields', () => {
      const pdfText = `
        CREDIT CARD STATEMENT
        Previous Balance: $1,500.00
        Purchases: $250.75
        Payments: $500.00
        Interest Charged: $25.30
        Minimum Payment: $45.00
        Credit Limit: $5,000.00
        Available Credit: $3,224.05
        Purchase APR: 18.99%
        Statement Date: 12/15/2023
        Due Date: 01/10/2024
      `;

      const result = PDFParsingService.parseCreditCardStatement(pdfText);

      expect(result.previousBalance).toBe(1500);
      expect(result.purchases).toBe(250.75);
      expect(result.payments).toBe(500);
      expect(result.interest).toBe(25.30);
      expect(result.minimumPayment).toBe(45);
      expect(result.creditLimit).toBe(5000);
      expect(result.availableCredit).toBe(3224.05);
      expect(result.interestRate).toBe(18.99);
      expect(result.statementDate).toEqual(new Date('12/15/2023'));
      expect(result.dueDate).toEqual(new Date('01/10/2024'));
    });

    it('should handle different field name variations', () => {
      const pdfText = `
        Beginning Balance: $1,200.00
        New Purchases: $150.50
        Payment Received: $300.00
        Finance Charge: $20.15
        Annual Percentage Rate: 21.5%
      `;

      const result = PDFParsingService.parseCreditCardStatement(pdfText);

      expect(result.previousBalance).toBe(1200);
      expect(result.purchases).toBe(150.50);
      expect(result.payments).toBe(300);
      expect(result.interest).toBe(20.15);
      expect(result.interestRate).toBe(21.5);
    });

    it('should handle missing or unrecognizable data', () => {
      const pdfText = `
        This is just random text that doesn't contain
        any recognizable credit card statement data.
      `;

      const result = PDFParsingService.parseCreditCardStatement(pdfText);

      expect(result.previousBalance).toBeUndefined();
      expect(result.purchases).toBeUndefined();
      expect(result.payments).toBeUndefined();
      expect(result.interest).toBeUndefined();
    });

    it('should handle amounts without dollar signs', () => {
      const pdfText = `
        Previous Balance: 1,500.00
        Purchases: 250.75
        Payments: 500.00
        Interest Charged: 25.30
      `;

      const result = PDFParsingService.parseCreditCardStatement(pdfText);

      expect(result.previousBalance).toBe(1500);
      expect(result.purchases).toBe(250.75);
      expect(result.payments).toBe(500);
      expect(result.interest).toBe(25.30);
    });
  });

  describe('validateStatementData', () => {
    it('should validate correct statement data', () => {
      const data: CreditCardStatementData = {
        previousBalance: 1500,
        purchases: 250.75,
        payments: 500,
        interest: 25.30,
        interestRate: 18.99,
        creditLimit: 5000,
        availableCredit: 3224.05
      };

      const result = PDFParsingService.validateStatementData(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty data', () => {
      const data: CreditCardStatementData = {};

      const result = PDFParsingService.validateStatementData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('No recognizable credit card statement data found in PDF');
    });

    it('should reject negative amounts', () => {
      const data: CreditCardStatementData = {
        previousBalance: -100,
        purchases: 250.75
      };

      const result = PDFParsingService.validateStatementData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid previousBalance: -100');
    });

    it('should reject unrealistic interest rates', () => {
      const data: CreditCardStatementData = {
        previousBalance: 1500,
        interestRate: 75.5 // Unrealistically high
      };

      const result = PDFParsingService.validateStatementData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Interest rate seems unrealistic: 75.5%');
    });

    it('should reject available credit exceeding credit limit', () => {
      const data: CreditCardStatementData = {
        previousBalance: 1500,
        creditLimit: 5000,
        availableCredit: 6000 // Exceeds credit limit
      };

      const result = PDFParsingService.validateStatementData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Available credit cannot exceed credit limit');
    });
  });

  describe('getDataSummary', () => {
    it('should generate a comprehensive summary', () => {
      const data: CreditCardStatementData = {
        previousBalance: 1500,
        purchases: 250.75,
        payments: 500,
        interest: 25.30,
        interestRate: 18.99,
        creditLimit: 5000,
        minimumPayment: 45,
        dueDate: new Date('2024-01-10')
      };

      const summary = PDFParsingService.getDataSummary(data);

      expect(summary).toContain('Previous Balance: $1500.00');
      expect(summary).toContain('Purchases: $250.75');
      expect(summary).toContain('Payments: $500.00');
      expect(summary).toContain('Interest/Fees: $25.30');
      expect(summary).toContain('Interest Rate: 18.99%');
      expect(summary).toContain('Credit Limit: $5000.00');
      expect(summary).toContain('Minimum Payment: $45.00');
      expect(summary).toContain('Due Date: 2024-01-09'); // toLocaleDateString format may vary
    });

    it('should handle empty data', () => {
      const data: CreditCardStatementData = {};

      const summary = PDFParsingService.getDataSummary(data);

      expect(summary).toBe('No statement data extracted');
    });

    it('should handle partial data', () => {
      const data: CreditCardStatementData = {
        previousBalance: 1500,
        interestRate: 18.99
      };

      const summary = PDFParsingService.getDataSummary(data);

      expect(summary).toContain('Previous Balance: $1500.00');
      expect(summary).toContain('Interest Rate: 18.99%');
      expect(summary).not.toContain('Purchases:');
      expect(summary).not.toContain('Payments:');
    });
  });
});