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
            className={`bg-black border-2 rounded-lg px-4 py-3 text-white min-h-24 ${error ? 'border-red-600' : 'border-red-900'
                } ${className}`}
            placeholderTextColor="#6b7280"
            {...props}
        />
    );
}
