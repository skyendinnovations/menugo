import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, TouchableOpacity, PressableProps } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export interface SelectOption {
    label: string;
    value: string;
}

interface SelectProps extends Omit<PressableProps, 'onPress'> {
    value?: string;
    onValueChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    disabled?: boolean;
}

export function Select({
    value,
    onValueChange,
    options,
    placeholder = 'Select an option',
    disabled,
    className,
    ...props
}: SelectProps) {
    const [open, setOpen] = useState(false);

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <>
            <Pressable
                onPress={() => !disabled && setOpen(true)}
                disabled={disabled}
                className={`bg-black border-2 border-red-900 rounded-lg px-4 py-3 flex-row justify-between items-center ${disabled ? 'opacity-50' : ''
                    } ${className || ''}`}
                {...props}
            >
                <Text className={selectedOption ? 'text-white' : 'text-gray-500'}>
                    {selectedOption?.label || placeholder}
                </Text>
                <MaterialIcons
                    name={open ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                    size={24}
                    color="#dc2626"
                />
            </Pressable>

            <Modal
                visible={open}
                transparent
                animationType="fade"
                onRequestClose={() => setOpen(false)}
            >
                <Pressable
                    className="flex-1 bg-black/70 justify-center items-center p-4"
                    onPress={() => setOpen(false)}
                >
                    <Pressable
                        onPress={(e) => e.stopPropagation()}
                        className="bg-black border border-red-900 rounded-lg w-full max-w-md max-h-96"
                    >
                        <ScrollView>
                            {options.map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    onPress={() => {
                                        onValueChange(option.value);
                                        setOpen(false);
                                    }}
                                    className={`p-4 border-b border-red-900/50 ${option.value === value ? 'bg-red-900/30' : ''
                                        }`}
                                >
                                    <Text className="text-white">{option.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>
        </>
    );
}
