import React from 'react';
import { View, Text, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
    children: React.ReactNode;
}

export function Card({ children, className, ...props }: CardProps) {
    return (
        <View
            className={`bg-black border border-red-900 rounded-lg overflow-hidden ${className}`}
            {...props}
        >
            {children}
        </View>
    );
}

export function CardHeader({ children, className, ...props }: CardProps) {
    return (
        <View className={`p-4 border-b border-red-900 ${className}`} {...props}>
            {children}
        </View>
    );
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <Text className={`text-white text-lg font-bold ${className}`}>
            {children}
        </Text>
    );
}

export function CardDescription({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <Text className={`text-gray-400 text-sm mt-1 ${className}`}>
            {children}
        </Text>
    );
}

export function CardContent({ children, className, ...props }: CardProps) {
    return (
        <View className={`p-4 ${className}`} {...props}>
            {children}
        </View>
    );
}

export function CardFooter({ children, className, ...props }: CardProps) {
    return (
        <View className={`p-4 border-t border-red-900 ${className}`} {...props}>
            {children}
        </View>
    );
}
