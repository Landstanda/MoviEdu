import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const PIN_KEY = 'moviedu_parent_pin';

async function hashPin(pin: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `moviedu:${pin}`);
}

export async function hasParentPin(): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(PIN_KEY);
  return !!stored;
}

export async function setParentPin(pin: string): Promise<void> {
  const hashed = await hashPin(pin);
  await SecureStore.setItemAsync(PIN_KEY, hashed);
}

export async function verifyParentPin(pin: string): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(PIN_KEY);
  if (!stored) return false;
  const hashed = await hashPin(pin);
  return stored === hashed;
}
