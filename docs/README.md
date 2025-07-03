# DebtFreePro Documentation

Welcome to the DebtFreePro documentation. This document provides a comprehensive overview of the application's architecture, domain models, and key workflows.

## Table of Contents

1. [Application Overview](#application-overview)
2. [Architecture](#architecture)
3. [Domain Models](#domain-models)
4. [Dashboard Actions](#dashboard-actions)
5. [Data Flow](#data-flow)
6. [Testing Strategy](#testing-strategy)

## Application Overview

DebtFreePro is a React Native application designed to help users manage and pay off their debts using proven strategies like the debt snowball method. The app allows users to:

- Manually enter debt information
- Upload and process financial statements (CSV/PDF)
- Track debt balances over time
- Calculate optimal payoff strategies
- Monitor progress toward debt freedom

## Architecture

DebtFreePro follows a clean architecture pattern with separated concerns:

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Presentation  │    │    Business     │    │      Data       │
│     Layer       │◄──►│     Logic       │◄──►│     Layer       │
│                 │    │     Layer       │    │                 │
│ - Components    │    │ - Services      │    │ - DataStore     │
│ - Screens       │    │ - Strategies    │    │ - File System   │
│ - Modals        │    │ - Validation    │    │ - JSON Storage  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack

- **Frontend**: React Native with TypeScript
- **State Management**: React Hooks (useState, useEffect)
- **Data Storage**: JSON files via React Native FS
- **Testing**: Jest with React Native Testing Library
- **Build System**: Metro bundler
- **Type Safety**: TypeScript throughout

### Folder Structure

```
src/
├── components/          # Reusable UI components
├── screens/            # Main application screens
├── services/           # Business logic and data access
├── types/              # TypeScript type definitions
├── data/               # Static data and initial datasets
└── utils/              # Utility functions
```

## Domain Models

The application uses a domain-driven design approach with separated concerns:

### Core Entities

1. **DebtAccount** - Account identity and metadata
2. **DebtBalance** - Financial balance information
3. **Document** - File metadata and processing status
4. **FinancialStatement** - Statement data with transactions
5. **DataStore** - Unified data schema

See [Domain Models](./domain-models.md) for detailed information.

## Dashboard Actions

The main dashboard provides several key actions:

1. **Manual Debt Entry** - Add debts manually
2. **Document Upload** - Upload and process statements
3. **Debt Editing** - Modify existing debt information
4. **Strategy Calculation** - Calculate payoff strategies
5. **Progress Tracking** - Monitor debt reduction progress

See [Dashboard Actions](./dashboard-actions.md) for sequence diagrams and detailed workflows.

## Data Flow

```
User Input → Validation → Business Logic → Data Storage → UI Update
```

### Key Data Flows

1. **Debt Creation**: User input → Validation → Account + Balance creation → Storage
2. **Document Processing**: File upload → Parsing → Data extraction → Statement creation
3. **Strategy Calculation**: Debt data → Algorithm → Strategy generation → Display

## Testing Strategy

The application uses a comprehensive testing approach:

- **Unit Tests**: Individual service and utility functions
- **Integration Tests**: Component interactions and data flows
- **Component Tests**: UI component behavior
- **Mock Services**: Isolated testing with mocked dependencies

Current test coverage: **96.5%** (136 passing tests out of 141 total)

## Getting Started

For development setup and contribution guidelines, see the main [README.md](../README.md) file.

## API Reference

For detailed API documentation, see:
- [DataStoreService API](./api/datastore-service.md)
- [Document Services API](./api/document-services.md)
- [Strategy Services API](./api/strategy-services.md)