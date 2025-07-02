import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StatementProcessingService } from '../services/StatementProcessingService';
import { DocumentManagerService } from '../services/DocumentManagerService';
import { ManualDebtEntryModal } from './ManualDebtEntryModal';
import { Debt } from '../types/Debt';

interface DocumentUploadProps {
  debtId?: string;
  onUploadSuccess?: () => void;
  onUploadError?: (error: string) => void;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  debtId,
  onUploadSuccess,
  onUploadError,
}) => {
  const [uploading, setUploading] = useState(false);
  const [lastUploadResult, setLastUploadResult] = useState<string | null>(null);
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [pendingStatement, setPendingStatement] = useState<any>(null);
  const [createdDebtId, setCreatedDebtId] = useState<string | null>(null);

  const handleDocumentUpload = async () => {
    try {
      setUploading(true);
      setLastUploadResult(null);

      // First, upload and process the document to see what data we get
      const uploadResult = await DocumentManagerService.uploadAndProcessDocument(debtId);
      
      if (!uploadResult.success || !uploadResult.statement) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      // Check if meaningful data was extracted from the PDF
      const hasExtractedData = (uploadResult.statement as any).hasExtractedData;
      
      if (hasExtractedData && debtId) {
        // PDF data was extracted and we have a debtId - proceed with automatic processing
        const result = await StatementProcessingService.processUploadedStatement(debtId);

        if (result.updated && result.statement && result.analysis) {
          const analysisText = StatementProcessingService.formatAnalysisSummary(result.analysis);
          setLastUploadResult(`✅ Upload successful! ${analysisText}`);
          
          Alert.alert(
            'Upload Successful! 🎉',
            `Statement processed successfully.\n\n${analysisText}`,
            [{ text: 'OK', style: 'default' }]
          );
          
          onUploadSuccess?.();
        } else if (result.statement) {
          const validationSummary = result.statement.fileName 
            ? `Statement "${result.statement.fileName}" uploaded successfully`
            : 'Statement uploaded successfully';
          
          setLastUploadResult(`✅ ${validationSummary}`);
          Alert.alert('Upload Complete', validationSummary);
          onUploadSuccess?.();
        } else {
          throw new Error(result.error || 'Processing failed');
        }
      } else {
        // No meaningful data extracted or no debtId - show manual entry modal
        setPendingStatement(uploadResult.statement);
        setShowManualEntryModal(true);
        setLastUploadResult(`📄 Document uploaded. Please enter debt details manually.`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setLastUploadResult(`❌ ${errorMessage}`);
      
      Alert.alert(
        'Upload Failed',
        errorMessage,
        [{ text: 'OK', style: 'default' }]
      );
      
      onUploadError?.(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleDebtCreated = async (debt: Debt) => {
    try {
      // Store the created debt ID in temporary state
      setCreatedDebtId(debt.id);
      
      if (pendingStatement) {
        // Process the existing statement with the newly created debt ID
        const result = await StatementProcessingService.processExistingStatement(pendingStatement.id, debt.id);
        
        if (result.statement) {
          setLastUploadResult(`✅ Debt created and statement linked successfully! (Debt ID: ${debt.id})`);
          Alert.alert(
            'Success! 🎉',
            `Debt "${debt.name}" has been created with ID ${debt.id} and your statement has been linked to it.`,
            [{ text: 'OK', style: 'default' }]
          );
          onUploadSuccess?.();
        } else {
          throw new Error(result.error || 'Failed to process statement');
        }
      }
    } catch (error) {
      Alert.alert(
        'Error',
        `Failed to link statement to debt: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      // Clear temporary states
      setPendingStatement(null);
      setCreatedDebtId(null);
    }
  };

  const handleModalClose = () => {
    setShowManualEntryModal(false);
    setPendingStatement(null);
    setCreatedDebtId(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📄 Upload Statement</Text>
        <Text style={styles.subtitle}>
          Upload CSV or PDF statements to automatically update your debt information
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
        onPress={handleDocumentUpload}
        disabled={uploading}
        activeOpacity={0.7}
      >
        {uploading ? (
          <View style={styles.uploadingContent}>
            <ActivityIndicator size="small" color="#ffffff" />
            <Text style={styles.uploadButtonText}>Processing...</Text>
          </View>
        ) : (
          <View style={styles.uploadContent}>
            <Text style={styles.uploadIcon}>📎</Text>
            <Text style={styles.uploadButtonText}>Choose Document</Text>
            <Text style={styles.uploadHint}>CSV or PDF</Text>
          </View>
        )}
      </TouchableOpacity>

      {lastUploadResult && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>{lastUploadResult}</Text>
        </View>
      )}

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>📋 Supported Formats:</Text>
        <Text style={styles.infoText}>• CSV files with transaction data</Text>
        <Text style={styles.infoText}>• PDF bank and credit card statements</Text>
        <Text style={styles.infoText}>• Maximum file size: 10MB</Text>
      </View>

      <ManualDebtEntryModal
        visible={showManualEntryModal}
        onClose={handleModalClose}
        onDebtCreated={handleDebtCreated}
        fileName={pendingStatement?.fileName}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  uploadButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    minHeight: 80,
  },
  uploadButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  uploadContent: {
    alignItems: 'center',
  },
  uploadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  uploadIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  uploadButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  uploadHint: {
    color: '#bfdbfe',
    fontSize: 12,
    marginTop: 4,
  },
  resultContainer: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  resultText: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
  },
  infoContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
    lineHeight: 16,
  },
});