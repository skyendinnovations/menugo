import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface AlertProps {
    variant?: 'default' | 'destructive' | 'success';
    title?: string;
    description?: string;
    icon?: boolean;
}

export function Alert({
    variant = 'default',
    title,
    description,
    icon = true
}: AlertProps) {
    const getVariantStyles = () => {
        switch (variant) {
            case 'destructive':
                return 'bg-red-900/20 border-red-600';
            case 'success':
                return 'bg-green-900/20 border-green-600';
            default:
                return 'bg-gray-900/20 border-gray-600';
        }
    };

    const getIconName = () => {
        switch (variant) {
            case 'destructive':
                return 'error-outline';
            case 'success':
                return 'check-circle-outline';
            default:
                return 'info-outline';
        }
    };

    const getIconColor = () => {
        switch (variant) {
            case 'destructive':
                return '#dc2626';
            case 'success':
                return '#16a34a';
            default:
                return '#9ca3af';
        }
    };

    return (
        <View className={`border rounded-lg p-4 flex-row ${getVariantStyles()}`}>
            {icon && (
                <MaterialIcons
                    name={getIconName() as any}
                    size={20}
                    color={getIconColor()}
                    style={{ marginRight: 12, marginTop: 2 }}
                />
            )}
            <View className="flex-1">
                {title && (
                    <Text className="text-white font-semibold text-base mb-1">
                        {title}
                    </Text>
                )}
                {description && (
                    <Text className="text-gray-300 text-sm">
                        {description}
                    </Text>
                )}
            </View>
        </View>
    );
}
