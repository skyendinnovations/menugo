import { Stack } from 'expo-router';
import { Drawer } from 'expo-router/drawer';

export default function Layout() {
    return (
        <Drawer>
            <Drawer.Screen
                name="index"
                options={{
                    title: 'Admin Dashboard',
                }}
            />
            <Drawer.Screen
                name="settings"
                options={{
                    title: 'Settings',
                }}
            />
        </Drawer>
    );
}
