import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const DEVICE_ID_KEY = 'menugo_device_id';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
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
