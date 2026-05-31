import React from 'react';
import { View, Text, ViewProps } from 'react-native';

interface BadgeProps extends ViewProps {
  variant?: 'default' | 'destructive' | 'outline' | 'success';
  children: React.ReactNode;
}

export function Badge({ variant = 'default', children, className, ...props }: BadgeProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'destructive':
        return 'bg-red-500/15 border-red-500/30';
      case 'success':
        return 'bg-emerald-500/15 border-emerald-500/30';
      case 'outline':
        return 'bg-transparent border-gray-400';
      default:
        return 'bg-brand/15 border-brand/30';
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'destructive':
        return 'text-red-600';
      case 'success':
        return 'text-emerald-600';
      case 'outline':
        return 'text-gray-600';
      default:
        return 'text-brand';
    }
  };

  return (
    <View
      className={`self-start rounded-full border px-3 py-1 ${getVariantStyles()} ${className || ''}`}
      {...props}>
      <Text className={`text-xs font-semibold ${getTextColor()}`}>{children}</Text>
    </View>
  );
}
