import React from 'react';
import { Pressable, View, Text, PressableProps } from 'react-native';

interface SwitchProps extends Omit<PressableProps, 'onPress'> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  disabled,
  className,
  ...props
}: SwitchProps) {
  return (
    <Pressable
      onPress={() => !disabled && onCheckedChange(!checked)}
      disabled={disabled}
      className={`flex-row items-center ${className || ''}`}
      {...props}>
      <View
        className={`h-8 w-14 flex-row items-center rounded-full p-1 transition-all duration-200 ${
          checked
            ? 'justify-end bg-brand shadow-lg shadow-brand/30'
            : 'justify-start border-2 border-gray-300 bg-gray-200'
        } ${disabled ? 'opacity-40' : ''}`}>
        <View
          className={`h-6 w-6 rounded-full transition-all duration-200 ${
            checked ? 'bg-white shadow-lg' : 'bg-gray-400 shadow-md'
          }`}
        />
      </View>
      {label && (
        <Text className={`ml-3 font-medium text-gray-700 ${disabled ? 'opacity-40' : ''}`}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
