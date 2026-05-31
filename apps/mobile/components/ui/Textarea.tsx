import React from 'react';
import { TextInput, type TextInputProps } from 'react-native';

interface TextareaProps extends Omit<TextInputProps, 'placeholderTextColor' | 'className' | 'multiline'> {
  error?: boolean;
  variant?: 'dark' | 'light';
  className?: string;
}

export function Textarea({ error, className, variant = 'light', ...props }: Readonly<TextareaProps>) {
  const darkClasses = `min-h-24 rounded-xl border bg-slate-800 px-4 py-3.5 text-base text-white ${
    error ? 'border-red-500' : 'border-slate-700'
  }`;
  const lightClasses = `min-h-24 rounded-xl border bg-white px-4 py-3.5 text-base text-black ${
    error ? 'border-red-500' : 'border-gray-200'
  }`;

  return (
    <TextInput
      multiline
      numberOfLines={4}
      textAlignVertical="top"
      className={`${variant === 'light' ? lightClasses : darkClasses} ${className || ''}`}
      placeholderTextColor={variant === 'light' ? '#9CA3AF' : '#64748B'}
      {...props}
    />
  );
}
