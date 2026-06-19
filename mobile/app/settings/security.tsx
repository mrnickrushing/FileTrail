import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useAppStore } from '@/store';
import { authenticate, getBiometricCapability } from '@/services/biometricService';
import {
  SettingsSubpageShell,
  SectionHeader,
  SettingsCard,
  ToggleField,
  Hint,
} from '@/components/settings/SettingsUi';

export default function SecuritySettingsScreen() {
  const biometricEnabled = useAppStore((s) => s.biometricEnabled);
  const setBiometricEnabled = useAppStore((s) => s.setBiometricEnabled);
  const [biometricLabel, setBiometricLabel] = useState('Biometric Lock');
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    getBiometricCapability().then((cap) => {
      setBiometricAvailable(cap.available);
      if (cap.available) setBiometricLabel(cap.label);
    });
  }, []);

  const handleToggleBiometric = async (value: boolean) => {
    if (value) {
      const success = await authenticate('Confirm to enable biometric lock');
      if (!success) {
        Alert.alert('Authentication Required', 'Could not verify biometric identity.');
        return;
      }
    }
    setBiometricEnabled(value);
  };

  return (
    <SettingsSubpageShell title="Security">
      <SectionHeader title="Vault Lock" icon="lock" />
      <SettingsCard>
        <ToggleField
          label={biometricLabel}
          sub={
            biometricAvailable
              ? biometricEnabled
                ? 'Vault locks when the app backgrounds'
                : 'Enable to require biometric unlock when you return'
              : 'Not available on this device'
          }
          value={biometricEnabled}
          onValueChange={handleToggleBiometric}
          disabled={!biometricAvailable}
          help="When enabled, FileTrail locks itself every time it goes to the background and asks for Face ID, Touch ID, or your device passcode before showing your documents again."
        />
      </SettingsCard>
      <Hint>
        This only protects the local vault on this device. It does not change your account sign-in.
      </Hint>
    </SettingsSubpageShell>
  );
}
