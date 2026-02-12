import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const DEVICE_ID_KEY = 'menugo_device_id';
const CUSTOMER_NAME_KEY = 'menugo_customer_name';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getCustomerName(): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(CUSTOMER_NAME_KEY);
    }
    return null;
  }

  // Native platforms
  return await SecureStore.getItemAsync(CUSTOMER_NAME_KEY);
}

export async function setCustomerName(name: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(CUSTOMER_NAME_KEY, name);
    }
    return;
  }

  // Native platforms
  await SecureStore.setItemAsync(CUSTOMER_NAME_KEY, name);
}

export async function getDeviceId(): Promise<string> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.localStorage) {
      let id = localStorage.getItem(DEVICE_ID_KEY);
      if (!id) {
        id = generateUUID();
        localStorage.setItem(DEVICE_ID_KEY, id);
      }
      return id;
    }
    return generateUUID();
  }

  // Native platforms
  let id = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (!id) {
    id = generateUUID();
    await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
  }
  return id;
}
