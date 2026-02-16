import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'menugo_invitation_params';

export interface InvitationParams {
  token: string;
  email: string;
  action: 'sign-in' | 'sign-up';
}

export async function saveInvitationParams(params: InvitationParams): Promise<void> {
  const value = JSON.stringify(params);
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, value);
    }
    return;
  }
  await SecureStore.setItemAsync(STORAGE_KEY, value);
}

export async function getInvitationParams(): Promise<InvitationParams | null> {
  let value: string | null = null;
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.localStorage) {
      value = localStorage.getItem(STORAGE_KEY);
    }
  } else {
    value = await SecureStore.getItemAsync(STORAGE_KEY);
  }
  if (!value) return null;
  try {
    return JSON.parse(value) as InvitationParams;
  } catch {
    return null;
  }
}

export async function clearInvitationParams(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(STORAGE_KEY);
    }
    return;
  }
  await SecureStore.deleteItemAsync(STORAGE_KEY);
}
