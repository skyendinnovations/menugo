import React from 'react';
import { View, Text, ScrollView, ScrollViewProps, ViewProps } from 'react-native';

interface TableProps extends ScrollViewProps {
  children: React.ReactNode;
}

export function Table({ children, className, ...props }: TableProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className={className} {...props}>
      <View className="border border-slate-700 rounded-2xl overflow-hidden">{children}</View>
    </ScrollView>
  );
}

export function TableHeader({
  children,
  className,
  ...props
}: { children: React.ReactNode; className?: string } & ViewProps) {
  return (
    <View className={`bg-slate-800 ${className || ''}`} {...props}>
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
    <View className={`flex-row border-b border-slate-700/50 ${className || ''}`} {...props}>
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
    <View className={`px-4 py-3 min-w-32 ${className || ''}`} {...props}>
      <Text className="text-slate-300 font-bold text-sm">{children}</Text>
    </View>
  );
}

export function TableCell({
  children,
  className,
  ...props
}: { children: React.ReactNode; className?: string } & ViewProps) {
  return (
    <View className={`px-4 py-3 min-w-32 ${className || ''}`} {...props}>
      <Text className="text-slate-300 text-sm">{children}</Text>
    </View>
  );
}
