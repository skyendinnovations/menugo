import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';

interface TabsProps {
    defaultValue: string;
    children: React.ReactNode;
}

interface TabsListProps {
    children: React.ReactNode;
}

interface TabsTriggerProps {
    value: string;
    children: React.ReactNode;
}

interface TabsContentProps {
    value: string;
    children: React.ReactNode;
}

const TabsContext = React.createContext<{
    activeTab: string;
    setActiveTab: (value: string) => void;
} | null>(null);

export function Tabs({ defaultValue, children }: TabsProps) {
    const [activeTab, setActiveTab] = useState(defaultValue);

    return (
        <TabsContext.Provider value={{ activeTab, setActiveTab }}>
            <View>
                {children}
            </View>
        </TabsContext.Provider>
    );
}

export function TabsList({ children }: TabsListProps) {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="border-b border-red-900"
        >
            <View className="flex-row">
                {children}
            </View>
        </ScrollView>
    );
}

export function TabsTrigger({ value, children }: TabsTriggerProps) {
    const context = React.useContext(TabsContext);

    if (!context) {
        throw new Error('TabsTrigger must be used within Tabs');
    }

    const isActive = context.activeTab === value;

    return (
        <Pressable
            onPress={() => context.setActiveTab(value)}
            className={`px-6 py-3 border-b-2 ${isActive ? 'border-red-600' : 'border-transparent'
                }`}
        >
            <Text className={`font-semibold ${isActive ? 'text-red-600' : 'text-gray-400'}`}>
                {children}
            </Text>
        </Pressable>
    );
}

export function TabsContent({ value, children }: TabsContentProps) {
    const context = React.useContext(TabsContext);

    if (!context) {
        throw new Error('TabsContent must be used within Tabs');
    }

    if (context.activeTab !== value) {
        return null;
    }

    return (
        <View className="p-4">
            {children}
        </View>
    );
}
