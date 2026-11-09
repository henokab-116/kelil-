import React, { useRef, useEffect } from 'react';
import { Modal, View, Text } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Btn, Muted } from '../components/UI';
import { useI18n } from '../i18n';

// Full-screen camera. Calls onScan(text) once per opening, then the parent closes it.
export default function QrScannerModal({ visible, onClose, onScan }) {
  const { t } = useI18n();
  const [perm, requestPerm] = useCameraPermissions();
  const done = useRef(false);

  useEffect(() => { if (visible) done.current = false; }, [visible]);

  const handle = ({ data }) => {
    if (done.current || !data) return;
    done.current = true;
    onScan(String(data));
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {perm && perm.granted ? (
          <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={handle} />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <Text style={{ color: '#fff', textAlign: 'center', marginBottom: 16, fontSize: 16 }}>{t('cameraNeeded')}</Text>
            <Btn title={t('allowCamera')} onPress={requestPerm} />
          </View>
        )}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 20, backgroundColor: 'rgba(0,0,0,0.55)' }}>
          <Muted style={{ color: '#fff', textAlign: 'center', marginBottom: 12 }}>{t('pointCamera')}</Muted>
          <Btn title={t('close')} kind="ghost" onPress={onClose} style={{ backgroundColor: '#fff' }} />
        </View>
      </View>
    </Modal>
  );
}
