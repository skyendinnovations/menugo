import React from 'react';
import { TextInput, TextInputProps } from 'react-native';

interface TextareaProps extends TextInputProps {
  error?: boolean;
}

export function Textarea({ error, className, ...props }: TextareaProps) {
  return (
    <TextInput
      multiline
      numberOfLines={4}
      textAlignVertical="top"
      className={`min-h-24 rounded-lg border-2 bg-black px-4 py-3 text-white ${
        error ? 'border-red-600' : 'border-red-900'
      } ${className || ''}`}
      placeholderTextColor="#6b7280"
      {...props}
    />
  );
}
