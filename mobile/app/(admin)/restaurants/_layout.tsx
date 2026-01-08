import { Stack } from 'expo-router';

export default function RestaurantsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#000000',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'My Restaurants',
        }}
      />
      <Stack.Screen
        name="new_restaurant"
        options={{
          title: 'Add Restaurant',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
