import { Drawer } from 'expo-router/drawer';

export default function AdminLayout() {
  return (
    <Drawer
      screenOptions={{
        headerStyle: { backgroundColor: '#000' },
        headerTintColor: '#fff',
        drawerStyle: { backgroundColor: '#111' },
        drawerActiveTintColor: '#dc2626',
        drawerInactiveTintColor: '#9ca3af',
      }}
    >
      <Drawer.Screen
        name="index"
        options={{ title: 'My Restaurants' }}
      />
      <Drawer.Screen
        name="restaurants"
        options={{ title: 'Restaurants', drawerItemStyle: { display: 'none' } }}
      />
      <Drawer.Screen
        name="onboarding"
        options={{ title: 'Get Started', drawerItemStyle: { display: 'none' } }}
      />
      <Drawer.Screen
        name="accept-invitation"
        options={{ title: 'Accept Invitation' }}
      />
      <Drawer.Screen
        name="settings"
        options={{ title: 'Settings' }}
      />
    </Drawer>
  );
}
