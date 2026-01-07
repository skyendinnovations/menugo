import React from 'react';
import { Modal, View, Text, Pressable, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface DialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
    return (
        <Modal
            visible={open}
            transparent
            animationType="fade"
            onRequestClose={() => onOpenChange(false)}
        >
            <Pressable
                className="flex-1 bg-black/70 justify-center items-center p-4"
                onPress={() => onOpenChange(false)}
            >
                <Pressable onPress={(e) => e.stopPropagation()}>
                    {children}
                </Pressable>
            </Pressable>
        </Modal>
    );
}

export function DialogContent({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <View className={`bg-black border border-red-900 rounded-lg p-6 w-full max-w-md ${className}`}>
            {children}
        </View>
    );
}

export function DialogHeader({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <View className={`mb-4 ${className}`}>
            {children}
        </View>
    );
}

export function DialogTitle({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <Text className={`text-white text-xl font-bold ${className}`}>
            {children}
        </Text>
    );
}

export function DialogDescription({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <Text className={`text-gray-400 text-sm mt-2 ${className}`}>
            {children}
        </Text>
    );
}

export function DialogFooter({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <View className={`flex-row justify-end gap-2 mt-6 ${className}`}>
            {children}
        </View>
    );
}
