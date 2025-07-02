# 💳 DebtFreePro

**Smart debt payoff using the proven snowball method**

DebtFreePro is a React Native application that helps users track and eliminate their debt using the snowball method. The app features document upload capabilities for credit card statements and automatic debt tracking with a JSON-based data store.

## 🚀 Current Project Status

### ✅ Implemented Features

**Core Debt Management:**
- Debt snowball strategy calculation with payoff projections
- Dynamic dashboard with real-time debt summaries
- JSON-based data persistence for all debt and statement data
- Support for multiple debt types (Credit Card, Auto Loan, Line of Credit, etc.)
- **Manual debt entry with comprehensive validation**
- **Complete debt editing functionality for consecutive monthly updates**
- **Debt type conversions and account modifications**

**Document Upload & Processing:**
- CSV and PDF document upload from device storage
- Automatic statement parsing and validation
- **PDF manual entry fallback with graceful degradation**
- **Smart debt ID management and temporary state handling**
- Transaction categorization and analysis
- Statement-to-debt linking with confidence scoring
- File validation with comprehensive error handling

**Data Architecture:**
- Local JSON data store with full CRUD operations
- **Enhanced DataStoreService with overloaded debt creation methods**
- **Extended debt interface with account number and due date fields**
- Statement history tracking per debt account
- Automatic debt balance updates from uploaded statements
- Settings management (extra payments, strategy type, currency)
- Data export/import functionality

**User Interface:**
- Modern React Native UI with card-based design
- **ManualDebtEntryModal for creating debts from PDF uploads**
- **EditDebtModal for updating existing debt information**
- **Previous value hints and validation feedback**
- Progress tracking and payoff projections
- Loading states and error handling
- Dynamic next steps based on current debt strategy

### 🏗️ Architecture Overview

```
DebtFreePro/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── DebtCard.tsx     # Individual debt display
│   │   ├── ProgressBar.tsx  # Progress visualization
│   │   ├── StatCard.tsx     # Summary statistics
│   │   ├── DocumentUpload.tsx        # PDF/CSV upload with smart routing
│   │   ├── ManualDebtEntryModal.tsx  # Create debt from PDF upload
│   │   └── EditDebtModal.tsx         # Edit existing debt details
│   ├── data/
│   │   └── debts.json       # Initial data store template
│   ├── screens/
│   │   └── Dashboard.tsx    # Main application screen
│   ├── services/            # Business logic layer
│   │   ├── DataStoreService.ts           # JSON data persistence (enhanced)
│   │   ├── DebtService.ts                # Debt calculations (snowball)
│   │   ├── DocumentUploadService.ts      # File upload handling
│   │   ├── DocumentValidationService.ts  # CSV/PDF validation
│   │   ├── DocumentManagerService.ts     # Upload orchestration (enhanced)
│   │   ├── StatementProcessingService.ts # Statement analysis (enhanced)
│   │   └── PDFParsingService.ts          # PDF processing (manual entry)
│   └── types/               # TypeScript interfaces
│       ├── Debt.ts          # Debt data structures
│       ├── Statement.ts     # Statement/transaction types
│       └── Strategy.ts      # Payoff strategy types
└── __tests__/               # Comprehensive test suite
    ├── fixtures/            # Sample CSV data for testing
    ├── services/            # Service layer tests
    └── integration/         # End-to-end tests
```

### 📊 Data Flow

1. **Document Upload Pipeline:**
   ```
   User selects file → DocumentUploadService validates → 
   DocumentValidationService parses → DocumentManagerService processes → 
   [IF PDF + no data] → ManualDebtEntryModal → DataStoreService persists → 
   [IF data extracted] → Automatic processing → Dashboard updates
   ```

2. **Manual Debt Entry Flow:**
   ```
   PDF Upload → No extractable data → ManualDebtEntryModal → 
   User enters debt details → DataStoreService.addDebt() → 
   Temporary debt ID state → StatementProcessingService links → 
   Dashboard updates
   ```

3. **Monthly Debt Update Flow:**
   ```
   User opens EditDebtModal → Updates balance/payments → 
   DataStoreService.updateDebt() → Preserves statement relationships → 
   Dashboard reflects changes
   ```

4. **Data Persistence:**
   ```
   JSON Store (debts.json) ↔ DataStoreService ↔ Components
   Enhanced with dual interface support (CreateDebtParams | Debt)
   ```

### 🧪 Testing Coverage

- **Unit Tests:** 49+ tests covering all service layers (including enhanced DataStoreService)
- **Integration Tests:** 30+ tests covering complete workflows
  - ManualDebtEntry.integration.test.ts (12 tests)
  - DebtEditing.integration.test.ts (11 tests) 
  - PDFProcessing.integration.test.ts (7 tests)
- **Mock Infrastructure:** Complete React Native module mocking
- **Test Fixtures:** Sample credit card, bank, and line of credit statements

**Test Execution:**
```bash
npm test                    # Run all tests
npm test -- services       # Run service tests only
npm run lint               # Code quality checks
```

### 🔧 Technology Stack

**Core:**
- React Native 0.80.1
- TypeScript 5.0.4
- React 19.1.0

**File Handling:**
- react-native-fs: File system operations
- react-native-document-picker: Document selection UI

**Development:**
- Jest: Testing framework
- ESLint: Code linting
- Babel: JavaScript transpilation

**Data Management:**
- Local JSON file storage
- No external database dependencies
- Automatic data migration and validation

### 📁 Key Data Structures

