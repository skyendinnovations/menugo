import React from 'react';
import { View, Text, ScrollView, ScrollViewProps, ViewProps, TextProps } from 'react-native';

interface TableProps extends ScrollViewProps {
    children: React.ReactNode;
}

export function Table({ children, className, ...props }: TableProps) {
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className={className} {...props}>
            <View className="border border-red-900 rounded-lg overflow-hidden">
                {children}
            </View>
        </ScrollView>
    );
}

export function TableHeader({ children, className, ...props }: { children: React.ReactNode; className?: string } & ViewProps) {
    return (
        <View className={`bg-red-900/20 ${className || ''}`} {...props}>
            {children}
        </View>
    );
}

export function TableBody({ children, className, ...props }: { children: React.ReactNode; className?: string } & ViewProps) {
    return <View className={className} {...props}>{children}</View>;
}

export function TableRow({ children, className, ...props }: { children: React.ReactNode; className?: string } & ViewProps) {
    return (
        <View className={`flex-row border-b border-red-900/50 ${className || ''}`} {...props}>
            {children}
        </View>
    );
}

export function TableHead({ children, className, ...props }: { children: React.ReactNode; className?: string } & ViewProps) {
    return (
        <View className={`px-4 py-3 min-w-32 ${className || ''}`} {...props}>
            <Text className="text-white font-bold text-sm">
                {children}
            </Text>
        </View>
    );
}

export function TableCell({ children, className, ...props }: { children: React.ReactNode; className?: string } & ViewProps) {
    return (
        <View className={`px-4 py-3 min-w-32 ${className || ''}`} {...props}>
            <Text className="text-gray-300 text-sm">
                {children}
            </Text>
        </View>
    );
}
