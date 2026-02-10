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
      className={`bg-slate-800 border rounded-xl px-4 py-3.5 text-white text-base min-h-24 ${
        error ? 'border-red-500' : 'border-slate-700'
      } ${className || ''}`}
      placeholderTextColor="#64748B"
      {...props}
    />
  );
}
