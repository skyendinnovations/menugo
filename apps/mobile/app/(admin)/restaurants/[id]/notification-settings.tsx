import { Redirect, useLocalSearchParams } from 'expo-router';
import { ROUTES } from '@/lib/routes';

/**
 * Redirect to the Roles & Flow page which now includes the notification flow editor.
 */
export default function NotificationSettingsRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <Redirect href={ROUTES.ADMIN.ROLES.list(id!) as any} />;
}
