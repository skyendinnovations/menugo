import { SafeAreaView, ViewProps } from 'react-native';

interface ContainerProps extends ViewProps {
  children: React.ReactNode;
}

export const Container = ({ children, className, ...props }: ContainerProps) => {
  return <SafeAreaView className={`${styles.container} ${className || ''}`} {...props}>{children}</SafeAreaView>;
};

const styles = {
  container: 'flex flex-1 m-6',
};
