import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import { workflowAPI } from '@/lib/api';
import type { WorkflowTransition } from '@menugo/dto';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/Switch';
import { Button } from '@/components/ui/Button';
import { MaterialIcons } from '@expo/vector-icons';
import { DemoModeBanner } from '@/components/DemoModeBanner';
import { useDemoMode } from '@/lib/hooks/useDemoMode';

/** Friendly labels for internal order state names */
const STATE_LABELS: Record<string, string> = {
  received: 'Received',
  preparing: 'Preparing',
  ready: 'Ready',
  served: 'Served',
  paid: 'Paid',
  cancelled: 'Cancelled',
  voided: 'Voided',
};

/** Friendly labels for permission keys */
const PERMISSION_LABELS: Record<string, string> = {
  view_orders: 'View Orders',
  update_orders: 'Update Orders',
  order_prepare: 'Prepare Orders',
  order_deliver: 'Deliver Orders',
  modify_order: 'Modify Order',
  manage_tables: 'Manage Tables',
  manage_menu: 'Manage Menu',
  manage_stock: 'Manage Stock',
  manage_members: 'Manage Members',
  manage_roles: 'Manage Roles',
  close_sessions: 'Close Sessions',
  manage_restaurant: 'Manage Restaurant',
  view_reports: 'View Reports',
  view_audit_log: 'View Audit Log',
  manage_workflows: 'Manage Workflows',
  resend_notification: 'Resend Notification',
  table_force_release: 'Force Release Table',
  helper_block_table: 'Block Table',
};

function stateLabel(state: string) {
  return STATE_LABELS[state] || state.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function permissionLabel(perm: string | null) {
  if (!perm) return 'None';
  return PERMISSION_LABELS[perm] || perm.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function WorkflowsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const restaurantId = Number(id);
  const { isDemoMode } = useDemoMode(restaurantId);

  const [transitions, setTransitions] = useState<WorkflowTransition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const fetchWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      const res = await workflowAPI.getWorkflows(restaurantId);
      setTransitions(
        (res.data || []).sort((a, b) => a.displayOrder - b.displayOrder)
      );
      setDirty(false);
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const handleToggle = (transitionId: number, isActive: boolean) => {
    setTransitions((prev) =>
      prev.map((t) => (t.id === transitionId ? { ...t, isActive } : t))
    );
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = transitions.map((t) => ({
        fromState: t.fromState,
        toState: t.toState,
        requiredPermission: t.requiredPermission,
        displayOrder: t.displayOrder,
        isActive: t.isActive,
      }));
      await workflowAPI.updateWorkflows(restaurantId, payload);
      setDirty(false);
      Alert.alert('Success', 'Workflow transitions updated.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save workflows');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Workflows',
            headerStyle: { backgroundColor: '#0F172A' },
            headerTintColor: '#F8FAFC',
            headerShadowVisible: false,
          }}
        />
        <View className="flex-1 items-center justify-center bg-slate-900">
          <ActivityIndicator size="large" color="#F97316" />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Workflows',
          headerStyle: { backgroundColor: '#0F172A' },
          headerTintColor: '#F8FAFC',
          headerShadowVisible: false,
        }}
      />
      <View className="flex-1 bg-slate-900">
        <DemoModeBanner visible={isDemoMode} />

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          {/* Header */}
          <View className="mb-2 flex-row items-center gap-2">
            <MaterialIcons name="account-tree" size={22} color="#3B82F6" />
            <Text className="text-xl font-bold text-white">Order Transitions</Text>
          </View>
          <Text className="mb-5 text-sm text-slate-400">
            Toggle transitions on or off to control how orders move through states.
          </Text>

          {transitions.length === 0 && (
            <View className="items-center py-16">
              <MaterialIcons name="rule" size={48} color="#64748B" />
              <Text className="mt-4 text-slate-500">
                No workflow transitions configured.
              </Text>
            </View>
          )}

          {transitions.map((t) => (
            <Card key={t.id} className="mb-3">
              <CardContent>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    {/* From → To */}
                    <View className="flex-row items-center gap-2">
                      <Badge variant={t.isActive ? 'default' : 'outline'}>
                        {stateLabel(t.fromState)}
                      </Badge>
                      <MaterialIcons name="arrow-forward" size={16} color="#64748B" />
                      <Badge variant={t.isActive ? 'default' : 'outline'}>
                        {stateLabel(t.toState)}
                      </Badge>
                    </View>
                    {/* Required permission */}
                    <Text className="mt-2 text-xs text-slate-500">
                      Permission: {permissionLabel(t.requiredPermission)}
                    </Text>
                  </View>

                  <Switch
                    checked={t.isActive}
                    onCheckedChange={(checked) => handleToggle(t.id, checked)}
                  />
                </View>
              </CardContent>
            </Card>
          ))}

          {transitions.length > 0 && (
            <Button
              title={saving ? 'Saving…' : 'Save Changes'}
              onPress={handleSave}
              disabled={!dirty || saving}
              loading={saving}
              size="lg"
              className="mt-4"
            />
          )}
        </ScrollView>
      </View>
    </>
  );
}
