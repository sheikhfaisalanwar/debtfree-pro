// Jest setup file

// Suppress console warnings in tests
const originalConsoleError = console.error;
console.error = (...args) => {
  // Only show errors that are not from our test scenarios
  if (!args[0]?.includes?.('Failed to delete document') && 
      !args[0]?.includes?.('Failed to get uploaded documents')) {
    originalConsoleError(...args);
  }
};