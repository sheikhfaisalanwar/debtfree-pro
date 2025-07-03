# Strategy Services API

The Strategy Services provide debt payoff calculation algorithms and consolidation opportunity analysis.

## DebtService

The `DebtService` class implements debt payoff strategies and financial calculations.

### Overview

```typescript
class DebtService {
  static calculateSnowballStrategy(debts: DebtAccountBalance[] | LegacyDebt[], extraPayment: number = 0): PayoffStrategy
  static findConsolidationOpportunities(debts: DebtAccountBalance[] | LegacyDebt[]): ConsolidationOpportunity[]
  
  // Private helper methods
  private static calculatePayoffTime(balance: number, monthlyPayment: number, annualRate: number): number
  private static calculateTotalInterest(balance: number, monthlyPayment: number, annualRate: number): number
}
```

## Methods

### `calculateSnowballStrategy(debts, extraPayment)`

Calculates a debt snowball strategy where debts are paid off in order of smallest balance first.

```typescript
static calculateSnowballStrategy(
  debts: DebtAccountBalance[] | LegacyDebt[], 
  extraPayment: number = 0
): PayoffStrategy
```

**Parameters:**
- `debts: DebtAccountBalance[] | LegacyDebt[]` - Array of debts (supports both new and legacy formats)
- `extraPayment: number` - Additional monthly payment amount (default: 0)

**Returns:** `PayoffStrategy`
```typescript
interface PayoffStrategy {
  id: string;                    // Unique strategy identifier
  name: string;                  // Strategy name ("Debt Snowball")
  type: StrategyType;           // SNOWBALL
  debts: DebtPayoffPlan[];      // Payoff plan for each debt
  totalInterestSaved: number;   // Total interest saved vs minimum payments
  payoffDate: Date;             // Final debt-free date
  monthlyPayment: number;       // Total monthly payment amount
}
```

**Algorithm:**
1. Sorts debts by balance (smallest first)
2. Allocates minimum payments to all debts
3. Applies extra payment to smallest debt
4. When debt is paid off, rolls payment to next smallest debt
5. Calculates payoff timeline and interest savings

**Example:**
```typescript
const debts = await DataStoreService.getAllAccountsWithBalances();
const strategy = DebtService.calculateSnowballStrategy(debts, 200);

console.log(`Debt-free date: ${strategy.payoffDate.toLocaleDateString()}`);
console.log(`Total monthly payment: $${strategy.monthlyPayment}`);

strategy.debts.forEach((plan, index) => {
  console.log(`${index + 1}. Pay $${plan.monthlyPayment} toward debt ${plan.debtId}`);
  console.log(`   Payoff date: ${plan.payoffDate.toLocaleDateString()}`);
  console.log(`   Total interest: $${plan.totalInterest.toFixed(2)}`);
});
```

### `findConsolidationOpportunities(debts)`

Analyzes debts for potential consolidation opportunities.

```typescript
static findConsolidationOpportunities(
  debts: DebtAccountBalance[] | LegacyDebt[]
): ConsolidationOpportunity[]
```

**Parameters:**
- `debts: DebtAccountBalance[] | LegacyDebt[]` - Array of debts to analyze

**Returns:** `ConsolidationOpportunity[]`
```typescript
interface ConsolidationOpportunity {
  id: string;                   // Unique opportunity identifier
  targetDebts: string[];       // IDs of debts to consolidate
  newLoanAmount: number;       // Total amount of new loan
  newInterestRate: number;     // Proposed new interest rate
  newMonthlyPayment: number;   // New monthly payment
  interestSavings: number;     // Estimated interest savings
  timeSavings: number;         // Estimated time savings (months)
  provider: string;            // Suggested loan provider type
}
```

**Algorithm:**
1. Identifies high-interest debts (>15% APR)
2. Calculates weighted average interest rate
3. Estimates consolidation loan terms (assumes 12% APR)
4. Compares potential savings

**Example:**
```typescript
const debts = await DataStoreService.getAllAccountsWithBalances();
const opportunities = DebtService.findConsolidationOpportunities(debts);

opportunities.forEach(opportunity => {
  console.log(`Consolidation Opportunity:`);
  console.log(`  Consolidate ${opportunity.targetDebts.length} debts`);
  console.log(`  New loan amount: $${opportunity.newLoanAmount}`);
  console.log(`  New rate: ${opportunity.newInterestRate}%`);
  console.log(`  Interest savings: $${opportunity.interestSavings}`);
  console.log(`  Time savings: ${opportunity.timeSavings} months`);
});
```

## Supporting Types

### `DebtPayoffPlan`

Represents the payoff plan for a single debt within a strategy.

