import React from 'react';
import { View, Text, ScrollView } from 'react-native';

interface TableProps {
    children: React.ReactNode;
}

export function Table({ children }: TableProps) {
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="border border-red-900 rounded-lg overflow-hidden">
                {children}
            </View>
        </ScrollView>
    );
}

export function TableHeader({ children }: TableProps) {
    return (
        <View className="bg-red-900/20">
            {children}
        </View>
    );
}

export function TableBody({ children }: TableProps) {
    return <View>{children}</View>;
}

export function TableRow({ children }: TableProps) {
    return (
        <View className="flex-row border-b border-red-900/50">
            {children}
        </View>
    );
}

export function TableHead({ children }: { children: React.ReactNode }) {
    return (
        <View className="px-4 py-3 min-w-32">
            <Text className="text-white font-bold text-sm">
                {children}
            </Text>
        </View>
    );
}

export function TableCell({ children }: { children: React.ReactNode }) {
    return (
        <View className="px-4 py-3 min-w-32">
            <Text className="text-gray-300 text-sm">
                {children}
            </Text>
        </View>
    );
}
