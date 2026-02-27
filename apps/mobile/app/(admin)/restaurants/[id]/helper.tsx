import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useState, useCallback, useEffect } from "react";
import { tableAPI, type Table } from "@/lib/api";
import { orderAPI } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MaterialIcons } from "@expo/vector-icons";
import { DemoModeBanner } from "@/components/DemoModeBanner";
import { useDemoMode } from "@/lib/hooks/useDemoMode";
import { hapticMedium, hapticSuccess } from "@/lib/utils/haptics";

type TableStatus = "available" | "occupied" | "blocked";

interface TableWithStatus extends Table {
  derivedStatus: TableStatus;
}

const STATUS_CONFIG: Record<
  TableStatus,
  { color: string; bg: string; icon: string; label: string }
> = {
  available: {
    color: "#22C55E",
    bg: "rgba(34,197,94,0.12)",
    icon: "check-circle",
    label: "Available",
  },
  occupied: {
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.12)",
    icon: "people",
    label: "Occupied",
  },
  blocked: {
    color: "#EF4444",
    bg: "rgba(239,68,68,0.12)",
    icon: "block",
    label: "Blocked",
  },
};

export default function HelperTableView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tables, setTables] = useState<TableWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);

  const restaurantId = Number(id);
  const { isDemoMode } = useDemoMode(restaurantId);

  const fetchData = useCallback(async () => {
    try {
      const [tablesRes, sessionsRes] = await Promise.all([
        tableAPI.getAll(restaurantId),
        orderAPI.getSessions(restaurantId, true),
      ]);

      const activeSessions = sessionsRes.data || [];
      setSessions(activeSessions);

      // Determine table status
      const occupiedTableNumbers = new Set(
        activeSessions.map((s: any) => (s.session || s).tableNumber ?? s.tableNumber),
      );

      const tablesWithStatus: TableWithStatus[] = (tablesRes.data || []).map(
        (table: Table) => {
          let derivedStatus: TableStatus = "available";
          if (table.helperBlockedBy) {
            derivedStatus = "blocked";
          } else if (occupiedTableNumbers.has(table.tableNumber)) {
            derivedStatus = "occupied";
          }
          return { ...table, derivedStatus };
        },
      );

      setTables(tablesWithStatus.sort((a, b) => a.tableNumber - b.tableNumber));
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleBlockTable = async (tableId: number, tableNumber: number) => {
    Alert.alert(
      "Block Table",
      `Block Table #${tableNumber} for cleaning/maintenance?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            hapticMedium();
            setActionLoading(tableId);
            try {
              await tableAPI.blockTable(restaurantId, tableId);
              hapticSuccess();
              fetchData();
            } catch (error: any) {
              Alert.alert("Error", error?.message || "Failed to block table");
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  };

  const handleUnblockTable = async (tableId: number) => {
    hapticMedium();
    setActionLoading(tableId);
    try {
      await tableAPI.unblockTable(restaurantId, tableId);
      hapticSuccess();
      fetchData();
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to unblock table");
    } finally {
      setActionLoading(null);
    }
  };

  // Count by status
  const statusCounts = {
    available: tables.filter((t) => t.derivedStatus === "available").length,
    occupied: tables.filter((t) => t.derivedStatus === "occupied").length,
    blocked: tables.filter((t) => t.derivedStatus === "blocked").length,
  };

  const renderTable = ({ item }: { item: TableWithStatus }) => {
    const config = STATUS_CONFIG[item.derivedStatus];
    const isActioning = actionLoading === item.id;

    return (
      <View className="m-[1%] w-[31%]">
        <Card>
          <CardContent className="items-center py-4">
            <View
              className="mb-2 h-12 w-12 items-center justify-center rounded-2xl"
              style={{ backgroundColor: config.bg }}>
              <MaterialIcons name={config.icon as any} size={24} color={config.color} />
            </View>

            <Text className="text-lg font-bold text-white">#{item.tableNumber}</Text>

            <Badge
              variant={
                item.derivedStatus === "available"
                  ? "success"
                  : item.derivedStatus === "blocked"
                    ? "destructive"
                    : "default"
              }
              className="mt-1">
              {config.label}
            </Badge>

            {/* Action button */}
            <View className="mt-3 w-full">
              {item.derivedStatus === "available" && (
                <TouchableOpacity
                  onPress={() => handleBlockTable(item.id, item.tableNumber)}
                  disabled={isActioning}
                  activeOpacity={0.7}
                  className="items-center rounded-lg bg-red-600/20 py-3">
                  {isActioning ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <View className="flex-row items-center gap-1">
                      <MaterialIcons name="block" size={16} color="#EF4444" />
                      <Text className="text-xs font-bold text-red-400">Block</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}

              {item.derivedStatus === "blocked" && (
                <TouchableOpacity
                  onPress={() => handleUnblockTable(item.id)}
                  disabled={isActioning}
                  activeOpacity={0.7}
                  className="items-center rounded-lg bg-green-600/20 py-3">
                  {isActioning ? (
                    <ActivityIndicator size="small" color="#22C55E" />
                  ) : (
                    <View className="flex-row items-center gap-1">
                      <MaterialIcons name="check-circle" size={16} color="#22C55E" />
                      <Text className="text-xs font-bold text-green-400">Unblock</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}

              {item.derivedStatus === "occupied" && (
                <View className="items-center rounded-lg bg-amber-600/10 py-2">
                  <Text className="text-xs text-amber-400">In Use</Text>
                </View>
              )}
            </View>
          </CardContent>
        </Card>
      </View>
    );
  };

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Tables",
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
          title: "Tables",
          headerStyle: { backgroundColor: "#0F172A" },
          headerTintColor: "#F8FAFC",
          headerShadowVisible: false,
        }}
      />
      <View className="flex-1 bg-slate-900">
        <DemoModeBanner visible={isDemoMode} />

        {/* Status summary bar */}
        <View className="flex-row items-center justify-between px-4 py-3">
          <Text className="text-xl font-bold text-white">Table Status</Text>
          <TouchableOpacity
            onPress={fetchData}
            className="h-10 w-10 items-center justify-center rounded-xl bg-slate-800">
            <MaterialIcons name="refresh" size={22} color="#F97316" />
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View className="mb-4 flex-row gap-3 px-4">
          {(Object.entries(statusCounts) as [TableStatus, number][]).map(
            ([status, count]) => {
              const config = STATUS_CONFIG[status];
              return (
                <View
                  key={status}
                  className="flex-1 items-center rounded-xl py-3"
                  style={{ backgroundColor: config.bg }}>
                  <Text className="text-2xl font-bold" style={{ color: config.color }}>
                    {count}
                  </Text>
                  <Text className="text-xs" style={{ color: config.color }}>
                    {config.label}
                  </Text>
                </View>
              );
            },
          )}
        </View>

        <FlatList
          data={tables}
          renderItem={renderTable}
          keyExtractor={(item) => String(item.id)}
          numColumns={3}
          contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-16">
              <MaterialIcons name="table-restaurant" size={48} color="#64748B" />
              <Text className="mt-4 text-slate-500">No tables configured</Text>
            </View>
          }
        />
      </View>
    </>
  );
}
