import NfcManager, { NfcTech } from 'react-native-nfc-manager';

let started = false;

// 'ok' | 'no-hardware' | 'off'
export async function nfcStatus() {
  try {
    if (!(await NfcManager.isSupported())) return 'no-hardware';
    if (!started) { await NfcManager.start(); started = true; }
    return (await NfcManager.isEnabled()) ? 'ok' : 'off';
  } catch {
    return 'no-hardware';
  }
}

// Reads ONE tag and resolves to its hardware serial number as a hex string (same value the web app's Web NFC gave,
// and the server ignores ':' and letter case). Resolves to null if cancelled. Rejects if the tag can't be read.
export async function readTagSerial() {
  try {
    await NfcManager.requestTechnology([NfcTech.NfcA, NfcTech.Ndef, NfcTech.IsoDep, NfcTech.NfcB, NfcTech.NfcF, NfcTech.NfcV], {
      alertMessage: 'Hold the card against the back of the phone'
    });
    const tag = await NfcManager.getTag();
    return tag && tag.id ? String(tag.id) : null;
  } finally {
    NfcManager.cancelTechnologyRequest().catch(() => {});
  }
}

export const cancelNfc = () => NfcManager.cancelTechnologyRequest().catch(() => {});
