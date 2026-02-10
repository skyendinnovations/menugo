import { Stack } from 'expo-router';

export default function MembersLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#000' },
        headerTintColor: '#fff',
      }}
    />
  );
}
