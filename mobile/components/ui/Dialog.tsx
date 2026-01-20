import React from 'react';
import { Modal, View, Text, Pressable, TouchableOpacity, ViewProps, TextProps } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => onOpenChange(false)}>
      <Pressable
        className="flex-1 items-center justify-center bg-black/70 p-4"
        onPress={() => onOpenChange(false)}>
        <Pressable onPress={(e) => e.stopPropagation()}>{children}</Pressable>
      </Pressable>
    </Modal>
  );
}

export function DialogContent({
  children,
  className,
  ...props
}: { children: React.ReactNode; className?: string } & ViewProps) {
  const combinedClassName = `bg-black border border-red-900 rounded-lg p-6 w-full max-w-md${className ? ` ${className}` : ''}`;
  return (
    <View className={combinedClassName} {...props}>
      {children}
    </View>
  );
}

export function DialogHeader({
  children,
  className,
  ...props
}: { children: React.ReactNode; className?: string } & ViewProps) {
  const combinedClassName = `mb-4${className ? ` ${className}` : ''}`;
  return (
    <View className={combinedClassName} {...props}>
      {children}
    </View>
  );
}

export function DialogTitle({
  children,
  className,
  ...props
}: { children: React.ReactNode; className?: string } & TextProps) {
  const combinedClassName = `text-white text-xl font-bold${className ? ` ${className}` : ''}`;
  return (
    <Text className={combinedClassName} {...props}>
      {children}
    </Text>
  );
}

export function DialogDescription({
  children,
  className,
  ...props
}: { children: React.ReactNode; className?: string } & TextProps) {
  const combinedClassName = `text-gray-400 text-sm mt-2${className ? ` ${className}` : ''}`;
  return (
    <Text className={combinedClassName} {...props}>
      {children}
    </Text>
  );
}

export function DialogFooter({
  children,
  className,
  ...props
}: { children: React.ReactNode; className?: string } & ViewProps) {
  const combinedClassName = `flex-row justify-end gap-2 mt-6${className ? ` ${className}` : ''}`;
  return (
    <View className={combinedClassName} {...props}>
      {children}
    </View>
  );
}
