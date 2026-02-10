import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, TouchableOpacity, PressableProps } from 'react-native';
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
        className={`bg-slate-800 border border-slate-700 rounded-xl px-4 py-3.5 flex-row justify-between items-center ${
          disabled ? 'opacity-50' : ''
        } ${className || ''}`}
        {...props}
      >
        <Text className={selectedOption ? 'text-white text-base' : 'text-slate-500 text-base'}>
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
          className="flex-1 bg-black/60 justify-center items-center px-6"
          onPress={() => setOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-h-96 overflow-hidden"
          >
            <ScrollView>
              {options.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                  className={`px-5 py-4 border-b border-slate-700/50 ${
                    option.value === value ? 'bg-brand/10' : ''
                  }`}
                >
                  <Text
                    className={`text-base ${option.value === value ? 'text-brand font-semibold' : 'text-white'}`}
                  >
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
