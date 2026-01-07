import { Stack, Link, useRouter } from 'expo-router';

import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { ScreenContent } from '@/components/ScreenContent';
import { useAuth } from '@/lib/auth-context';

export default function Home() {
  const { signOut } = useAuth();
  const router = useRouter();
  return (
    <View className={styles.container}>
      <Stack.Screen options={{ title: 'Home' }} />
      <Container>
        <ScreenContent path="app/index.tsx" title="Home"></ScreenContent>
        <Link href={{ pathname: '/details', params: { name: 'Dan' } }} asChild>
          <Button title="Show Details" />
        </Link>
        <Button title='Admin' onPress={() => {
          router.push('/(admin)');
        }} />
        <Button title='UI Components Showcase' onPress={() => {
          router.push('/components-showcase');
        }} />
        <Button title='Sign Out' className='bg-red-600' onPress={() => { signOut(); }} />
      </Container>

    </View>
  );
}

const styles = {
  container: 'flex flex-1 bg-white',
};
