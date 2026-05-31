import React from 'react';
import { View, Text, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <View className={`overflow-hidden rounded-2xl border border-gray-200 ${className || ''}`} {...props}>
      {children}
    </View>
  );
}

export function CardHeader({ children, className, ...props }: CardProps) {
  return (
    <View className={`px-5 pb-3 pt-5 ${className || ''}`} {...props}>
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
    <Text className={`text-lg font-bold text-black ${className || ''}`} {...props}>
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
    <Text className={`mt-1 text-sm text-gray-600 ${className || ''}`} {...props}>
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
    <View className={`border-t border-gray-200 px-5 py-4 ${className || ''}`} {...props}>
      {children}
    </View>
  );
}
