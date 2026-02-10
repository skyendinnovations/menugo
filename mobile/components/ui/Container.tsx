import { SafeAreaView, ViewProps } from 'react-native';

interface ContainerProps extends ViewProps {
  children: React.ReactNode;
}

export const Container = ({ children, className, ...props }: ContainerProps) => {
  return (
    <SafeAreaView className={`flex flex-1 px-6 ${className || ''}`} {...props}>
      {children}
    </SafeAreaView>
  );
};
