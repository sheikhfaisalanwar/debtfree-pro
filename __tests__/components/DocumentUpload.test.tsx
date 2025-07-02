import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { DocumentUpload } from '../../src/components/DocumentUpload';

describe('DocumentUpload', () => {
  it('renders correctly with default state', async () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    
    await ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(<DocumentUpload />);
    });

    const json = tree!.toJSON();
    expect(json).toMatchSnapshot();
  });

  it('renders with debtId prop', async () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    
    await ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(<DocumentUpload debtId="debt_123" />);
    });

    const json = tree!.toJSON();
    expect(json).toBeTruthy();
  });

  it('renders with callback props', async () => {
    const mockOnSuccess = jest.fn();
    const mockOnError = jest.fn();
    let tree: ReactTestRenderer.ReactTestRenderer;
    
    await ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <DocumentUpload 
          onUploadSuccess={mockOnSuccess} 
          onUploadError={mockOnError} 
        />
      );
    });

    const json = tree!.toJSON();
    expect(json).toBeTruthy();
  });
});