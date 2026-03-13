import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface ErrorBannerProps {
  /** The error message to display. */
  message: string;
  /**
   * Optional retry callback. When provided, a "Retry" button is rendered
   * that the user can tap to re-trigger the failed operation.
   */
  onRetry?: () => void;
  /** Called when the user taps the × icon to dismiss the banner. */
  onDismiss: () => void;
}

/**
 * Dismissible inline error banner (Part 7.1).
 *
 * Renders below a section header, above the section content.
 * Never a modal — does not block interaction with the rest of the screen.
 *
 * Usage:
 *   <ErrorBanner message="Failed to load orders" onRetry={refresh} onDismiss={clearError} />
 *   <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} />
 */
export function ErrorBanner({ message, onRetry, onDismiss }: ErrorBannerProps) {
  return (
    <View className="mx-4 mb-2 flex-row items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
      <View className="mr-2 flex-1 flex-row items-center gap-2">
        <MaterialIcons name="error-outline" size={16} color="#EF4444" />
        <Text className="flex-1 text-sm text-red-400">{message}</Text>
      </View>
      <View className="flex-row items-center gap-2">
        {onRetry && (
          <TouchableOpacity
            onPress={onRetry}
            activeOpacity={0.7}
            className="rounded-lg bg-red-500/20 px-3 py-1.5">
            <Text className="text-xs font-bold text-red-400">Retry</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onDismiss} activeOpacity={0.7}>
          <MaterialIcons name="close" size={16} color="#94A3B8" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
