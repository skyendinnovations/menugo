import { forwardRef } from 'react';
import { Text, TouchableOpacity, TouchableOpacityProps, View, ActivityIndicator } from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
} & TouchableOpacityProps;

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-brand',
  secondary: 'bg-slate-700',
  ghost: 'bg-transparent border border-slate-600',
  danger: 'bg-red-500',
  success: 'bg-emerald-500',
};

const sizeStyles: Record<ButtonSize, { container: string; text: string }> = {
  sm: { container: 'px-4 py-2 rounded-lg', text: 'text-sm' },
  md: { container: 'px-6 py-3.5 rounded-xl', text: 'text-base' },
  lg: { container: 'px-8 py-4 rounded-xl', text: 'text-lg' },
};

export const Button = forwardRef<View, ButtonProps>(
  ({ title, variant = 'primary', size = 'md', loading, icon, className, disabled, ...touchableProps }, ref) => {
    const sizeStyle = sizeStyles[size];

    return (
      <TouchableOpacity
        ref={ref}
        disabled={disabled || loading}
        activeOpacity={0.7}
        {...touchableProps}
        className={`items-center justify-center flex-row gap-2 ${sizeStyle.container} ${variantStyles[variant]} ${disabled || loading ? 'opacity-50' : ''} ${className || ''}`}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : icon ? (
          icon
        ) : null}
        <Text className={`text-white font-semibold text-center ${sizeStyle.text}`}>{title}</Text>
      </TouchableOpacity>
    );
  }
);

Button.displayName = 'Button';
