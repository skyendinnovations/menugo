import React from 'react';
import { Pressable, View, Text, PressableProps } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface CheckboxProps extends Omit<PressableProps, 'onPress'> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Checkbox({
  checked,
  onCheckedChange,
  label,
  disabled,
  className,
  ...props
}: CheckboxProps) {
  return (
    <Pressable
      onPress={() => !disabled && onCheckedChange(!checked)}
      disabled={disabled}
      className={`flex-row items-center ${className || ''}`}
      {...props}>
      <View
        className={`h-6 w-6 items-center justify-center rounded border-2 ${
          checked ? 'border-red-600 bg-red-600' : 'border-gray-600 bg-transparent'
        } ${disabled ? 'opacity-50' : ''}`}>
        {checked && <MaterialIcons name="check" size={16} color="white" />}
      </View>
      {label && <Text className={`ml-2 text-white ${disabled ? 'opacity-50' : ''}`}>{label}</Text>}
    </Pressable>
  );
}
