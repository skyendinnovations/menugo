import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useState, useCallback, useEffect } from "react";
import { auditAPI } from "@/lib/api/audit";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { MaterialIcons } from "@expo/vector-icons";

const ACTION_LABELS: Record<string, string> = {
  role_created: "Role Created",
  role_updated: "Role Updated",
  role_deleted: "Role Deleted",
  permission_changed: "Permission Changed",
  member_invited: "Member Invited",
  member_removed: "Member Removed",
  order_status_changed: "Order Status Changed",
  order_voided: "Order Voided",
  order_claimed: "Order Claimed",
  notification_resent: "Notification Resent",
  session_closed: "Session Closed",
  session_force_closed: "Session Force Closed",
  table_blocked: "Table Blocked",
  table_unblocked: "Table Unblocked",
  table_force_released: "Table Force Released",
  menu_availability_changed: "Menu Availability Changed",
  stock_updated: "Stock Updated",
  workflow_changed: "Workflow Changed",
  override: "Override",
  restaurant_suspended: "Restaurant Suspended",
  restaurant_activated: "Restaurant Activated",
  user_banned: "User Banned",
  user_unbanned: "User Unbanned",
};

const ENTITY_LABELS: Record<string, string> = {
  role: "Role",
  member: "Member",
  invitation: "Invitation",
  order: "Order",
  session: "Session",
  table: "Table",
  menu_item: "Menu Item",
  menu_variant: "Menu Variant",
  restaurant: "Restaurant",
  workflow: "Workflow",
  user: "User",
};

const ACTION_COLORS: Record<string, string> = {
  role_created: "#22C55E",
  role_deleted: "#EF4444",
  member_removed: "#EF4444",
  order_voided: "#EF4444",
  table_force_released: "#F59E0B",
  session_force_closed: "#F59E0B",
  override: "#F59E0B",
  restaurant_suspended: "#EF4444",
  user_banned: "#EF4444",
};

const ACTION_FILTER_OPTIONS = [
  { label: "All Actions", value: "" },
  { label: "Order Status Changed", value: "order_status_changed" },
  { label: "Order Voided", value: "order_voided" },
  { label: "Order Claimed", value: "order_claimed" },
  { label: "Session Closed", value: "session_closed" },
  { label: "Session Force Closed", value: "session_force_closed" },
  { label: "Role Created", value: "role_created" },
  { label: "Role Updated", value: "role_updated" },
  { label: "Role Deleted", value: "role_deleted" },
  { label: "Permission Changed", value: "permission_changed" },
  { label: "Member Invited", value: "member_invited" },
  { label: "Member Removed", value: "member_removed" },
  { label: "Table Blocked", value: "table_blocked" },
  { label: "Table Unblocked", value: "table_unblocked" },
  { label: "Table Force Released", value: "table_force_released" },
  { label: "Stock Updated", value: "stock_updated" },
  { label: "Workflow Changed", value: "workflow_changed" },
  { label: "Override", value: "override" },
];

const ENTITY_FILTER_OPTIONS = [
  { label: "All Entities", value: "" },
  { label: "Order", value: "order" },
  { label: "Session", value: "session" },
  { label: "Role", value: "role" },
  { label: "Member", value: "member" },
  { label: "Table", value: "table" },
  { label: "Menu Item", value: "menu_item" },
  { label: "Workflow", value: "workflow" },
  { label: "Restaurant", value: "restaurant" },
];

interface AuditEntry {
  id: number;
  restaurantId: number;
  actorUserId: string | null;
  actorName?: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue: any;
  newValue: any;
  reason: string | null;
  createdAt: string;
}

