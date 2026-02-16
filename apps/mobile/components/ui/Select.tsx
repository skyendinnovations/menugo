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
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder = 'Select an option',
  disabled,
  className,
  ...props
}: SelectProps) {
  const [open, setOpen] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <>
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
        className={`flex-row items-center justify-between rounded-xl border border-slate-700 bg-slate-800 px-4 py-3.5 ${
          disabled ? 'opacity-50' : ''
        } ${className || ''}`}
        {...props}>
        <Text className={selectedOption ? 'text-base text-white' : 'text-base text-slate-500'}>
          {selectedOption?.label || placeholder}
        </Text>
        <MaterialIcons
          name={open ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={24}
          color="#94A3B8"
        />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/60 px-6"
          onPress={() => setOpen(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="max-h-96 w-full overflow-hidden rounded-2xl border border-slate-700 bg-slate-800">
            <ScrollView>
              {options.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                  className={`border-b border-slate-700/50 px-5 py-4 ${
                    option.value === value ? 'bg-brand/10' : ''
                  }`}>
                  <Text
                    className={`text-base ${option.value === value ? 'font-semibold text-brand' : 'text-white'}`}>
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
