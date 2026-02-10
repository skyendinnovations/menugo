import React from 'react';
import { Modal, View, Text, Pressable, ViewProps, TextProps } from 'react-native';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => onOpenChange(false)}>
      <Pressable
        className="flex-1 bg-black/60 justify-center items-center px-6"
        onPress={() => onOpenChange(false)}
      >
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
      className={`bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md ${className || ''}`}
      {...props}
    >
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
    <Text className={`text-white text-xl font-bold ${className || ''}`} {...props}>
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
    <Text className={`text-slate-400 text-sm mt-2 ${className || ''}`} {...props}>
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
    <View className={`flex-row justify-end gap-3 mt-6 ${className || ''}`} {...props}>
      {children}
    </View>
  );
}
