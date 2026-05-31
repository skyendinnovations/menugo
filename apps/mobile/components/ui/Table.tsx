import React from 'react';
import { View, Text, ScrollView, ScrollViewProps, ViewProps } from 'react-native';

interface TableProps extends ScrollViewProps {
  children: React.ReactNode;
}

export function Table({ children, className, ...props }: TableProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className={className} {...props}>
      <View className="overflow-hidden rounded-2xl border border-gray-200">{children}</View>
    </ScrollView>
  );
}

export function TableHeader({
  children,
  className,
  ...props
}: { children: React.ReactNode; className?: string } & ViewProps) {
  return (
    <View className={`bg-gray-50 ${className || ''}`} {...props}>
      {children}
    </View>
  );
}

export function TableBody({
  children,
  className,
  ...props
}: { children: React.ReactNode; className?: string } & ViewProps) {
  return (
    <View className={className} {...props}>
      {children}
    </View>
  );
}

export function TableRow({
  children,
  className,
  ...props
}: { children: React.ReactNode; className?: string } & ViewProps) {
  return (
    <View className={`flex-row border-b border-gray-100 ${className || ''}`} {...props}>
      {children}
    </View>
  );
}

export function TableHead({
  children,
  className,
  ...props
}: { children: React.ReactNode; className?: string } & ViewProps) {
  return (
    <View className={`min-w-32 px-4 py-3 ${className || ''}`} {...props}>
      <Text className="text-sm font-bold text-gray-700">{children}</Text>
    </View>
  );
}

export function TableCell({
  children,
  className,
  ...props
}: { children: React.ReactNode; className?: string } & ViewProps) {
  return (
    <View className={`min-w-32 px-4 py-3 ${className || ''}`} {...props}>
      <Text className="text-sm text-gray-600">{children}</Text>
    </View>
  );
}
