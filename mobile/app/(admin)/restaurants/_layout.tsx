import { Stack } from 'expo-router';

export default function RestaurantsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="new"
        options={{
          title: 'Add Restaurant',
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Restaurant Details',
          headerShown: false,
        }}
      />
    </Stack>
  );
}
