import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { StatementProcessingService } from '../services/StatementProcessingService';
import { DocumentManagerService } from '../services/DocumentManagerService';
import { ManualDebtEntryModal } from './ManualDebtEntryModal';

interface DocumentUploadProps {
  onSuccess?: () => void;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({ onSuccess }) => {
  const [showActionModal, setShowActionModal] = useState(false);
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lastUploadResult, setLastUploadResult] = useState<string | null>(null);
  const [pendingStatement, setPendingStatement] = useState<any>(null);

  const handleDocumentUpload = async () => {
    try {
      setUploading(true);
      setLastUploadResult(null);
      setShowActionModal(false);

      // Upload and process the document
      const uploadResult = await DocumentManagerService.uploadAndProcessDocument();
      
      if (!uploadResult.success || !uploadResult.statement) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      // Check if meaningful data was extracted from the PDF
      const hasExtractedData = (uploadResult.statement as any).hasExtractedData;
      
      if (hasExtractedData) {
        // PDF data was extracted - show success
        setLastUploadResult(`✅ Document uploaded and processed successfully!`);
        
        Alert.alert(
          'Upload Successful! 🎉',
          'Statement processed and debt information updated successfully.',
          [{ text: 'OK', style: 'default' }]
        );
        
        onSuccess?.();
      } else {
        // No meaningful data extracted - show manual entry modal
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
    } finally {
      setUploading(false);
    }
  };

  const handleDebtCreated = () => {
    setPendingStatement(null);
    setShowManualEntryModal(false);
    onSuccess?.();
  };

  const handleManualEntryModalClose = () => {
    setShowManualEntryModal(false);
    setPendingStatement(null);
  };

  const handleManualEntryOnly = () => {
    setShowActionModal(false);
    setShowManualEntryModal(true);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => setShowActionModal(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.actionButtonIcon}>➕</Text>
        <Text style={styles.actionButtonText}>Add Debt</Text>
      </TouchableOpacity>

      {/* Action Selection Modal */}
      <Modal
        visible={showActionModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowActionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.actionModalContainer}>
            <Text style={styles.actionModalTitle}>Add New Debt</Text>
            <Text style={styles.actionModalSubtitle}>
              Choose how you'd like to add your debt information
            </Text>

            <TouchableOpacity
              style={[styles.optionButton, uploading && styles.optionButtonDisabled]}
              onPress={handleDocumentUpload}
              disabled={uploading}
            >
              {uploading ? (
                <View style={styles.optionContent}>
                  <ActivityIndicator size="small" color="#3b82f6" />
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionTitle}>Processing...</Text>
                    <Text style={styles.optionDescription}>Please wait</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.optionContent}>
                  <Text style={styles.optionIcon}>📄</Text>
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionTitle}>Upload Statement</Text>
                    <Text style={styles.optionDescription}>
                      Upload a PDF or CSV statement to auto-extract debt info
                    </Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={handleManualEntryOnly}
            >
              <View style={styles.optionContent}>
                <Text style={styles.optionIcon}>✏️</Text>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Manual Entry</Text>
                  <Text style={styles.optionDescription}>
                    Enter debt information manually
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowActionModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Manual Entry Modal */}
      <ManualDebtEntryModal
        visible={showManualEntryModal}
        onClose={handleManualEntryModalClose}
        onDebtCreated={handleDebtCreated}
        fileName={pendingStatement?.fileName}
      />

      {/* Result Display */}
      {lastUploadResult && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>{lastUploadResult}</Text>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  actionButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  actionModalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  actionModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  actionModalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: 'white',
  },
  optionButtonDisabled: {
    opacity: 0.6,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 18,
  },
  cancelButton: {
    marginTop: 8,
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  resultContainer: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  resultText: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
  },
});