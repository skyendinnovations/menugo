import React from 'react';
import { TextInput, TextInputProps, View } from 'react-native';

interface InputProps extends TextInputProps {
    error?: boolean;
}

export function Input({ error, className, ...props }: InputProps) {
    return (
        <TextInput
            className={`bg-black border-2 rounded-lg px-4 py-3 text-white ${error ? 'border-red-600' : 'border-red-900'
                } ${className}`}
            placeholderTextColor="#6b7280"
            {...props}
        />
    );
}
