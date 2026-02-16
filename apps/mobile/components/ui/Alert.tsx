import React from 'react';
import { View, Text, ViewProps } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface AlertProps extends ViewProps {
  variant?: 'default' | 'destructive' | 'success';
  title?: string;
  description?: string;
  icon?: boolean;
}

export function Alert({
  variant = 'default',
  title,
  description,
  icon = true,
  className,
  ...props
}: AlertProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'destructive':
        return 'bg-red-500/10 border-red-500/30';
      case 'success':
        return 'bg-emerald-500/10 border-emerald-500/30';
      default:
        return 'bg-slate-700/50 border-slate-600';
    }
  };

  const getIconName = () => {
    switch (variant) {
      case 'destructive':
        return 'error-outline';
      case 'success':
        return 'check-circle-outline';
      default:
        return 'info-outline';
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'destructive':
        return '#EF4444';
      case 'success':
        return '#10B981';
      default:
        return '#94A3B8';
    }
  };

  return (
    <View
      className={`flex-row rounded-xl border p-4 ${getVariantStyles()} ${className || ''}`}
      {...props}>
      {icon && (
        <MaterialIcons
          name={getIconName() as any}
          size={20}
          color={getIconColor()}
          style={{ marginRight: 12, marginTop: 2 }}
        />
      )}
      <View className="flex-1">
        {title && <Text className="mb-1 text-base font-semibold text-white">{title}</Text>}
        {description && <Text className="text-sm text-slate-300">{description}</Text>}
      </View>
    </View>
  );
}
