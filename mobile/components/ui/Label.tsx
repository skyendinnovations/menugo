import React from 'react';
import { Text, TextProps } from 'react-native';

interface LabelProps extends TextProps {
    children: React.ReactNode;
    required?: boolean;
}

export function Label({ children, required, className, ...props }: LabelProps) {
    return (
        <Text className={`text-white text-sm font-semibold mb-2 ${className}`} {...props}>
            {children}
            {required && <Text className="text-red-600"> *</Text>}
        </Text>
    );
}
