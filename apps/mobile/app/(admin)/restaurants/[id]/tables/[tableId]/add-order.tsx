import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { menuAPI, type MenuCategory, type MenuItem } from '@/lib/api';
import { orderAPI } from '@/lib/api/order';
import { publicAPI } from '@/lib/api/public';
import { fileAPI } from '@/lib/api/file';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { formatPrice } from '@menugo/dto';
import { restaurantAPI } from '@/lib/api';
import { MaterialIcons } from '@expo/vector-icons';

export default function AddOrderScreen() {
  const { id, tableId, sessionId } = useLocalSearchParams<{ id: string; tableId: string; sessionId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<Record<number, MenuItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<number | string | null>(null);
  const [currency, setCurrency] = useState('INR');
  const [sessionOrders, setSessionOrders] = useState<any[]>([]);

  // Cart: item ID -> quantity
  const [cart, setCart] = useState<Record<number, { item: MenuItem; quantity: number }>>({});

  const restaurantId = Number(id);

  useEffect(() => {
    (async () => {
      try {
        const res = await restaurantAPI.getById(restaurantId);
        setCurrency(res.data.currency || 'INR');
      } catch {}
    })();
  }, [restaurantId]);

  const fetchMenu = useCallback(async () => {
    try {
      setLoading(true);
      const catRes = await menuAPI.getCategories(restaurantId);
      const cats = catRes.data || [];
      setCategories(cats);
      if (cats.length > 0 && !selectedCategory) {
        setSelectedCategory(cats[0].id);
      }
      const itemMap: Record<number, MenuItem[]> = {};
      for (const cat of cats) {
        try {
          const itemRes = await menuAPI.getItemsByCategory(restaurantId, cat.id);
          // Only show available and active items for order placing
          itemMap[cat.id] = (itemRes.data || []).filter((i: MenuItem) => i.isActive && i.isAvailable);
        } catch {
          itemMap[cat.id] = [];
        }
      }
      setItems(itemMap);

      if (sessionId) {
        const ordersRes = await publicAPI.getSessionOrders(Number(sessionId));
        setSessionOrders(ordersRes.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch menu:', error);
    } finally {
      setLoading(false);
    }
  }, [restaurantId, selectedCategory]);

  useFocusEffect(
    useCallback(() => {
      fetchMenu();
    }, [fetchMenu])
  );

  const handleAddToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev[item.id];
      if (existing) {
        return { ...prev, [item.id]: { ...existing, quantity: existing.quantity + 1 } };
      }
      return { ...prev, [item.id]: { item, quantity: 1 } };
    });
  };

  const handleRemoveFromCart = (itemId: number) => {
    setCart((prev) => {
      const existing = prev[itemId];
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        const newCart = { ...prev };
        delete newCart[itemId];
        return newCart;
      }
      return { ...prev, [itemId]: { ...existing, quantity: existing.quantity - 1 } };
    });
  };

  const handlePlaceOrder = async () => {
    const orderItems = Object.values(cart).map((c) => ({
      menuItemId: c.item.id,
      quantity: c.quantity,
    }));

    if (orderItems.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to place an order.');
      return;
    }

    try {
      setSubmitting(true);
      await orderAPI.createStaffOrder(restaurantId, {
        sessionId: Number(sessionId),
        items: orderItems,
      });
      Alert.alert('Success', 'Order placed successfully.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to place order.');
    } finally {
      setSubmitting(false);
    }
  };

  const cartItemsCount = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = Object.values(cart).reduce((sum, item) => sum + Number(item.item.price) * item.quantity, 0);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 bg-white">
        <View className="flex-row items-center justify-between px-5 pb-4 border-b border-gray-200" style={{ paddingTop: insets.top + 12 }}>
          <View className="flex-row items-center gap-4">
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="h-10 w-10 items-center justify-center rounded-xl bg-gray-100 active:opacity-70">
              <MaterialIcons name="arrow-back" size={22} color="#374151" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-black">Create Order</Text>
          </View>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#DC2626" />
          </View>
        ) : categories.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-lg font-medium text-gray-500">No active menu categories available.</Text>
          </View>
        ) : (
          <View className="flex-1">
            <Tabs defaultValue={String(categories[0]?.id || '')}>
              <TabsList>
                {sessionOrders.length > 0 && (
                  <TabsTrigger value="placed_orders" onPressIn={() => setSelectedCategory('placed_orders')}>
                    <Text>⭐ Placed Orders</Text>
                  </TabsTrigger>
                )}
                {categories.map((cat) => (
                  <TabsTrigger
                    key={cat.id}
                    value={String(cat.id)}
                    onPressIn={() => setSelectedCategory(cat.id)}>
                    <Text>{cat.name}</Text>
                  </TabsTrigger>
                ))}
              </TabsList>

              {sessionOrders.length > 0 && (
                <TabsContent value="placed_orders">
                  <FlatList
                    data={sessionOrders}
                    keyExtractor={(order) => String(order.id)}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
                    renderItem={({ item: order }) => (
                      <View className="mb-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <View className="flex-row justify-between items-center border-b border-gray-200 pb-2 mb-3">
                          <Text className="font-bold text-black text-lg">Order #{order.orderNumber}</Text>
                          <Badge variant={order.status === 'delivered' ? 'success' : 'default'}>{order.status}</Badge>
                        </View>
                        {(order.items || []).map((orderItem: any, i: number) => (
                          <View key={orderItem.id || i} className="flex-row justify-between mb-2">
                            <Text className="text-black flex-1 text-base">{orderItem.quantity}× {orderItem.itemName}</Text>
                            <Text className="text-gray-500 text-sm font-semibold uppercase">{orderItem.status}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  />
                </TabsContent>
              )}

              {categories.map((cat) => (
                <TabsContent key={cat.id} value={String(cat.id)}>
                  <FlatList
                    data={items[cat.id] || []}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
                    renderItem={({ item }) => {
                      const qty = cart[item.id]?.quantity || 0;
                      return (
                        <Card className="mb-3">
                          <CardContent>
                            <View className="flex-row items-center justify-between">
                              {item.imagePath ? (
                                <Image
                                  source={{
                                    uri: item.imagePath.startsWith('http')
                                      ? item.imagePath
                                      : fileAPI.getFullUrl(item.imagePath),
                                  }}
                                  className="mr-3 h-14 w-14 rounded-xl"
                                  resizeMode="cover"
                                />
                              ) : null}
                              <View className="mr-4 flex-1">
                                <View className="flex-row items-center gap-2">
                                  <Text className="text-base font-bold text-black">{item.name}</Text>
                                  {item.isVeg && <Badge variant="success">Veg</Badge>}
                                </View>
                                {item.description && (
                                  <Text className="mt-1 text-sm text-gray-500" numberOfLines={2}>
                                    {item.description}
                                  </Text>
                                )}
                                <Text className="mt-1.5 font-semibold text-brand">
                                  {formatPrice(item.price, currency)}
                                </Text>
                              </View>
                              <View className="items-center justify-center flex-row">
                                {qty > 0 ? (
                                  <>
                                    <TouchableOpacity
                                      onPress={() => handleRemoveFromCart(item.id)}
                                      className="h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                                      <MaterialIcons name="remove" size={16} color="#374151" />
                                    </TouchableOpacity>
                                    <Text className="mx-3 text-black font-bold">{qty}</Text>
                                    <TouchableOpacity
                                      onPress={() => handleAddToCart(item)}
                                      className="h-8 w-8 items-center justify-center rounded-lg bg-brand">
                                      <MaterialIcons name="add" size={16} color="#fff" />
                                    </TouchableOpacity>
                                  </>
                                ) : (
                                  <Button
                                    title="Add"
                                    size="sm"
                                    onPress={() => handleAddToCart(item)}
                                  />
                                )}
                              </View>
                            </View>
                          </CardContent>
                        </Card>
                      );
                    }}
                    ListEmptyComponent={
                      <Text className="py-10 text-center text-gray-500">
                        No available items.
                      </Text>
                    }
                  />
                </TabsContent>
              ))}
            </Tabs>
          </View>
        )}

        {/* Placing Order Footer */}
        {cartItemsCount > 0 && (
          <View className="absolute bottom-0 left-0 right-0 bg-white px-5 pt-4 flex-row items-center justify-between border-t border-gray-200 shadow-xl" style={{ paddingBottom: insets.bottom + 16 }}>
            <View>
              <Text className="text-gray-500">{cartItemsCount} item{cartItemsCount > 1 ? 's' : ''}</Text>
              <Text className="text-lg font-bold text-black">{formatPrice(cartTotal, currency)}</Text>
            </View>
            <Button
              title="Place Order"
              onPress={handlePlaceOrder}
              disabled={submitting}
              className="w-40"
            />
          </View>
        )}
      </View>
    </>
  );
}
