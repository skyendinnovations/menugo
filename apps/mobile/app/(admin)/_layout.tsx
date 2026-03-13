import { Tabs } from 'expo-router/tabs';
import { Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useMembershipStatus } from '@/lib/hooks/useMembershipStatus';

const RED = '#DC2626';
const GRAY_400 = '#9CA3AF';
const WHITE = '#FFFFFF';
const GRAY_200 = '#E5E7EB';

export default function AdminLayout() {
  const { isStaff } = useMembershipStatus();

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: WHITE,
          elevation: 0,
          borderBottomWidth: 1,
          borderBottomColor: GRAY_200,
          ...(Platform.OS === 'web' ? ({ boxShadow: 'none' } as any) : {}),
        },
        headerTintColor: '#111827',
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
        tabBarStyle: {
          backgroundColor: WHITE,
          borderTopColor: GRAY_200,
          borderTopWidth: 1,
          height: 65,
          paddingBottom: 8,
          paddingTop: 8,
          ...(Platform.OS === 'web'
            ? ({ boxShadow: '0 -1px 3px rgba(0,0,0,0.05)' } as any)
            : {}),
        },
        tabBarActiveTintColor: RED,
        tabBarInactiveTintColor: GRAY_400,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Restaurants',
          tabBarIcon: ({ color, size }) => <MaterialIcons name="store" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="accept-invitation"
        options={{
          title: 'Invitations',
          // Staff members can only work for one restaurant — hide invitations tab
          href: isStaff ? null : undefined,
          tabBarIcon: ({ color, size }) => <MaterialIcons name="mail" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="settings" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="restaurants" options={{ href: null }} />
      <Tabs.Screen name="onboarding" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
