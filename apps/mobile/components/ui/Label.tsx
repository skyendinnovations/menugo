import React from 'react';
import { Text, TextProps } from 'react-native';

interface LabelProps extends TextProps {
  children: React.ReactNode;
  required?: boolean;
}

export function Label({ children, required, className, ...props }: LabelProps) {
  return (
    <Text className={`mb-2 text-sm font-medium text-slate-300 ${className || ''}`} {...props}>
      {children}
      {required && <Text className="text-brand"> *</Text>}
    </Text>
  );
}
