import { View, Text, ScrollView, FlatList, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { publicAPI, type FullMenuCategory } from '@/lib/api';
import { getDeviceId } from '@/lib/utils/device-id';
import { CartProvider, useCart } from '@/lib/context/CartContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { MaterialIcons } from '@expo/vector-icons';

function OrderScreenContent() {
  const { slug, table } = useLocalSearchParams<{ slug: string; table: string }>();
  const [restaurantInfo, setRestaurantInfo] = useState<any>(null);
  const [menu, setMenu] = useState<FullMenuCategory[]>([]);
  const [session, setSession] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [deviceId, setDeviceId] = useState('');

  const cart = useCart();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const did = await getDeviceId();
        setDeviceId(did);

        const menuRes = await publicAPI.getMenu(slug as string);
        setRestaurantInfo(menuRes.data.restaurant);
        setMenu(menuRes.data.menu);

        const sessionRes = await publicAPI.createOrGetSession(slug as string, Number(table), did);
        setSession(sessionRes.data);

        if (sessionRes.data?.id) {
          const ordersRes = await publicAPI.getSessionOrders(sessionRes.data.id);
          setOrders(ordersRes.data || []);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, table]);

  const refreshOrders = async () => {
    if (!session?.id) return;
    try {
      const ordersRes = await publicAPI.getSessionOrders(session.id);
      setOrders(ordersRes.data || []);
    } catch (err) {
      console.error('Failed to refresh orders:', err);
    }
  };

  const handlePlaceOrder = async () => {
    if (cart.items.length === 0 || !session?.id) return;
    setPlacing(true);
    try {
      await publicAPI.placeOrder(
        session.id,
        deviceId,
        cart.items.map((item) => ({
          menuItemId: item.menuItemId,
          variantName: item.variantName,
          quantity: item.quantity,
          notes: item.notes,
        }))
      );
      cart.clearCart();
      setShowCart(false);
      await refreshOrders();
    } catch (err: any) {
      setError(err.message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-900 justify-center items-center">
        <ActivityIndicator size="large" color="#F97316" />
        <Text className="text-slate-400 mt-4">Loading menu...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-900">
      {/* Header */}
      <View className="bg-slate-800 px-5 pt-14 pb-4">
        <Text className="text-white text-xl font-bold">
          {restaurantInfo?.name || 'Restaurant'}
        </Text>
        <View className="flex-row items-center gap-3 mt-2">
          <Badge variant="outline">Table {table}</Badge>
          {session && <Badge variant="default">Code: {session.joinCode}</Badge>}
        </View>
      </View>

      {error ? <Alert variant="destructive" description={error} className="mx-5 mt-4" /> : null}

      {/* Menu */}
      {menu.length > 0 ? (
        <Tabs defaultValue={String(menu[0]?.id || '')}>
          <View className="mt-4">
            <TabsList>
              {menu.map((cat) => (
                <TabsTrigger key={cat.id} value={String(cat.id)}>
                  <Text>{cat.name}</Text>
                </TabsTrigger>
              ))}
              <TabsTrigger value="orders">
                <Text>My Orders</Text>
              </TabsTrigger>
            </TabsList>
          </View>

          {menu.map((cat) => (
            <TabsContent key={cat.id} value={String(cat.id)}>
              <FlatList
                data={cat.items.filter((i) => i.isAvailable)}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
                renderItem={({ item }) => (
                  <Card className="mb-3">
                    <CardContent>
                      <View className="flex-row justify-between items-center">
                        <View className="flex-1 mr-4">
                          <View className="flex-row items-center gap-2">
                            <Text className="text-white font-bold">{item.name}</Text>
                            {item.isVeg && <Badge variant="success">V</Badge>}
                          </View>
                          {item.description && (
                            <Text className="text-slate-400 text-sm mt-1" numberOfLines={2}>
                              {item.description}
                            </Text>
                          )}
                          <Text className="text-brand font-semibold mt-1.5">${item.price}</Text>
                          {item.variants && item.variants.length > 0 && (
                            <View className="flex-row gap-2 mt-2 flex-wrap">
                              {item.variants.map((v) => (
                                <TouchableOpacity
                                  key={v.id}
                                  onPress={() =>
                                    cart.addItem({
                                      menuItemId: item.id,
                                      name: item.name,
                                      price: v.price,
                                      variantName: v.name,
                                    })
                                  }
                                  activeOpacity={0.7}
                                >
                                  <Badge variant="outline">
                                    {v.name} ${v.price}
                                  </Badge>
                                </TouchableOpacity>
                              ))}
                            </View>
                          )}
                        </View>
                        <TouchableOpacity
                          onPress={() =>
                            cart.addItem({
                              menuItemId: item.id,
                              name: item.name,
                              price: item.price,
                            })
                          }
                          activeOpacity={0.7}
                          className="bg-brand rounded-xl w-11 h-11 items-center justify-center"
                        >
                          <MaterialIcons name="add" size={24} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </CardContent>
                  </Card>
                )}
                ListEmptyComponent={
                  <Text className="text-slate-500 text-center py-10">No items available</Text>
                }
              />
            </TabsContent>
          ))}

          <TabsContent value="orders">
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}>
              <TouchableOpacity onPress={refreshOrders} className="mb-3">
                <Text className="text-brand text-right font-semibold">Refresh</Text>
              </TouchableOpacity>
              {orders.length === 0 ? (
                <Text className="text-slate-500 text-center py-10">No orders yet</Text>
              ) : (
                orders.map((order: any) => (
                  <Card key={order.id} className="mb-3">
                    <CardContent>
                      <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-white font-bold">{order.orderNumber}</Text>
                        <Badge
                          variant={
                            order.status === 'ready'
                              ? 'success'
                              : order.status === 'cancelled'
                                ? 'destructive'
                                : 'default'
                          }
                        >
                          {order.status?.toUpperCase()}
                        </Badge>
                      </View>
                      {order.items?.map((item: any, idx: number) => (
                        <Text key={idx} className="text-slate-300 text-sm">
                          {item.quantity}x {item.itemName} - $
                          {(parseFloat(item.priceAtOrder) * item.quantity).toFixed(2)}
                        </Text>
                      ))}
                    </CardContent>
                  </Card>
                ))
              )}
            </ScrollView>
          </TabsContent>
        </Tabs>
      ) : (
        <View className="flex-1 justify-center items-center">
          <Text className="text-slate-500">Menu not available</Text>
        </View>
      )}

      {/* Cart FAB */}
      {cart.itemCount > 0 && (
        <TouchableOpacity
          onPress={() => setShowCart(true)}
          activeOpacity={0.8}
          className="absolute bottom-6 left-5 right-5 bg-brand rounded-2xl px-6 py-4 flex-row items-center justify-between"
          style={{ elevation: 8 }}
        >
          <View className="flex-row items-center gap-3">
            <MaterialIcons name="shopping-cart" size={22} color="#fff" />
            <Text className="text-white font-bold text-base">{cart.itemCount} items</Text>
          </View>
          <Text className="text-white font-bold text-lg">${cart.total.toFixed(2)}</Text>
        </TouchableOpacity>
      )}

      {/* Cart Modal */}
      <Modal visible={showCart} animationType="slide" transparent>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-slate-800 border-t border-slate-700 rounded-t-3xl p-5 max-h-[80%]">
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-white text-xl font-bold">Your Cart</Text>
              <TouchableOpacity
                onPress={() => setShowCart(false)}
                className="w-10 h-10 rounded-full bg-slate-700 items-center justify-center"
              >
                <MaterialIcons name="close" size={22} color="#F8FAFC" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {cart.items.map((item, idx) => (
                <View
                  key={idx}
                  className="flex-row justify-between items-center py-4 border-b border-slate-700/50"
                >
                  <View className="flex-1">
                    <Text className="text-white font-semibold">
                      {item.name}
                      {item.variantName ? ` (${item.variantName})` : ''}
                    </Text>
                    <Text className="text-slate-400 text-sm mt-0.5">${item.price} each</Text>
                  </View>
                  <View className="flex-row items-center gap-3">
                    <TouchableOpacity
                      onPress={() =>
                        cart.updateQuantity(item.menuItemId, item.quantity - 1, item.variantName)
                      }
                    >
                      <MaterialIcons name="remove-circle" size={28} color="#F97316" />
                    </TouchableOpacity>
                    <Text className="text-white font-bold text-lg w-6 text-center">
                      {item.quantity}
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        cart.updateQuantity(item.menuItemId, item.quantity + 1, item.variantName)
                      }
                    >
                      <MaterialIcons name="add-circle" size={28} color="#F97316" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View className="border-t border-slate-700 pt-5 mt-4">
              <View className="flex-row justify-between mb-5">
                <Text className="text-white text-lg font-bold">Total</Text>
                <Text className="text-white text-lg font-bold">${cart.total.toFixed(2)}</Text>
              </View>
              <Button
                title="Place Order"
                loading={placing}
                onPress={handlePlaceOrder}
                disabled={placing || cart.items.length === 0}
                size="lg"
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function OrderScreen() {
  return (
    <CartProvider>
      <OrderScreenContent />
    </CartProvider>
  );
}
