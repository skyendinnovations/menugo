import React from 'react';
import { View, Text, ScrollView, ScrollViewProps, ViewProps, TextProps } from 'react-native';

interface TableProps extends ScrollViewProps {
  children: React.ReactNode;
}

export function Table({ children, className, ...props }: TableProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className={className} {...props}>
      <View className="overflow-hidden rounded-lg border border-red-900">{children}</View>
    </ScrollView>
  );
}

export function TableHeader({
  children,
  className,
  ...props
}: { children: React.ReactNode; className?: string } & ViewProps) {
  return (
    <View className={`bg-red-900/20 ${className || ''}`} {...props}>
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
    <View className={`flex-row border-b border-red-900/50 ${className || ''}`} {...props}>
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
      <Text className="text-sm font-bold text-white">{children}</Text>
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
      <Text className="text-sm text-gray-300">{children}</Text>
    </View>
  );
}
