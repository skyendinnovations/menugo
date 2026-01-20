import React from 'react';
import { View, Pressable, Text, ViewProps, PressableProps } from 'react-native';

interface RadioGroupProps extends ViewProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}

interface RadioGroupItemProps extends Omit<PressableProps, 'onPress'> {
  value: string;
  label?: string;
}

const RadioGroupContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
} | null>(null);

export function RadioGroup({
  value,
  onValueChange,
  children,
  className,
  ...props
}: RadioGroupProps) {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange }}>
      <View className={`gap-3 ${className || ''}`} {...props}>
        {children}
      </View>
    </RadioGroupContext.Provider>
  );
}

export function RadioGroupItem({ value, label, className, ...props }: RadioGroupItemProps) {
  const context = React.useContext(RadioGroupContext);

  if (!context) {
    throw new Error('RadioGroupItem must be used within RadioGroup');
  }

  const isSelected = context.value === value;

  return (
    <Pressable
      onPress={() => context.onValueChange(value)}
      className={`flex-row items-center ${className || ''}`}
      {...props}>
      <View
        className={`h-6 w-6 items-center justify-center rounded-full border-2 ${
          isSelected ? 'border-red-600' : 'border-gray-600'
        }`}>
        {isSelected && <View className="h-3 w-3 rounded-full bg-red-600" />}
      </View>
      {label && <Text className="ml-2 text-white">{label}</Text>}
    </Pressable>
  );
}
