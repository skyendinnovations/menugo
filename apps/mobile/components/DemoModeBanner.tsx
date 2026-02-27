import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface DemoModeBannerProps {
  /** If false/undefined, the banner is hidden */
  visible?: boolean;
}

/**
 * Prominent "TRAINING MODE" banner displayed at the top of staff screens
 * when the restaurant is in demo mode.
 */
export function DemoModeBanner({ visible }: DemoModeBannerProps) {
  if (!visible) return null;

  return (
    <View className="flex-row items-center justify-center gap-2 bg-amber-500 px-4 py-2">
      <MaterialIcons name="school" size={16} color="#0F172A" />
      <Text className="text-sm font-bold text-slate-900">TRAINING MODE</Text>
      <Text className="text-xs text-slate-800">
        Notifications suppressed · Data can be reset
      </Text>
    </View>
  );
}
