import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Debt, DebtType } from '../types/Debt';
import { DataStoreService } from '../services/DataStoreService';

interface EditDebtModalProps {
  visible: boolean;
  debt: Debt;
  onSave: () => void;
  onCancel: () => void;
}

export const EditDebtModal: React.FC<EditDebtModalProps> = ({
  visible,
  debt,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<DebtType>(DebtType.CREDIT_CARD);
  const [balance, setBalance] = useState('');
  const [minimumPayment, setMinimumPayment] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [institution, setInstitution] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);

  // Populate form when debt changes
  useEffect(() => {
    if (debt) {
      setName(debt.name);
      setType(debt.type);
      setBalance(debt.balance.toString());
      setMinimumPayment(debt.minimumPayment.toString());
      setInterestRate(debt.interestRate.toString());
      setInstitution(debt.institution || '');
      setAccountNumber(debt.accountNumber || '');
      setDueDate(debt.dueDate ? debt.dueDate.toString() : '');
    }
  }, [debt]);

  const resetForm = () => {
    setName('');
    setType(DebtType.CREDIT_CARD);
    setBalance('');
    setMinimumPayment('');
    setInterestRate('');
    setInstitution('');
    setAccountNumber('');
    setDueDate('');
  };

  const handleClose = () => {
    resetForm();
    onCancel();
  };

  const validateForm = (): string | null => {
    if (!name.trim()) return 'Debt name is required';
    if (!balance.trim()) return 'Balance is required';
    if (!minimumPayment.trim()) return 'Minimum payment is required';
    if (!interestRate.trim()) return 'Interest rate is required';

    const balanceNum = parseFloat(balance);
    const minPaymentNum = parseFloat(minimumPayment);
    const interestRateNum = parseFloat(interestRate);
    const dueDateNum = dueDate ? parseInt(dueDate) : undefined;

    if (isNaN(balanceNum) || balanceNum < 0) return 'Balance must be a valid positive number';
    if (isNaN(minPaymentNum) || minPaymentNum < 0) return 'Minimum payment must be a valid positive number';
    if (isNaN(interestRateNum) || interestRateNum < 0 || interestRateNum > 100) return 'Interest rate must be between 0 and 100';
    if (dueDateNum && (dueDateNum < 1 || dueDateNum > 31)) return 'Due date must be between 1 and 31';

    return null;
  };

  const handleSave = async () => {
    if (!debt) return;

    const validationError = validateForm();
    if (validationError) {
      Alert.alert('Validation Error', validationError);
      return;
    }

    try {
      setLoading(true);

      const updateParams = {
        id: debt.id,
        name: name.trim(),
        type,
        balance: parseFloat(balance),
        minimumPayment: parseFloat(minimumPayment),
        interestRate: parseFloat(interestRate),
        institution: institution.trim() || undefined,
        accountNumber: accountNumber.trim() || undefined,
        dueDate: dueDate ? parseInt(dueDate) : undefined,
      };

      const updatedDebt = await DataStoreService.updateDebt(updateParams);
      
      if (!updatedDebt) {
        throw new Error('Failed to update debt - debt not found');
      }

      onSave();
      handleClose();

      Alert.alert(
        'Debt Updated Successfully',
        `"${updatedDebt.name}" has been updated successfully.`,
        [{ text: 'OK', style: 'default' }]
      );
    } catch (error) {
      Alert.alert(
        'Error',
        `Failed to update debt: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!debt) return;

    Alert.alert(
      'Delete Debt',
      `Are you sure you want to delete "${debt.name}"? This action cannot be undone and will also delete all associated statements.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const success = await DataStoreService.deleteDebt(debt.id);
              
              if (success) {
                Alert.alert(
                  'Debt Deleted',
                  `"${debt.name}" has been deleted successfully.`,
                  [{ text: 'OK', style: 'default' }]
                );
                onSave();
                handleClose();
              } else {
                throw new Error('Failed to delete debt');
              }
            } catch (error) {
              Alert.alert(
                'Error',
                `Failed to delete debt: ${error instanceof Error ? error.message : 'Unknown error'}`,
                [{ text: 'OK', style: 'default' }]
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const debtTypes = [
    { value: DebtType.CREDIT_CARD, label: 'Credit Card' },
    { value: DebtType.LINE_OF_CREDIT, label: 'Line of Credit' },
    { value: DebtType.AUTO_LOAN, label: 'Auto Loan' },
    { value: DebtType.PERSONAL_LOAN, label: 'Personal Loan' },
    { value: DebtType.STUDENT_LOAN, label: 'Student Loan' },
    { value: DebtType.MORTGAGE, label: 'Mortgage' },
    { value: DebtType.OTHER, label: 'Other' },
  ];

  if (!debt || !visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Edit Debt</Text>
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>📝 Editing: {debt.name}</Text>
            <Text style={styles.infoText}>
              Update your debt information to keep track of balance changes and payment progress.
              This is useful for monthly statement updates.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.field}>
              <Text style={styles.label}>Debt Name *</Text>
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={setName}
                placeholder="e.g., Chase Freedom Card, Car Loan"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Debt Type *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeContainer}>
                {debtTypes.map((debtType) => (
                  <TouchableOpacity
                    key={debtType.value}
                    style={[
                      styles.typeButton,
                      type === debtType.value && styles.typeButtonSelected,
                    ]}
                    onPress={() => setType(debtType.value)}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        type === debtType.value && styles.typeButtonTextSelected,
                      ]}
                    >
                      {debtType.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Financial Details</Text>
            
            <View style={styles.field}>
              <Text style={styles.label}>Current Balance *</Text>
              <TextInput
                style={styles.textInput}
                value={balance}
                onChangeText={setBalance}
                placeholder="0.00"
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
              />
              <Text style={styles.fieldHint}>
                Previous: ${debt.balance.toFixed(2)}
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Minimum Payment *</Text>
              <TextInput
                style={styles.textInput}
                value={minimumPayment}
                onChangeText={setMinimumPayment}
                placeholder="0.00"
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
              />
              <Text style={styles.fieldHint}>
                Previous: ${debt.minimumPayment.toFixed(2)}
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Interest Rate (%) *</Text>
              <TextInput
                style={styles.textInput}
                value={interestRate}
                onChangeText={setInterestRate}
                placeholder="0.00"
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
              />
              <Text style={styles.fieldHint}>
                Previous: {debt.interestRate.toFixed(2)}%
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Information</Text>
            
            <View style={styles.field}>
              <Text style={styles.label}>Institution</Text>
              <TextInput
                style={styles.textInput}
                value={institution}
                onChangeText={setInstitution}
                placeholder="e.g., Chase, Wells Fargo"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Account Number (Last 4 digits)</Text>
              <TextInput
                style={styles.textInput}
                value={accountNumber}
                onChangeText={setAccountNumber}
                placeholder="****"
                placeholderTextColor="#9ca3af"
                maxLength={4}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Due Date (Day of Month)</Text>
              <TextInput
                style={styles.textInput}
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="15"
                placeholderTextColor="#9ca3af"
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
          </View>

          <View style={styles.dangerSection}>
            <Text style={styles.dangerSectionTitle}>Danger Zone</Text>
            <TouchableOpacity
              style={[styles.deleteButton, loading && styles.deleteButtonDisabled]}
              onPress={handleDelete}
              disabled={loading}
            >
              <Text style={styles.deleteButtonText}>🗑️ Delete Debt</Text>
            </TouchableOpacity>
            <Text style={styles.dangerText}>
              Deleting this debt will remove it and all associated statements permanently.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6b7280',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  infoBox: {
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    padding: 16,
    marginVertical: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: 'white',
  },
  fieldHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  typeContainer: {
    flexDirection: 'row',
  },
  typeButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  typeButtonSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  typeButtonTextSelected: {
    color: 'white',
  },
  dangerSection: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 20,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  dangerSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 16,
  },
  deleteButton: {
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  deleteButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  dangerText: {
    fontSize: 12,
    color: '#dc2626',
    textAlign: 'center',
    lineHeight: 16,
  },
});