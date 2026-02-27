import { Platform, Vibration } from 'react-native';

/**
 * Minimal haptic feedback helper.
 * Uses react-native Vibration API on native platforms, no-op on web.
 */

/** Light haptic tap — use for non-critical UI touches */
export function hapticLight() {
  if (Platform.OS !== 'web') {
    Vibration.vibrate(10);
  }
}

/** Medium haptic tap — use for confirmations and status changes */
export function hapticMedium() {
  if (Platform.OS !== 'web') {
    Vibration.vibrate(30);
  }
}

/** Heavy haptic tap — use for destructive or high-importance actions */
export function hapticHeavy() {
  if (Platform.OS !== 'web') {
    Vibration.vibrate(50);
  }
}

/** Success notification haptic — double pulse */
export function hapticSuccess() {
  if (Platform.OS !== 'web') {
    Vibration.vibrate([0, 30, 60, 30]);
  }
}

/** Error/warning notification haptic — strong single pulse */
export function hapticError() {
  if (Platform.OS !== 'web') {
    Vibration.vibrate(80);
  }
}
