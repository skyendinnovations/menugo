import React from 'react';
import { TextInput, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  error?: boolean;
}

export function Input({ error, className, ...props }: InputProps) {
  return (
    <TextInput
      className={`bg-slate-800 border rounded-xl px-4 py-3.5 text-white text-base ${
        error ? 'border-red-500' : 'border-slate-700'
      } ${className || ''}`}
      placeholderTextColor="#64748B"
      {...props}
    />
  );
}
