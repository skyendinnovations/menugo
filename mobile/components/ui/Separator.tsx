import React from 'react';
import { View, ViewProps } from 'react-native';

interface SeparatorProps extends ViewProps {
    orientation?: 'horizontal' | 'vertical';
}

export function Separator({ orientation = 'horizontal', className, ...props }: SeparatorProps) {
    return (
        <View
            className={`bg-red-900 ${orientation === 'horizontal' ? 'h-px w-full my-4' : 'w-px h-full mx-4'
                } ${className}`}
            {...props}
        />
    );
}
