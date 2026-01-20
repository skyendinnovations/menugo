import React from 'react';
import { View, Text, Image, ImageSourcePropType, ViewProps } from 'react-native';

interface AvatarProps extends ViewProps {
  source?: ImageSourcePropType;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Avatar({ source, fallback, size = 'md', className, ...props }: AvatarProps) {
  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'w-8 h-8';
      case 'md':
        return 'w-12 h-12';
      case 'lg':
        return 'w-16 h-16';
      case 'xl':
        return 'w-24 h-24';
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'sm':
        return 'text-xs';
      case 'md':
        return 'text-base';
      case 'lg':
        return 'text-xl';
      case 'xl':
        return 'text-3xl';
    }
  };

  return (
    <View
      className={`${getSizeClass()} items-center justify-center overflow-hidden rounded-full border-2 border-red-600 bg-red-900 ${className || ''}`}
      {...props}>
      {source ? (
        <Image source={source} className="h-full w-full" resizeMode="cover" />
      ) : (
        <Text className={`${getFontSize()} font-bold text-white`}>
          {fallback?.charAt(0).toUpperCase() || 'U'}
        </Text>
      )}
    </View>
  );
}