```typescript
interface DebtPayoffPlan {
  debtId: string;              // Reference to debt account
  payoffOrder: number;         // Order in payoff sequence (1-based)
  monthlyPayment: number;      // Monthly payment amount for this debt
  payoffDate: Date;           // Projected payoff date
  totalInterest: number;      // Total interest to be paid
  isPriority: boolean;        // Whether this is the current priority debt
}
```

### `StrategyType`

Enum of available strategy types.

```typescript
enum StrategyType {
  SNOWBALL = 'SNOWBALL',     // Pay smallest balance first
  AVALANCHE = 'AVALANCHE',   // Pay highest interest first (future)
  CUSTOM = 'CUSTOM'          // User-defined strategy (future)
}
```

### Legacy Support Types

```typescript
interface LegacyDebt {
  id: string;
  name: string;
  balance: number;
  minimumPayment: number;
  interestRate: number;
}
```

## Financial Calculations

### Interest and Payment Calculations

The service uses standard financial formulas for calculations:

#### Monthly Payment Calculation
For calculating payoff time given a fixed payment:

```
months = -log(1 - (balance × monthlyRate) / monthlyPayment) / log(1 + monthlyRate)
```

Where:
- `monthlyRate = annualRate / 100 / 12`
- `balance` = current debt balance
- `monthlyPayment` = fixed monthly payment amount

#### Total Interest Calculation
For calculating total interest paid:

```
totalInterest = (monthlyPayment × payoffMonths) - balance
```

### Strategy Benefits

#### Debt Snowball Benefits
1. **Psychological Motivation**: Quick wins from paying off smaller debts
2. **Momentum Building**: Freed-up payments accelerate remaining debts
3. **Simplified Management**: Focus on one priority debt at a time
4. **Behavioral Success**: Higher completion rates than other methods

#### Mathematical Considerations
- **Not Mathematically Optimal**: Doesn't minimize total interest
- **Behavior Over Math**: Optimizes for human psychology and success rates
- **Flexibility**: Can be adjusted based on user preferences

## Usage Examples

### Basic Snowball Strategy

```typescript
// Get current debt data
const debts = await DataStoreService.getAllAccountsWithBalances();
const settings = await DataStoreService.getSettings();

// Calculate strategy
const strategy = DebtService.calculateSnowballStrategy(debts, settings.extraPayment);

// Display results
console.log('Debt Snowball Strategy:');
console.log(`Total Monthly Payment: $${strategy.monthlyPayment}`);
console.log(`Debt-Free Date: ${strategy.payoffDate.toLocaleDateString()}`);

// Show priority debt
const priorityDebt = strategy.debts.find(d => d.isPriority);
if (priorityDebt) {
  console.log(`Focus on debt ${priorityDebt.debtId} with $${priorityDebt.monthlyPayment}/month`);
}
```

### Consolidation Analysis

```typescript
// Analyze consolidation opportunities
const opportunities = DebtService.findConsolidationOpportunities(debts);

if (opportunities.length > 0) {
  console.log('Consolidation opportunities found:');
  opportunities.forEach((opp, index) => {
    console.log(`Option ${index + 1}:`);
    console.log(`  Consolidate ${opp.targetDebts.length} high-interest debts`);
    console.log(`  Potential savings: $${opp.interestSavings.toFixed(2)}`);
    console.log(`  Time savings: ${opp.timeSavings} months`);
  });
} else {
  console.log('No beneficial consolidation opportunities found.');
}
```

### Strategy Comparison

```typescript
// Compare different extra payment amounts
const extraPaymentOptions = [0, 100, 200, 500];

extraPaymentOptions.forEach(extraPayment => {
  const strategy = DebtService.calculateSnowballStrategy(debts, extraPayment);
  console.log(`Extra Payment: $${extraPayment}`);
  console.log(`  Debt-Free Date: ${strategy.payoffDate.toLocaleDateString()}`);
  console.log(`  Total Monthly: $${strategy.monthlyPayment}`);
});
```

## Error Handling

The strategy services handle various edge cases:

1. **Empty Debt List**: Returns empty strategy
2. **Zero Balances**: Skips debts with zero balance
3. **Invalid Payments**: Handles cases where minimum payment > balance
4. **Infinite Payoff**: Detects when payments don't cover interest

## Future Enhancements

Planned additions to the strategy services:

1. **Debt Avalanche**: Pay highest interest rate first
2. **Custom Strategies**: User-defined payoff order
3. **What-If Analysis**: Compare multiple scenarios
4. **Tax Considerations**: Factor in tax-deductible interest
5. **Investment Alternatives**: Compare debt payoff vs investing