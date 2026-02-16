import React from 'react';
import { TextInput, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  error?: boolean;
}

export function Input({ error, className, ...props }: InputProps) {
  return (
    <TextInput
      className={`rounded-xl border bg-slate-800 px-4 py-3.5 text-base text-white ${
        error ? 'border-red-500' : 'border-slate-700'
      } ${className || ''}`}
      placeholderTextColor="#64748B"
      {...props}
    />
  );
}
