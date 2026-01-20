import React from 'react';
import { View, ViewProps } from 'react-native';

interface SeparatorProps extends ViewProps {
  orientation?: 'horizontal' | 'vertical';
}

export function Separator({ orientation = 'horizontal', className, ...props }: SeparatorProps) {
  return (
    <View
      className={`bg-red-900 ${
        orientation === 'horizontal' ? 'my-4 h-px w-full' : 'mx-4 h-full w-px'
      }${className ? ` ${className}` : ''}`}
      {...props}
    />
  );
}
