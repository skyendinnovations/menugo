import React from 'react';
import { View, Text, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <View
      className={`bg-slate-800 rounded-2xl overflow-hidden ${className || ''}`}
      {...props}
    >
      {children}
    </View>
  );
}

export function CardHeader({ children, className, ...props }: CardProps) {
  return (
    <View className={`px-5 pt-5 pb-3 ${className || ''}`} {...props}>
      {children}
    </View>
  );
}

export function CardTitle({
  children,
  className,
  ...props
}: { children: React.ReactNode; className?: string } & React.ComponentProps<typeof Text>) {
  return (
    <Text className={`text-white text-lg font-bold ${className || ''}`} {...props}>
      {children}
    </Text>
  );
}

export function CardDescription({
  children,
  className,
  ...props
}: { children: React.ReactNode; className?: string } & React.ComponentProps<typeof Text>) {
  return (
    <Text className={`text-slate-400 text-sm mt-1 ${className || ''}`} {...props}>
      {children}
    </Text>
  );
}

export function CardContent({ children, className, ...props }: CardProps) {
  return (
    <View className={`px-5 py-4 ${className || ''}`} {...props}>
      {children}
    </View>
  );
}

export function CardFooter({ children, className, ...props }: CardProps) {
  return (
    <View className={`px-5 py-4 border-t border-slate-700 ${className || ''}`} {...props}>
      {children}
    </View>
  );
}
