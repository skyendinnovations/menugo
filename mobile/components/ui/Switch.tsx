import React from 'react';
import { Pressable, View, Text, PressableProps } from 'react-native';

interface SwitchProps extends Omit<PressableProps, 'onPress'> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Switch({ checked, onCheckedChange, label, disabled, className, ...props }: SwitchProps) {
  return (
    <Pressable
      onPress={() => !disabled && onCheckedChange(!checked)}
      disabled={disabled}
      className={`flex-row items-center ${className || ''}`}
      {...props}
    >
      <View
        className={`w-14 h-8 rounded-full p-1 flex-row items-center transition-all duration-200 ${
          checked ? 'bg-brand shadow-lg shadow-brand/30 justify-end' : 'bg-slate-700 border-2 border-slate-600 justify-start'
        } ${disabled ? 'opacity-40' : ''}`}
      >
        <View
          className={`w-6 h-6 rounded-full transition-all duration-200 ${
            checked ? 'bg-white shadow-lg' : 'bg-slate-400 shadow-md'
          }`}
        />
      </View>
      {label && (
        <Text className={`ml-3 text-slate-200 font-medium ${disabled ? 'opacity-40' : ''}`}>{label}</Text>
      )}
    </Pressable>
  );
}
