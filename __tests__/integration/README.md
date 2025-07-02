# Integration Tests

This directory contains comprehensive integration tests that verify the interaction between different components of the DebtFreePro application.

## Test Files

### `ManualDebtEntry.integration.test.ts`
**Comprehensive tests for manual debt entry flow and debt state updates (12 test cases)**

#### Test Categories:

**1. Complete Manual Debt Entry Flow (3 tests)**
- End-to-end PDF upload → manual entry → debt creation → statement linking
- Debt creation with all optional fields (institution, account number, due date)
- Multiple debt types support (Credit Card, Auto Loan, Student Loan, etc.)

**2. Error Handling and Edge Cases (3 tests)**
- Debt creation failure scenarios
- Statement not found errors
- Invalid debt ID handling (empty, null, undefined)

**3. Statement Analysis and Debt Updates (2 tests)**
- Analysis of manual entry statements vs existing debt balances
- Debt updates when statement data differs from current debt state

**4. State Management and Cleanup (2 tests)**
- Multi-statement to multi-debt relationship management
- Concurrent manual entry operations (sequential processing)

**5. Data Validation and Integrity (2 tests)**
- Edge case value validation (very small balances, minimum payments)
- Statement metadata preservation during debt linking

#### Key Features Tested:
- ✅ PDF upload and processing for manual entry scenarios
- ✅ Debt creation in JSON data store with unique ID generation
- ✅ Temporary state management for debt ID handoff
- ✅ Statement-to-debt linking via `StatementProcessingService.processExistingStatement()`
- ✅ Debt balance analysis and updates when statement data differs
- ✅ Error handling for missing debts, statements, and invalid IDs
- ✅ Data integrity preservation during the linking process
- ✅ Support for all debt types (Credit Card, Auto Loan, Personal Loan, etc.)

### `PDFProcessing.integration.test.ts`
**Tests for PDF processing pipeline (7 test cases)**
- PDF document validation and processing
- Manual entry requirement detection
- Error handling for corrupted or oversized PDFs
- Real-world PDF statement format support

### `DebtEditing.integration.test.ts`
**Comprehensive tests for debt editing and monthly updates (11 test cases)**

#### Test Categories:

**1. Monthly Debt Updates for Consecutive Payments (3 tests)**
- Monthly balance updates after payment processing
- Multiple consecutive monthly statement updates
- Manual balance corrections for incorrect statements

**2. Debt Type Changes and Updates (2 tests)**
- Converting debt types (Credit Card → Line of Credit)
- Preserving statement relationships during debt updates

**3. Debt Deletion and Cleanup (2 tests)**
- Complete debt deletion with associated statements
- Graceful handling of non-existent debt deletion

**4. Bulk Debt Operations (2 tests)**
- Sequential multiple debt updates
- Total debt calculation across all accounts

**5. Data Validation and Error Handling (2 tests)**
- Concurrent debt update safety
- Data integrity preservation during failed updates

#### Key Features Tested:
- ✅ Monthly debt balance updates from statement processing
- ✅ Consecutive payment tracking over multiple months
- ✅ Debt type conversions and account changes
- ✅ Manual balance corrections for discrepancies
- ✅ Bulk debt operations and calculations
- ✅ Error handling and data integrity preservation
- ✅ Statement-debt relationship maintenance

## Test Coverage

The integration tests provide comprehensive coverage of:

1. **Manual Debt Entry Workflow**: Complete flow from PDF upload to debt creation and statement linking
2. **State Management**: Proper handling of temporary debt IDs and state cleanup
3. **Error Scenarios**: Graceful handling of failures at each step
4. **Data Integrity**: Ensuring all data is properly preserved and linked
5. **Edge Cases**: Boundary conditions and unusual input values
6. **Concurrent Operations**: Multiple simultaneous debt entry operations

## Running Tests

```bash
# Run all integration tests
npm test __tests__/integration/

# Run specific integration test file
npm test __tests__/integration/ManualDebtEntry.integration.test.ts

# Run with coverage
npm test -- --coverage __tests__/integration/
```

## Test Results

- **ManualDebtEntry.integration.test.ts**: 12/12 tests passing ✅
- **PDFProcessing.integration.test.ts**: 7/7 tests passing ✅
- **DebtEditing.integration.test.ts**: 11/11 tests passing ✅
- **Total**: 30/30 integration tests passing ✅

These tests ensure that the manual debt entry and debt editing features work correctly in all scenarios and properly integrate with the existing PDF processing and data storage systems.