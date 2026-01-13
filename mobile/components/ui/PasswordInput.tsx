import React, { useState } from 'react';
import { TextInputProps, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from './Input';

interface PasswordInputProps extends TextInputProps {
  error?: boolean;
}

export function PasswordInput({ error, className, ...props }: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View className="relative">
      <Input
        secureTextEntry={!showPassword}
        className={`rounded-lg border-2 bg-black px-4 py-3 pr-12 text-white ${
          error ? 'border-red-600' : 'border-red-900'
        } ${className || ''}`}
        placeholderTextColor="#6b7280"
        {...props}
      />

      <TouchableOpacity
        onPress={() => setShowPassword(!showPassword)}
        className="absolute right-4 top-1/2 -translate-y-1/2"
        accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
        accessibilityRole="button">
        <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color="gray" />
      </TouchableOpacity>
    </View>
  );
}
