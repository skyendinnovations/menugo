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
      className={`min-h-24 rounded-xl border bg-slate-800 px-4 py-3.5 text-base text-white ${
        error ? 'border-red-500' : 'border-slate-700'
      } ${className || ''}`}
      placeholderTextColor="#64748B"
      {...props}
    />
  );
}
