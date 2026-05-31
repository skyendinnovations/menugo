import React from 'react';
import { TextInput, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  error?: boolean;
  variant?: 'dark' | 'light';
}

export function Input({ error, className, variant = 'light', ...props }: InputProps) {
  const darkClasses = `rounded-xl border bg-slate-800 px-4 py-3.5 text-base text-white ${
    error ? 'border-red-500' : 'border-slate-700'
  }`;
  const lightClasses = `rounded-xl border bg-white px-4 py-3.5 text-base text-black ${
    error ? 'border-red-500' : 'border-gray-200'
  }`;

  return (
    <TextInput
      className={`${variant === 'light' ? lightClasses : darkClasses} ${className || ''}`}
      placeholderTextColor={variant === 'light' ? '#9CA3AF' : '#64748B'}
      {...props}
    />
  );
}
