import React from 'react';
import { Pressable, View, Text, Animated, PressableProps, Platform } from 'react-native';

interface SwitchProps extends Omit<PressableProps, 'onPress'> {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    label?: string;
    disabled?: boolean;
}

export function Switch({ checked, onCheckedChange, label, disabled, className, ...props }: SwitchProps) {
    const translateX = React.useRef(new Animated.Value(checked ? 28 : 0)).current;

    React.useEffect(() => {
        Animated.timing(translateX, {
            toValue: checked ? 28 : 0,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [checked]);

    const handlePress = () => {
        if (!disabled) {
            onCheckedChange(!checked);
        }
    };

    return (
        <Pressable
            onPress={handlePress}
            disabled={disabled}
            className={`flex-row items-center ${className || ''}`}
            style={Platform.OS === 'web' ? { cursor: disabled ? 'not-allowed' : 'pointer' } : undefined}
            {...props}
        >
            <View
                className={`w-12 h-6 rounded-full ${checked ? 'bg-red-600' : 'bg-gray-700'
                    } ${disabled ? 'opacity-50' : ''}`}
                style={{
                    padding: 2,
                    justifyContent: 'center',
                }}
            >
                <Animated.View
                    style={{
                        width: 16,
                        height: 16,
                        borderRadius: 8,
                        backgroundColor: 'white',
                        transform: [{ translateX }],
                    }}
                />
            </View>
            {label && (
                <Text className={`ml-2 text-white ${disabled ? 'opacity-50' : ''}`}>
                    {label}
                </Text>
            )}
        </Pressable>
    );
}
