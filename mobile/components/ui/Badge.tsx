import React from 'react';
import { View, Text } from 'react-native';

interface BadgeProps {
    variant?: 'default' | 'destructive' | 'outline' | 'success';
    children: React.ReactNode;
}

export function Badge({ variant = 'default', children }: BadgeProps) {
    const getVariantStyles = () => {
        switch (variant) {
            case 'destructive':
                return 'bg-red-600 border-red-600';
            case 'success':
                return 'bg-green-600 border-green-600';
            case 'outline':
                return 'bg-transparent border-red-600';
            default:
                return 'bg-black border-red-900';
        }
    };

    const getTextColor = () => {
        return variant === 'outline' ? 'text-red-600' : 'text-white';
    };

    return (
        <View className={`border rounded-full px-3 py-1 self-start ${getVariantStyles()}`}>
            <Text className={`text-xs font-semibold ${getTextColor()}`}>
                {children}
            </Text>
        </View>
    );
}
