import { Stack } from 'expo-router';

export default function MenuLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#000' },
        headerTintColor: '#fff',
      }}
    />
  );
}
