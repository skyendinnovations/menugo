import React from 'react';
import { View, Text, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <View
      className={`overflow-hidden rounded-lg border border-red-900 bg-black ${className || ''}`}
      {...props}>
      {children}
    </View>
  );
}

export function CardHeader({ children, className, ...props }: CardProps) {
  return (
    <View className={`border-b border-red-900 p-4 ${className || ''}`} {...props}>
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
    <Text className={`text-lg font-bold text-white ${className || ''}`} {...props}>
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
    <Text className={`mt-1 text-sm text-gray-400 ${className || ''}`} {...props}>
      {children}
    </Text>
  );
}

export function CardContent({ children, className, ...props }: CardProps) {
  return (
    <View className={`p-4 ${className || ''}`} {...props}>
      {children}
    </View>
  );
}

export function CardFooter({ children, className, ...props }: CardProps) {
  return (
    <View className={`border-t border-red-900 p-4 ${className || ''}`} {...props}>
      {children}
    </View>
  );
}
