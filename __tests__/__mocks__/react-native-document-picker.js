// Mock for react-native-document-picker
module.exports = {
  pick: jest.fn(),
  isCancel: jest.fn(),
  types: {
    csv: 'text/csv',
    pdf: 'application/pdf',
  },
};