export default function AuditLogViewer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const restaurantId = Number(id);

  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Detail view
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const filters: Record<string, any> = { page, limit: 30 };
      if (actionFilter) filters.action = actionFilter;
      if (entityFilter) filters.entityType = entityFilter;

      const res = await auditAPI.getLogs(restaurantId, filters);
      setLogs(res.data || []);
      if (res.pagination) {
        setTotalPages(res.pagination.totalPages);
      }
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
    } finally {
      setLoading(false);
    }
  }, [restaurantId, page, actionFilter, entityFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const applyFilter = (type: "action" | "entity", value: string) => {
    if (type === "action") setActionFilter(value);
    else setEntityFilter(value);
    setPage(1);
    setShowFilters(false);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderDiff = (label: string, value: any) => {
    if (value === null || value === undefined) return null;
    const display = typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
    return (
      <View className="mt-2">
        <Text className="text-xs font-bold text-slate-400">{label}</Text>
        <View className="mt-1 rounded-lg bg-slate-800 p-3">
          <Text className="font-mono text-xs text-slate-300">{display}</Text>
        </View>
      </View>
    );
  };

  const renderLogEntry = ({ item }: { item: AuditEntry }) => {
    const actionColor = ACTION_COLORS[item.action] || "#94A3B8";

    return (
      <TouchableOpacity
        onPress={() => setSelectedEntry(item)}
        activeOpacity={0.7}>
        <Card className="mb-2">
          <CardContent className="py-3">
            <View className="flex-row items-start justify-between">
              <View className="mr-3 flex-1">
                <View className="flex-row items-center gap-2">
                  <View
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: actionColor }}
                  />
                  <Text className="text-sm font-semibold text-white">
                    {ACTION_LABELS[item.action] || item.action}
                  </Text>
                </View>

                <View className="mt-1.5 flex-row items-center gap-2">
                  <Badge variant="outline">
                    {ENTITY_LABELS[item.entityType] || item.entityType}
                  </Badge>
                  <Text className="text-xs text-slate-500">#{item.entityId}</Text>
                </View>

                {item.reason && (
                  <Text className="mt-1.5 text-xs italic text-amber-400">
                    Reason: {item.reason}
                  </Text>
                )}
              </View>

              <View className="items-end">
                <Text className="text-xs text-slate-500">{formatDate(item.createdAt)}</Text>
                <MaterialIcons
                  name="chevron-right"
                  size={16}
                  color="#64748B"
                  style={{ marginTop: 4 }}
                />
              </View>
            </View>
          </CardContent>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Audit Logs",
          headerStyle: { backgroundColor: "#0F172A" },
          headerTintColor: "#F8FAFC",
          headerShadowVisible: false,
        }}
      />
      <View className="flex-1 bg-slate-900">
        {/* Header with filters */}
        <View className="flex-row items-center justify-between px-4 py-3">
          <Text className="text-xl font-bold text-white">Audit Log</Text>
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => setShowFilters(true)}
              className="h-10 w-10 items-center justify-center rounded-xl bg-slate-800">
              <MaterialIcons
                name="filter-list"
                size={22}
                color={actionFilter || entityFilter ? "#F97316" : "#94A3B8"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={fetchLogs}
              className="h-10 w-10 items-center justify-center rounded-xl bg-slate-800">
              <MaterialIcons name="refresh" size={22} color="#F97316" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Active filter chips */}
        {(actionFilter || entityFilter) && (
          <View className="flex-row flex-wrap gap-2 px-4 pb-3">
            {actionFilter && (
              <TouchableOpacity
                onPress={() => applyFilter("action", "")}
                className="flex-row items-center gap-1 rounded-full bg-brand/20 px-3 py-1.5">
                <Text className="text-xs text-orange-400">
                  {ACTION_LABELS[actionFilter] || actionFilter}
                </Text>
                <MaterialIcons name="close" size={12} color="#FB923C" />
              </TouchableOpacity>
            )}
            {entityFilter && (
              <TouchableOpacity
                onPress={() => applyFilter("entity", "")}
                className="flex-row items-center gap-1 rounded-full bg-brand/20 px-3 py-1.5">
                <Text className="text-xs text-orange-400">
                  {ENTITY_LABELS[entityFilter] || entityFilter}
                </Text>
                <MaterialIcons name="close" size={12} color="#FB923C" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#F97316" />
          </View>
        ) : (
          <FlatList
            data={logs}
            renderItem={renderLogEntry}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-16">
                <MaterialIcons name="history" size={48} color="#64748B" />
                <Text className="mt-4 text-slate-500">No audit logs found</Text>
              </View>
            }
            ListFooterComponent={
              totalPages > 1 ? (
                <View className="flex-row items-center justify-center gap-4 py-4">
                  <Button
                    title="Previous"
                    size="sm"
                    variant="ghost"
                    onPress={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  />
                  <Text className="text-sm text-slate-400">
                    {page} / {totalPages}
                  </Text>
                  <Button
                    title="Next"
                    size="sm"
                    variant="ghost"
                    onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  />
                </View>
              ) : null
            }
          />
        )}
      </View>

      {/* Filter Modal */}
      <Modal visible={showFilters} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/60">
          <View className="max-h-[75%] rounded-t-3xl border-t border-slate-700 bg-slate-800 p-5">
            <View className="mb-5 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-white">Filters</Text>
              <TouchableOpacity
                onPress={() => setShowFilters(false)}
                className="h-10 w-10 items-center justify-center rounded-full bg-slate-700">
                <MaterialIcons name="close" size={22} color="#F8FAFC" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text className="mb-2 text-sm font-bold uppercase text-slate-400">
                Action Type
              </Text>
              <View className="mb-5 flex-row flex-wrap gap-2">
                {ACTION_FILTER_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => applyFilter("action", opt.value)}
                    className={`rounded-full px-3 py-2 ${
                      actionFilter === opt.value
                        ? "bg-brand"
                        : "bg-slate-700"
                    }`}>
                    <Text
                      className={`text-xs font-medium ${
                        actionFilter === opt.value ? "text-white" : "text-slate-300"
                      }`}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text className="mb-2 text-sm font-bold uppercase text-slate-400">
                Entity Type
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {ENTITY_FILTER_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => applyFilter("entity", opt.value)}
                    className={`rounded-full px-3 py-2 ${
                      entityFilter === opt.value
                        ? "bg-brand"
                        : "bg-slate-700"
                    }`}>
                    <Text
                      className={`text-xs font-medium ${
                        entityFilter === opt.value ? "text-white" : "text-slate-300"
                      }`}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {(actionFilter || entityFilter) && (
                <Button
                  title="Clear All Filters"
                  variant="ghost"
                  className="mt-5"
                  onPress={() => {
                    setActionFilter("");
                    setEntityFilter("");
                    setPage(1);
                    setShowFilters(false);
                  }}
                />
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={!!selectedEntry} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/60">
          <View className="max-h-[80%] rounded-t-3xl border-t border-slate-700 bg-slate-800 p-5">
            <View className="mb-5 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-white">Audit Detail</Text>
              <TouchableOpacity
                onPress={() => setSelectedEntry(null)}
                className="h-10 w-10 items-center justify-center rounded-full bg-slate-700">
                <MaterialIcons name="close" size={22} color="#F8FAFC" />
              </TouchableOpacity>
            </View>

            {selectedEntry && (
              <ScrollView>
                <View className="mb-3">
                  <Text className="text-lg font-bold text-white">
                    {ACTION_LABELS[selectedEntry.action] || selectedEntry.action}
                  </Text>
                  <Text className="mt-1 text-sm text-slate-400">
                    {formatDate(selectedEntry.createdAt)}
                  </Text>
                </View>

                <View className="flex-row gap-2">
                  <Badge variant="outline">
                    {ENTITY_LABELS[selectedEntry.entityType] || selectedEntry.entityType}
                  </Badge>
                  <Badge variant="outline">ID: {selectedEntry.entityId}</Badge>
                </View>

                {selectedEntry.actorUserId && (
                  <View className="mt-3">
                    <Text className="text-xs text-slate-400">Actor</Text>
                    <Text className="text-sm text-slate-300">
                      {selectedEntry.actorName || selectedEntry.actorUserId}
                    </Text>
                  </View>
                )}

                {selectedEntry.reason && (
                  <View className="mt-3">
                    <Text className="text-xs text-slate-400">Reason</Text>
                    <Text className="text-sm italic text-amber-400">
                      {selectedEntry.reason}
                    </Text>
                  </View>
                )}

                {renderDiff("Previous State", selectedEntry.oldValue)}
                {renderDiff("New State", selectedEntry.newValue)}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}
