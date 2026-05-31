import React from 'react';
import { Modal, View, Text, Pressable, ViewProps, TextProps } from 'react-native';

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
        className="flex-1 items-center justify-center bg-black/60 px-6"
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
  return (
    <View
      className={`w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 ${className || ''}`}
      {...props}>
      {children}
    </View>
  );
}

export function DialogHeader({
  children,
  className,
  ...props
}: { children: React.ReactNode; className?: string } & ViewProps) {
  return (
    <View className={`mb-4 ${className || ''}`} {...props}>
      {children}
    </View>
  );
}

export function DialogTitle({
  children,
  className,
  ...props
}: { children: React.ReactNode; className?: string } & TextProps) {
  return (
    <Text className={`text-xl font-bold text-black ${className || ''}`} {...props}>
      {children}
    </Text>
  );
}

export function DialogDescription({
  children,
  className,
  ...props
}: { children: React.ReactNode; className?: string } & TextProps) {
  return (
    <Text className={`mt-2 text-sm text-gray-600 ${className || ''}`} {...props}>
      {children}
    </Text>
  );
}

export function DialogFooter({
  children,
  className,
  ...props
}: { children: React.ReactNode; className?: string } & ViewProps) {
  return (
    <View className={`mt-6 flex-row justify-end gap-3 ${className || ''}`} {...props}>
      {children}
    </View>
  );
}
