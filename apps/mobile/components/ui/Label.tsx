import React from 'react';
import { Text, TextProps } from 'react-native';

interface LabelProps extends TextProps {
  children: React.ReactNode;
  required?: boolean;
  variant?: 'dark' | 'light';
}

export function Label({
  children,
  required,
  className,
  variant = 'light',
  ...props
}: Readonly<LabelProps>) {
  return (
    <Text
      className={`mb-2 text-sm font-medium text-gray-700 ${className || ''}`}
      {...props}>
      {children}
      {required && <Text className="text-brand"> *</Text>}
    </Text>
  );
}