**Enhanced Debt Interface:**
```typescript
interface Debt {
  id: string;
  name: string;
  type: DebtType;
  balance: number;
  minimumPayment: number;
  interestRate: number;
  lastUpdated: Date;
  institution?: string;
  accountNumber?: string;    // NEW: Last 4 digits
  dueDate?: number;         // NEW: Day of month (1-31)
}
```

**Statement Interface:**
```typescript
interface Statement {
  id: string;
  debtId: string;
  statementDate: Date;
  balance: number;
  minimumPayment: number;
  dueDate: Date;
  interestCharged: number;
  payments: StatementPayment[];
  purchases: StatementTransaction[];
  fileName?: string;
  imported: Date;
}
```

**DataStore Structure:**
```typescript
interface DataStore {
  debts: Debt[];
  statements: Statement[];
  settings: {
    extraPayment: number;
    strategy: 'SNOWBALL' | 'AVALANCHE';
    currency: string;
  };
}
```

### 🎯 Document Processing Capabilities

**Supported Formats:**
- CSV files with multiple header formats
- PDF files with manual entry fallback (automatic extraction gracefully degrades)

**CSV Header Support:**
- `Date, Amount, Description`
- `Transaction Date, Transaction Amount, Description`
- `Posted Date, Debit, Credit, Description`
- Automatic detection of credit card vs. line of credit statements

**Validation Features:**
- File type and size validation (10MB limit)
- CSV structure and data integrity checks
- Date and amount format validation
- Automatic transaction categorization
- Document type detection (credit card, line of credit, etc.)

### 🎨 UI Components Status

**Dashboard Features:**
- Real-time debt summary cards
- Progress visualization with percentage complete
- Dynamic next steps based on snowball strategy
- Responsive design with proper loading states

**Modal Components:**
- ManualDebtEntryModal: Complete debt creation from PDF uploads
- EditDebtModal: Monthly balance updates and debt management
- Previous value hints for easy comparison during edits
- Comprehensive validation with user-friendly error messages

**Styling:**
- Modern card-based design with shadows
- Consistent color scheme (grays, greens for success)
- Emoji icons for visual appeal
- Canadian dollar formatting

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18
- React Native development environment set up
- iOS Simulator or Android Emulator

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone [repository-url]
   cd DebtFreePro
   npm install
   ```

2. **iOS Setup:**
   ```bash
   cd ios
   bundle install
   bundle exec pod install
   cd ..
   ```

3. **Run the application:**
   ```bash
   # Start Metro bundler
   npm start
   
   # Run on iOS
   npm run ios
   
   # Run on Android
   npm run android
   ```

### Development Workflow

1. **Code Quality:**
   ```bash
   npm run lint          # Check code style
   npm test              # Run test suite
   ```

2. **Testing with Sample Data:**
   - Sample CSV files available in `__tests__/fixtures/`
   - Use document picker in app to upload test statements
   - Check `src/data/debts.json` for initial debt data

3. **Data Management:**
   - App data stored in device's document directory
   - Initial data loaded from `src/data/debts.json`
   - Use DataStoreService for programmatic data access

## 🔄 Next Development Priorities

### ⚠️ Domain Model Refactoring (High Priority)
The current models have become overloaded and need refactoring for better separation of concerns:

**Current Issues:**
- `Debt` interface handles both account info and financial state
- `Statement` interface mixes document metadata with transaction data  
- `DataStoreService` manages too many responsibilities
- Mixed concerns between document processing and debt management

**Planned Refactoring:**
1. **Separate Account from Debt:** Create `DebtAccount` (institution, account#, type) vs `DebtBalance` (amount, rate, payment)
2. **Extract Document Model:** Separate `Document` entity from `Statement` financial data
3. **Split Service Responsibilities:** Separate account management from transaction processing
4. **Normalize Data Relationships:** Better foreign key relationships between entities

### High Priority (After Refactoring)
1. **Settings Screen:** Configure extra payments and strategy preferences
2. **Statement Review UI:** Screen to review and edit parsed transactions  
3. **Enhanced PDF Processing:** Implement OCR or PDF text extraction
4. **Data Migration:** Handle schema changes gracefully

### Medium Priority
1. **Data Visualization:** Charts for debt progress and trends
2. **Payment Reminders:** Notification system for due dates
3. **Export Features:** PDF reports and CSV exports
4. **Backup/Sync:** Cloud storage integration

### Low Priority
1. **Advanced Analytics:** Spending categorization and insights
2. **Multiple Strategies:** Implement debt avalanche method
3. **Goal Setting:** Custom payoff date targets
4. **Educational Content:** Debt management tips and resources

## 🧪 Testing Philosophy

The project maintains comprehensive test coverage with:

- **Unit Tests:** Every service method tested with mocks
- **Integration Tests:** Real CSV processing with sample data
- **Error Scenarios:** Malformed data and edge cases covered
- **Performance Tests:** Large file processing validation

Test files mirror the source structure and include realistic sample data for thorough validation.

## 📝 Development Notes

### Current Limitations
- PDF parsing requires manual entry (automatic extraction not implemented)
- Domain models are overloaded and need refactoring
- No cloud sync or backup functionality
- Single user support only
- Limited to snowball method (avalanche planned)

### Code Conventions
- TypeScript strict mode enabled
- ESLint with React Native preset
- Functional components with hooks
- Service layer pattern for business logic
- Comprehensive error handling throughout

### Data Persistence Strategy
- Local JSON file storage for simplicity
- Automatic backup on data changes
- Migration support for future schema changes
- No external dependencies or network requirements
