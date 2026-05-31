import React, { useState } from 'react';
import { Text, Pressable, Modal, ScrollView, TouchableOpacity, PressableProps } from 'react-native';
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
  variant?: 'dark' | 'light';
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder = 'Select an option',
  disabled,
  variant = 'light',
  className,
  ...props
}: Readonly<SelectProps>) {
  const [open, setOpen] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);
  const selectedTextColor = 'text-black';
  const placeholderTextColor = 'text-gray-500';
  const optionTextColor = 'text-black';
  const selectedOptionTextColor = 'text-brand';

  return (
    <>
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
        className={`flex-row items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3.5 ${disabled ? 'opacity-50' : ''} ${className || ''}`}
        {...props}>
        <Text className={`text-base ${selectedOption ? selectedTextColor : placeholderTextColor}`}>
          {selectedOption?.label || placeholder}
        </Text>
        <MaterialIcons
          name={open ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={24}
          color="#6B7280"
        />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/60 px-6"
          onPress={() => setOpen(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="max-h-96 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <ScrollView>
              {options.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                  className={`border-b border-gray-200/80 px-5 py-4 ${option.value === value ? 'bg-brand/10' : ''}`}>
                  <Text className={`text-base ${option.value === value ? selectedOptionTextColor : optionTextColor}`}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
