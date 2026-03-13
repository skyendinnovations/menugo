import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import { menuAPI } from '@/lib/api';
import type { MenuCategory, MenuItem, MenuItemVariant } from '@menugo/dto';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/Switch';
import { MaterialIcons } from '@expo/vector-icons';
import { DemoModeBanner } from '@/components/DemoModeBanner';
import { useDemoMode } from '@/lib/hooks/useDemoMode';

interface CategoryWithItems extends MenuCategory {
  items: MenuItem[];
}

export default function StockManagementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const restaurantId = Number(id);
  const { isDemoMode } = useDemoMode(restaurantId);

  const [categories, setCategories] = useState<CategoryWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [editingStock, setEditingStock] = useState<{ key: string; value: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const catRes = await menuAPI.getCategories(restaurantId);
      const cats = catRes.data || [];

      const withItems: CategoryWithItems[] = await Promise.all(
        cats.map(async (cat) => {
          const itemsRes = await menuAPI.getItemsByCategory(restaurantId, cat.id);
          return { ...cat, items: itemsRes.data || [] };
        })
      );

      setCategories(withItems.sort((a, b) => a.displayOrder - b.displayOrder));

      // Auto-expand all categories on first load
      if (expandedCategories.size === 0) {
        setExpandedCategories(new Set(withItems.map((c) => c.id)));
      }
    } catch (error) {
      console.error('Failed to fetch menu data:', error);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleCategory = (categoryId: number) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleToggleSoldOut = async (item: MenuItem) => {
    const key = `item-${item.id}`;
    setActionLoading(key);
    try {
      await menuAPI.toggleItemSoldOut(restaurantId, item.id, !item.isSoldOut);
      setCategories((prev) =>
        prev.map((cat) => ({
          ...cat,
          items: cat.items.map((i) =>
            i.id === item.id ? { ...i, isSoldOut: !i.isSoldOut } : i
          ),
        }))
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update sold out status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleVariantSoldOut = async (
    itemId: number,
    variant: MenuItemVariant
  ) => {
    const key = `variant-${variant.id}`;
    setActionLoading(key);
    try {
      await menuAPI.toggleVariantSoldOut(restaurantId, variant.id, !variant.isSoldOut);
      setCategories((prev) =>
        prev.map((cat) => ({
          ...cat,
          items: cat.items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  variants: (item.variants || []).map((v) =>
                    v.id === variant.id ? { ...v, isSoldOut: !v.isSoldOut } : v
                  ),
                }
              : item
          ),
        }))
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update variant sold out status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateItemStock = async (item: MenuItem, stockStr: string) => {
    const stockCount = stockStr.trim() === '' ? null : parseInt(stockStr, 10);
    if (stockCount !== null && isNaN(stockCount)) {
      Alert.alert('Invalid Input', 'Please enter a valid number or leave empty for unlimited.');
      return;
    }

    const key = `stock-item-${item.id}`;
    setActionLoading(key);
    try {
      await menuAPI.updateItemStock(restaurantId, item.id, stockCount);
      setCategories((prev) =>
        prev.map((cat) => ({
          ...cat,
          items: cat.items.map((i) =>
            i.id === item.id ? { ...i, stockCount } : i
          ),
        }))
      );
      setEditingStock(null);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update stock');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateVariantStock = async (
    itemId: number,
    variant: MenuItemVariant,
    stockStr: string
  ) => {
    const stockCount = stockStr.trim() === '' ? null : parseInt(stockStr, 10);
    if (stockCount !== null && isNaN(stockCount)) {
      Alert.alert('Invalid Input', 'Please enter a valid number or leave empty for unlimited.');
      return;
    }

    const key = `stock-variant-${variant.id}`;
    setActionLoading(key);
    try {
      await menuAPI.updateVariantStock(restaurantId, variant.id, stockCount);
      setCategories((prev) =>
        prev.map((cat) => ({
          ...cat,
          items: cat.items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  variants: (item.variants || []).map((v) =>
                    v.id === variant.id ? { ...v, stockCount } : v
                  ),
                }
              : item
          ),
        }))
      );
      setEditingStock(null);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update variant stock');
    } finally {
      setActionLoading(null);
    }
  };

  const stockDisplay = (stockCount: number | null | undefined) => {
    if (stockCount === null || stockCount === undefined) return '∞';
    return String(stockCount);
  };

  const stockColor = (stockCount: number | null | undefined) => {
    if (stockCount === null || stockCount === undefined) return '#22C55E';
    if (stockCount === 0) return '#EF4444';
    if (stockCount <= 5) return '#F59E0B';
    return '#22C55E';
  };

  // Count items with issues
  const soldOutCount = categories.reduce(
    (acc, cat) => acc + cat.items.filter((i) => i.isSoldOut).length,
    0
  );
  const lowStockCount = categories.reduce(
    (acc, cat) =>
      acc +
      cat.items.filter(
        (i) => !i.isSoldOut && i.stockCount !== null && i.stockCount !== undefined && i.stockCount <= 5
      ).length,
    0
  );

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Stock',
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
          title: 'Stock',
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
          <View className="mb-2 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="inventory" size={22} color="#10B981" />
              <Text className="text-xl font-bold text-white">Stock Management</Text>
            </View>
            <TouchableOpacity
              onPress={fetchData}
              className="h-10 w-10 items-center justify-center rounded-xl bg-slate-800">
              <MaterialIcons name="refresh" size={22} color="#F97316" />
            </TouchableOpacity>
          </View>

          {/* Stats row */}
          <View className="mb-5 flex-row gap-3">
            <View className="flex-1 items-center rounded-xl bg-red-500/10 py-3">
              <Text className="text-2xl font-bold text-red-400">{soldOutCount}</Text>
              <Text className="text-xs text-red-400">Sold Out</Text>
            </View>
            <View className="flex-1 items-center rounded-xl bg-amber-500/10 py-3">
              <Text className="text-2xl font-bold text-amber-400">{lowStockCount}</Text>
              <Text className="text-xs text-amber-400">Low Stock</Text>
            </View>
            <View className="flex-1 items-center rounded-xl bg-green-500/10 py-3">
              <Text className="text-2xl font-bold text-green-400">
                {categories.reduce((a, c) => a + c.items.length, 0) -
                  soldOutCount -
                  lowStockCount}
              </Text>
              <Text className="text-xs text-green-400">In Stock</Text>
            </View>
          </View>

          {categories.length === 0 && (
            <View className="items-center py-16">
              <MaterialIcons name="restaurant-menu" size={48} color="#64748B" />
              <Text className="mt-4 text-slate-500">No menu items found.</Text>
            </View>
          )}

          {categories.map((cat) => {
            const isExpanded = expandedCategories.has(cat.id);
            return (
              <View key={cat.id} className="mb-4">
                {/* Category header */}
                <TouchableOpacity
                  onPress={() => toggleCategory(cat.id)}
                  activeOpacity={0.7}
                  className="flex-row items-center justify-between rounded-xl bg-slate-800 p-4">
                  <View className="flex-row items-center gap-2">
                    <MaterialIcons
                      name={isExpanded ? 'expand-less' : 'expand-more'}
                      size={24}
                      color="#94A3B8"
                    />
                    <Text className="text-base font-bold text-white">{cat.name}</Text>
                    <Badge variant="outline">{cat.items.length}</Badge>
                  </View>
                  {cat.items.some((i) => i.isSoldOut) && (
                    <Badge variant="destructive">
                      {cat.items.filter((i) => i.isSoldOut).length} sold out
                    </Badge>
                  )}
                </TouchableOpacity>

                {/* Items */}
                {isExpanded &&
                  cat.items.map((item) => {
                    const isItemLoading =
                      actionLoading === `item-${item.id}` ||
                      actionLoading === `stock-item-${item.id}`;
                    const editKey = `item-${item.id}`;
                    const isEditingThis =
                      editingStock?.key === editKey;

                    return (
                      <View key={item.id}>
                        <Card className="ml-4 mt-2">
                          <CardContent>
                            <View className="flex-row items-center justify-between">
                              <View className="flex-1">
                                <View className="flex-row items-center gap-2">
                                  <Text className="text-sm font-semibold text-white">
                                    {item.name}
                                  </Text>
                                  {item.isVeg && (
                                    <View className="h-4 w-4 items-center justify-center rounded-sm border border-green-500">
                                      <View className="h-2 w-2 rounded-full bg-green-500" />
                                    </View>
                                  )}
                                </View>

                                {/* Stock count */}
                                <TouchableOpacity
                                  onPress={() =>
                                    setEditingStock({
                                      key: editKey,
                                      value:
                                        item.stockCount !== null &&
                                        item.stockCount !== undefined
                                          ? String(item.stockCount)
                                          : '',
                                    })
                                  }
                                  className="mt-1 flex-row items-center gap-1">
                                  <MaterialIcons
                                    name="inventory-2"
                                    size={12}
                                    color={stockColor(item.stockCount)}
                                  />
                                  <Text
                                    className="text-xs"
                                    style={{ color: stockColor(item.stockCount) }}>
                                    Stock: {stockDisplay(item.stockCount)}
                                  </Text>
                                  <MaterialIcons
                                    name="edit"
                                    size={10}
                                    color="#64748B"
                                  />
                                </TouchableOpacity>
                              </View>

                              <View className="flex-row items-center gap-3">
                                {item.isSoldOut && (
                                  <Badge variant="destructive">Sold Out</Badge>
                                )}
                                {isItemLoading ? (
                                  <ActivityIndicator
                                    size="small"
                                    color="#F97316"
                                  />
                                ) : (
                                  <Switch
                                    checked={!item.isSoldOut}
                                    onCheckedChange={() =>
                                      handleToggleSoldOut(item)
                                    }
                                  />
                                )}
                              </View>
                            </View>

                            {/* Stock editing */}
                            {isEditingThis && (
                              <View className="mt-3 flex-row items-center gap-2 rounded-lg bg-slate-700/50 p-2">
                                <TextInput
                                  value={editingStock.value}
                                  onChangeText={(v) =>
                                    setEditingStock({ key: editKey, value: v })
                                  }
                                  placeholder="∞ (unlimited)"
                                  placeholderTextColor="#64748B"
                                  keyboardType="numeric"
                                  className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-sm text-white"
                                />
                                <TouchableOpacity
                                  onPress={() =>
                                    handleUpdateItemStock(item, editingStock.value)
                                  }
                                  className="rounded-lg bg-brand px-3 py-2">
                                  <Text className="text-xs font-bold text-white">
                                    Save
                                  </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => setEditingStock(null)}
                                  className="rounded-lg bg-slate-700 px-3 py-2">
                                  <Text className="text-xs text-slate-300">
                                    Cancel
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            )}

                            {/* Variants */}
                            {item.hasVariants &&
                              (item.variants || []).map((variant) => {
                                const vKey = `variant-${variant.id}`;
                                const isVarLoading =
                                  actionLoading === vKey ||
                                  actionLoading === `stock-variant-${variant.id}`;
                                const isEditingVar =
                                  editingStock?.key === vKey;

                                return (
                                  <View
                                    key={variant.id}
                                    className="ml-4 mt-3 rounded-lg border border-slate-700 p-3">
                                    <View className="flex-row items-center justify-between">
                                      <View className="flex-1">
                                        <Text className="text-xs font-medium text-slate-300">
                                          {variant.name} — ₹{variant.price}
                                        </Text>
                                        <TouchableOpacity
                                          onPress={() =>
                                            setEditingStock({
                                              key: vKey,
                                              value:
                                                variant.stockCount !== null &&
                                                variant.stockCount !== undefined
                                                  ? String(variant.stockCount)
                                                  : '',
                                            })
                                          }
                                          className="mt-1 flex-row items-center gap-1">
                                          <Text
                                            className="text-xs"
                                            style={{
                                              color: stockColor(variant.stockCount),
                                            }}>
                                            Stock: {stockDisplay(variant.stockCount)}
                                          </Text>
                                          <MaterialIcons
                                            name="edit"
                                            size={10}
                                            color="#64748B"
                                          />
                                        </TouchableOpacity>
                                      </View>

                                      <View className="flex-row items-center gap-2">
                                        {variant.isSoldOut && (
                                          <Badge variant="destructive">
                                            Sold Out
                                          </Badge>
                                        )}
                                        {isVarLoading ? (
                                          <ActivityIndicator
                                            size="small"
                                            color="#F97316"
                                          />
                                        ) : (
                                          <Switch
                                            checked={!variant.isSoldOut}
                                            onCheckedChange={() =>
                                              handleToggleVariantSoldOut(
                                                item.id,
                                                variant
                                              )
                                            }
                                          />
                                        )}
                                      </View>
                                    </View>

                                    {isEditingVar && (
                                      <View className="mt-2 flex-row items-center gap-2 rounded-lg bg-slate-700/50 p-2">
                                        <TextInput
                                          value={editingStock!.value}
                                          onChangeText={(v) =>
                                            setEditingStock({
                                              key: vKey,
                                              value: v,
                                            })
                                          }
                                          placeholder="∞ (unlimited)"
                                          placeholderTextColor="#64748B"
                                          keyboardType="numeric"
                                          className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-sm text-white"
                                        />
                                        <TouchableOpacity
                                          onPress={() =>
                                            handleUpdateVariantStock(
                                              item.id,
                                              variant,
                                              editingStock!.value
                                            )
                                          }
                                          className="rounded-lg bg-brand px-3 py-2">
                                          <Text className="text-xs font-bold text-white">
                                            Save
                                          </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                          onPress={() => setEditingStock(null)}
                                          className="rounded-lg bg-slate-700 px-3 py-2">
                                          <Text className="text-xs text-slate-300">
                                            Cancel
                                          </Text>
                                        </TouchableOpacity>
                                      </View>
                                    )}
                                  </View>
                                );
                              })}
                          </CardContent>
                        </Card>
                      </View>
                    );
                  })}
              </View>
            );
          })}
        </ScrollView>
      </View>
    </>
  );
}
