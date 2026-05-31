import { Stack } from 'expo-router';
import { AdminPageHeader } from '@/components/AdminPageHeader';

export default function RestaurantDetailLayout() {
  return (
    <Stack
      screenOptions={{
        header: (props) => <AdminPageHeader {...props} />,
        headerShown: true,
      }}
    />
  );
}
