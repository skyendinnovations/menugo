import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, ViewProps, ScrollViewProps, PressableProps } from 'react-native';

interface TabsProps extends ViewProps {
    defaultValue: string;
    children: React.ReactNode;
}

interface TabsListProps extends ScrollViewProps {
    children: React.ReactNode;
}

interface TabsTriggerProps extends Omit<PressableProps, 'onPress'> {
    value: string;
    children: React.ReactNode;
}

interface TabsContentProps extends ViewProps {
    value: string;
    children: React.ReactNode;
}

const TabsContext = React.createContext<{
    activeTab: string;
    setActiveTab: (value: string) => void;
} | null>(null);

export function Tabs({ defaultValue, children, className, ...props }: TabsProps) {
    const [activeTab, setActiveTab] = useState(defaultValue);

    return (
        <TabsContext.Provider value={{ activeTab, setActiveTab }}>
            <View className={className} {...props}>
                {children}
            </View>
        </TabsContext.Provider>
    );
}

export function TabsList({ children, className, ...props }: TabsListProps) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className={`border-b border-red-900 ${className || ''}`}
            {...props}
        >
            <View className="flex-row">
                {children}
            </View>
        </ScrollView>
    );
}

export function TabsTrigger({ value, children, className, ...props }: TabsTriggerProps) {
    const context = React.useContext(TabsContext);

    if (!context) {
        throw new Error('TabsTrigger must be used within Tabs');
    }

    const isActive = context.activeTab === value;

    return (
        <Pressable
            onPress={() => context.setActiveTab(value)}
            className={`px-6 py-3 border-b-2 ${isActive ? 'border-red-600' : 'border-transparent'
                } ${className || ''}`}
            {...props}
        >
            <Text className={`font-semibold ${isActive ? 'text-red-600' : 'text-gray-400'}`}>
                {children}
            </Text>
        </Pressable>
    );
}

export function TabsContent({ value, children, className, ...props }: TabsContentProps) {
    const context = React.useContext(TabsContext);

    if (!context) {
        throw new Error('TabsContent must be used within Tabs');
    }

    if (context.activeTab !== value) {
        return null;
    }

    return (
        <View className={`p-4 ${className || ''}`} {...props}>
            {children}
        </View>
    );
}
