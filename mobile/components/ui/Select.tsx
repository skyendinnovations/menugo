import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  TouchableOpacity,
  PressableProps,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps extends Omit<PressableProps, 'onPress'> {
  value?: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  variant?: 'default' | 'underline';
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder = 'Select an option',
  disabled,
  className,
  variant = 'default',
  ...props
}: SelectProps) {
  const [open, setOpen] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  const isUnderline = variant === 'underline';

  return (
    <>
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
        className={
          isUnderline
            ? `flex-row items-center justify-between border-b-2 border-red-600 pb-1 ${disabled ? 'opacity-50' : ''} ${className || ''}`
            : `flex-row items-center justify-between rounded-lg border-2 border-red-900 bg-black px-4 py-3 ${disabled ? 'opacity-50' : ''} ${className || ''}`
        }
        {...props}>
        <Text
          className={`${selectedOption ? 'text-white' : 'text-gray-500'} ${isUnderline ? 'flex-1 text-base font-medium' : ''}`}>
          {selectedOption?.label || placeholder}
        </Text>
        <MaterialIcons
          name={open ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={isUnderline ? 20 : 24}
          color="#dc2626"
        />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/70 p-4"
          onPress={() => setOpen(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="max-h-96 w-full max-w-md rounded-lg border border-red-900 bg-black">
            <ScrollView>
              {options.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                  className={`border-b border-red-900/50 p-4 ${
                    option.value === value ? 'bg-red-900/30' : ''
                  }`}>
                  <Text className="text-white">{option.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
