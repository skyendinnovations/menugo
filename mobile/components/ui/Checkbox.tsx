import React from 'react';
import { Pressable, View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface CheckboxProps {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    label?: string;
    disabled?: boolean;
}

export function Checkbox({ checked, onCheckedChange, label, disabled }: CheckboxProps) {
    return (
        <Pressable
            onPress={() => !disabled && onCheckedChange(!checked)}
            disabled={disabled}
            className="flex-row items-center"
        >
            <View
                className={`w-6 h-6 rounded border-2 items-center justify-center ${checked
                        ? 'bg-red-600 border-red-600'
                        : 'bg-transparent border-gray-600'
                    } ${disabled ? 'opacity-50' : ''}`}
            >
                {checked && (
                    <MaterialIcons name="check" size={16} color="white" />
                )}
            </View>
            {label && (
                <Text className={`ml-2 text-white ${disabled ? 'opacity-50' : ''}`}>
                    {label}
                </Text>
            )}
        </Pressable>
    );
}
