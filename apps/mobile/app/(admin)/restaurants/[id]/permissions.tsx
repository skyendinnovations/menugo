import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { memberAPI, type Role } from "@/lib/api";
import { PERMISSION_KEYS } from "@menugo/dto";
import { Switch } from "@/components/ui/Switch";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { MaterialIcons } from "@expo/vector-icons";

const PERMISSION_LABELS: Record<string, string> = {
  manage_menu: "Manage Menu",
  manage_tables: "Manage Tables",
  manage_members: "Manage Members",
  manage_roles: "Manage Roles",
  view_orders: "View Orders",
  update_orders: "Update Orders",
  close_sessions: "Close Sessions",
  view_reports: "View Reports",
  manage_restaurant: "Manage Restaurant",
  manage_workflows: "Manage Workflows",
  manage_stock: "Manage Stock",
  modify_order: "Modify Orders",
  helper_block_table: "Block Tables",
  table_force_release: "Force Release Tables",
  view_audit_log: "View Audit Log",
  manage_notifications: "Manage Notifications",
  manage_availability: "Manage Availability",
  close_bill: "Close Bill",
};

export default function PermissionMatrixScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState<Record<number, Record<string, boolean>>>({});

  const restaurantId = Number(id);

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await memberAPI.getRoles(restaurantId);
      setRoles(res.data || []);
      setDirty({});
    } catch (error) {
      console.error("Failed to fetch roles:", error);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useFocusEffect(
    useCallback(() => {
      fetchRoles();
    }, [fetchRoles]),
  );

  const getPermissionValue = (role: Role, permKey: string): boolean => {
    // Check dirty (local changes) first
    if (dirty[role.id]?.[permKey] !== undefined) {
      return dirty[role.id]![permKey]!;
    }
    return role.permissions?.[permKey] === true;
  };

  const togglePermission = (role: Role, permKey: string) => {
    if (role.name.toLowerCase() === "owner") return;

    const current = getPermissionValue(role, permKey);
    setDirty((prev) => ({
      ...prev,
      [role.id]: {
        ...prev[role.id],
        [permKey]: !current,
      },
    }));
  };

  const handleSave = async () => {
    const changedRoleIds = Object.keys(dirty).map(Number);
    if (changedRoleIds.length === 0) {
      Alert.alert("Info", "No changes to save");
      return;
    }

    setSaving(true);
    try {
      for (const roleId of changedRoleIds) {
        const role = roles.find((r) => r.id === roleId);
        if (!role) continue;

        const merged: Record<string, boolean> = { ...(role.permissions || {}) };
        const changes = dirty[roleId];
        if (changes) {
          for (const [key, val] of Object.entries(changes)) {
            merged[key] = val;
          }
        }

        await memberAPI.updateRole(restaurantId, roleId, { permissions: merged });
      }

      Alert.alert("Success", "Permissions updated");
      fetchRoles();
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to save permissions");
    } finally {
      setSaving(false);
    }
  };

  const hasDirtyChanges = Object.keys(dirty).length > 0;

  // Exclude owner from editable columns, but show it as read-only
  const editableRoles = roles.filter((r) => r.name.toLowerCase() !== "owner");
  const ownerRole = roles.find((r) => r.name.toLowerCase() === "owner");

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Permission Matrix",
            headerStyle: { backgroundColor: "#0F172A" },
            headerTintColor: "#F8FAFC",
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
          title: "Permission Matrix",
          headerStyle: { backgroundColor: "#0F172A" },
          headerTintColor: "#F8FAFC",
          headerShadowVisible: false,
        }}
      />
      <View className="flex-1 bg-slate-900">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3">
          <Text className="text-lg font-bold text-white">Permissions</Text>
          {hasDirtyChanges && (
            <Button
              title={saving ? "Saving..." : "Save Changes"}
              size="sm"
              onPress={handleSave}
              disabled={saving}
            />
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            {/* Column headers: permission label + role names */}
            <View className="flex-row border-b border-slate-700 px-2 pb-3">
              <View className="w-40 justify-center pr-2">
                <Text className="text-xs font-bold uppercase text-slate-400">Permission</Text>
              </View>
              {ownerRole && (
                <View className="w-24 items-center">
                  <Badge variant="success">Owner</Badge>
                </View>
              )}
              {editableRoles.map((role) => (
                <View key={role.id} className="w-24 items-center">
                  <Text
                    className="text-sm font-semibold capitalize text-white"
                    numberOfLines={1}>
                    {role.name}
                  </Text>
                </View>
              ))}
            </View>

            {/* Permission rows */}
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
              {PERMISSION_KEYS.map((permKey) => (
                <View
                  key={permKey}
                  className="flex-row items-center border-b border-slate-800 px-2 py-3">
                  <View className="w-40 pr-2">
                    <Text className="text-sm text-slate-300">
                      {PERMISSION_LABELS[permKey] || permKey}
                    </Text>
                  </View>

                  {/* Owner column (read-only, always enabled) */}
                  {ownerRole && (
                    <View className="w-24 items-center">
                      <MaterialIcons name="check-circle" size={22} color="#22C55E" />
                    </View>
                  )}

                  {/* Editable role columns */}
                  {editableRoles.map((role) => {
                    const isEnabled = getPermissionValue(role, permKey);
                    const isDirty = dirty[role.id]?.[permKey] !== undefined;

                    return (
                      <View key={role.id} className="w-24 items-center">
                        <TouchableOpacity
                          onPress={() => togglePermission(role, permKey)}
                          activeOpacity={0.6}
                          className="items-center justify-center p-1">
                          <View
                            className="h-7 w-12 items-center justify-center rounded-full"
                            style={{
                              backgroundColor: isEnabled
                                ? isDirty
                                  ? "#F59E0B"
                                  : "#22C55E"
                                : "#334155",
                            }}>
                            <View
                              className="h-5 w-5 rounded-full"
                              style={{
                                backgroundColor: "#fff",
                                alignSelf: isEnabled ? "flex-end" : "flex-start",
                                marginHorizontal: 2,
                              }}
                            />
                          </View>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          </View>
        </ScrollView>

        {/* Legend */}
        <View className="flex-row items-center justify-center gap-6 border-t border-slate-700 px-4 py-3">
          <View className="flex-row items-center gap-1.5">
            <View className="h-3 w-3 rounded-full bg-green-500" />
            <Text className="text-xs text-slate-400">Enabled</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <View className="h-3 w-3 rounded-full bg-slate-600" />
            <Text className="text-xs text-slate-400">Disabled</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <View className="h-3 w-3 rounded-full bg-amber-500" />
            <Text className="text-xs text-slate-400">Unsaved</Text>
          </View>
        </View>
      </View>
    </>
  );
}
