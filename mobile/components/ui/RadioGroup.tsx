import React from 'react';
import { View, Pressable, Text } from 'react-native';

interface RadioGroupProps {
    value: string;
    onValueChange: (value: string) => void;
    children: React.ReactNode;
}

interface RadioGroupItemProps {
    value: string;
    label?: string;
}

const RadioGroupContext = React.createContext<{
    value: string;
    onValueChange: (value: string) => void;
} | null>(null);

export function RadioGroup({ value, onValueChange, children }: RadioGroupProps) {
    return (
        <RadioGroupContext.Provider value={{ value, onValueChange }}>
            <View className="gap-3">
                {children}
            </View>
        </RadioGroupContext.Provider>
    );
}

export function RadioGroupItem({ value, label }: RadioGroupItemProps) {
    const context = React.useContext(RadioGroupContext);

    if (!context) {
        throw new Error('RadioGroupItem must be used within RadioGroup');
    }

    const isSelected = context.value === value;

    return (
        <Pressable
            onPress={() => context.onValueChange(value)}
            className="flex-row items-center"
        >
            <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${isSelected ? 'border-red-600' : 'border-gray-600'
                }`}>
                {isSelected && (
                    <View className="w-3 h-3 rounded-full bg-red-600" />
                )}
            </View>
            {label && (
                <Text className="ml-2 text-white">{label}</Text>
            )}
        </Pressable>
    );
}
