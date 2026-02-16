import {
  View,
  Text,
  ScrollView,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { publicAPI, type FullMenuCategory, type MenuItem, type MenuItemVariant } from '@/lib/api';
import { fileAPI } from '@/lib/api/file';
import { getDeviceId } from '@/lib/utils/device-id';
import { CartProvider, useCart } from '@/lib/context/CartContext';
import { Button } from '@/components/ui/Button';
import { formatPrice } from '@menugo/dto';
import { MaterialIcons } from '@expo/vector-icons';
import { ROUTES } from '@/lib/routes';

// ─── Types ───────────────────────────────────────────────
type MenuItemWithVariants = MenuItem & { variants: MenuItemVariant[] };

type Section = {
  title: string;
  data: MenuItemWithVariants[];
};

// ─── Quantity Stepper (inline +/- on each item) ──────────
function QuantityStepper({
  menuItemId,
  variantName,
}: {
  menuItemId: number;
  variantName?: string;
}) {
  const cart = useCart();
  const qty =
    cart.items.find(
      (i) => i.menuItemId === menuItemId && (i.variantName || '') === (variantName || '')
    )?.quantity || 0;

  if (qty === 0) return null;

  return (
    <View className="mt-2 flex-row items-center gap-2">
      <TouchableOpacity
        onPress={() => cart.updateQuantity(menuItemId, qty - 1, variantName)}
        activeOpacity={0.7}
        className="h-8 w-8 items-center justify-center rounded-full bg-slate-700">
        <MaterialIcons name="remove" size={18} color="#F97316" />
      </TouchableOpacity>
      <Text className="w-6 text-center text-base font-bold text-white">{qty}</Text>
      <TouchableOpacity
        onPress={() => cart.updateQuantity(menuItemId, qty + 1, variantName)}
        activeOpacity={0.7}
        className="h-8 w-8 items-center justify-center rounded-full bg-slate-700">
        <MaterialIcons name="add" size={18} color="#F97316" />
      </TouchableOpacity>
    </View>
  );
}

// ─── Menu Item Card ──────────────────────────────────────
function MenuItemCard({ item, currency }: { item: MenuItemWithVariants; currency: string }) {
  const cart = useCart();
  const hasVariants = item.variants && item.variants.length > 0;
  const [expanded, setExpanded] = useState(false);

  // Compute lowest variant price
  const lowestVariantPrice = hasVariants
    ? Math.min(...item.variants.map((v) => parseFloat(v.price) || 0))
    : 0;

  const isInCart = (variantName?: string) =>
    cart.items.some(
      (i) => i.menuItemId === item.id && (i.variantName || '') === (variantName || '')
    );

  const totalInCart = cart.items
    .filter((i) => i.menuItemId === item.id)
    .reduce((sum, i) => sum + i.quantity, 0);

  const handleAdd = (variantName?: string, price?: string) => {
    cart.addItem({
      menuItemId: item.id,
      name: item.name,
      price: price || item.price,
      variantName,
    });
  };

  return (
    <View className="mx-4 mb-3 rounded-2xl bg-slate-800 px-4 py-4">
      <TouchableOpacity
        activeOpacity={hasVariants ? 0.7 : 1}
        onPress={() => hasVariants && setExpanded(!expanded)}>
        <View className="flex-row justify-between">
          {/* Left: Info */}
          <View className="mr-3 flex-1">
            <View className="flex-row items-center gap-2">
              {item.isVeg && (
                <View className="h-4 w-4 items-center justify-center rounded-sm border border-emerald-500">
                  <View className="h-2 w-2 rounded-full bg-emerald-500" />
                </View>
              )}
              <Text className="text-base font-semibold text-white">{item.name}</Text>
            </View>

            {item.description ? (
              <Text className="mt-1 text-sm text-slate-400" numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}

            {hasVariants ? (
              <View className="mt-1.5 flex-row items-center gap-2">
                <Text className="text-base font-bold text-brand">
                  From {formatPrice(lowestVariantPrice, currency)}
                </Text>
                {totalInCart > 0 && (
                  <View className="rounded-full bg-brand/20 px-2 py-0.5">
                    <Text className="text-xs font-bold text-brand">{totalInCart} in cart</Text>
                  </View>
                )}
              </View>
            ) : (
              <>
                <Text className="mt-1.5 text-base font-bold text-brand">
                  {formatPrice(item.price, currency)}
                </Text>
                <QuantityStepper menuItemId={item.id} />
              </>
            )}
          </View>

          {/* Right: Image + Add button */}
          <View className="items-center gap-2">
            {item.imagePath ? (
              <Image
                source={{
                  uri: item.imagePath.startsWith('http')
                    ? item.imagePath
                    : fileAPI.getFullUrl(item.imagePath),
                }}
                className="h-16 w-16 rounded-xl"
                resizeMode="cover"
              />
            ) : null}
            {hasVariants ? (
              <View className="h-11 w-11 items-center justify-center rounded-xl bg-brand/20">
                <MaterialIcons
                  name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                  size={24}
                  color="#F97316"
                />
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => handleAdd()}
                activeOpacity={0.7}
                className={`h-11 w-11 items-center justify-center rounded-xl ${
                  isInCart() ? 'bg-brand' : 'bg-brand/20'
                }`}>
                <MaterialIcons name="add" size={24} color={isInCart() ? '#fff' : '#F97316'} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Variants (shown when expanded) */}
      {hasVariants && expanded && (
        <View className="mt-3 gap-2">
          {item.variants.map((v) => (
            <View
              key={v.id}
              className="flex-row items-center justify-between rounded-xl bg-slate-700/50 px-3 py-2.5">
              <View className="flex-1">
                <Text className="text-sm font-medium text-slate-200">{v.name}</Text>
                <Text className="text-sm font-bold text-brand">
                  {formatPrice(v.price, currency)}
                </Text>
                <QuantityStepper menuItemId={item.id} variantName={v.name} />
              </View>
              <TouchableOpacity
                onPress={() => handleAdd(v.name, v.price)}
                activeOpacity={0.7}
                className={`h-9 w-9 items-center justify-center rounded-lg ${
                  isInCart(v.name) ? 'bg-brand' : 'bg-brand/20'
                }`}>
                <MaterialIcons name="add" size={20} color={isInCart(v.name) ? '#fff' : '#F97316'} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Order Status Color ──────────────────────────────────
function getStatusStyle(status: string): { bg: string; text: string; label: string } {
  switch (status) {
    case 'received':
      return { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Received' };
    case 'preparing':
      return { bg: 'bg-blue-500/15', text: 'text-blue-400', label: 'Preparing' };
    case 'ready':
      return { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Ready' };
    case 'served':
      return { bg: 'bg-slate-500/15', text: 'text-slate-400', label: 'Served' };
    case 'cancelled':
      return { bg: 'bg-red-500/15', text: 'text-red-400', label: 'Cancelled' };
    case 'paid':
      return { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Paid' };
    default:
      return { bg: 'bg-slate-500/15', text: 'text-slate-300', label: status };
  }
}

// ─── Main Screen Content ─────────────────────────────────
function OrderScreenContent() {
  const { slug, table } = useLocalSearchParams<{ slug: string; table: string }>();
  const router = useRouter();
  const cart = useCart();

  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantLogo, setRestaurantLogo] = useState<string | null>(null);
  const [currency, setCurrency] = useState('INR');
  const [menu, setMenu] = useState<FullMenuCategory[]>([]);
  const [session, setSession] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deviceId, setDeviceId] = useState('');

  // Modals
  const [showCart, setShowCart] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // ── Load data ──
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const did = await getDeviceId();
        setDeviceId(did);

        // Check session exists
        const tableInfoRes = await publicAPI.getTableInfo(slug as string, Number(table), did);
        const existingSessionId = tableInfoRes.data.table.existingSessionId;
        if (!existingSessionId) {
          router.replace(ROUTES.ORDER.summary(slug as string, table as string));
          return;
        }

        // Fetch menu
        const menuRes = await publicAPI.getMenu(slug as string);
        setRestaurantName(menuRes.data.restaurant.name);
        setRestaurantLogo(menuRes.data.restaurant.logo || null);
        setCurrency(menuRes.data.restaurant.currency || 'INR');
        setMenu(menuRes.data.menu);

        // Fetch session status via GET (not POST)
        const sessionRes = await publicAPI.getSessionStatus(existingSessionId);
        setSession(sessionRes.data);

        // Fetch existing orders
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
  }, [slug, table, router]);

  // ── Refresh orders ──
  const refreshOrders = useCallback(async () => {
    if (!session?.id) return;
    try {
      const ordersRes = await publicAPI.getSessionOrders(session.id);
      setOrders(ordersRes.data || []);
    } catch (err) {
      console.error('Failed to refresh orders:', err);
    }
  }, [session?.id]);

  // ── Place order ──
  const handlePlaceOrder = async () => {
    if (cart.items.length === 0 || !session?.id) return;
    setPlacing(true);
    setError('');
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
      setOrderSuccess(true);
      await refreshOrders();

      // Auto-hide success after 3s
      setTimeout(() => setOrderSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  // ── Build sections for SectionList ──
  const sections: Section[] = menu
    .filter((cat) => cat.items.some((i) => i.isAvailable !== false))
    .map((cat) => ({
      title: cat.name,
      data: cat.items.filter((i) => i.isAvailable !== false),
    }));

  // ── Loading ──
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900">
        <ActivityIndicator size="large" color="#F97316" />
        <Text className="mt-4 text-slate-400">Loading menu...</Text>
      </View>
    );
  }

  // ── Error (full page) ──
  if (error && !menu.length) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900 px-8">
        <MaterialIcons name="error-outline" size={48} color="#EF4444" />
        <Text className="mt-4 text-center text-lg font-bold text-white">Something went wrong</Text>
        <Text className="mt-2 text-center text-sm text-slate-400">{error}</Text>
        <Button
          title="Retry"
          onPress={() => router.replace(ROUTES.ORDER.menu(slug as string, table as string))}
          variant="secondary"
          className="mt-6"
        />
      </View>
    );
  }

  const activeOrders = orders.filter(
    (o) => o.status !== 'served' && o.status !== 'paid' && o.status !== 'cancelled'
  );

  return (
    <View className="flex-1 bg-slate-900">
      {/* ─── Header ─── */}
      <View className="flex-row items-center justify-between bg-slate-800/80 px-5 pb-4 pt-14">
        <View className="flex-1">
          <Text className="text-lg font-bold text-white" numberOfLines={1}>
            {restaurantName}
          </Text>
          <View className="mt-0.5 flex-row items-center gap-3">
            <Text className="text-sm text-slate-400">Table {table}</Text>
            {session?.joinCode && (
              <View className="flex-row items-center gap-1 rounded-lg bg-brand/15 px-2 py-0.5">
                <MaterialIcons name="share" size={12} color="#F97316" />
                <Text className="text-xs font-bold text-brand">Code: {session.joinCode}</Text>
              </View>
            )}
          </View>
        </View>
        <View className="flex-row gap-2">
          {/* Orders button */}
          <TouchableOpacity
            onPress={() => {
              refreshOrders();
              setShowOrders(true);
            }}
            activeOpacity={0.7}
            className="h-11 w-11 items-center justify-center rounded-full bg-slate-700">
            <MaterialIcons name="receipt-long" size={22} color="#F8FAFC" />
            {activeOrders.length > 0 && (
              <View className="absolute -right-1 -top-1 h-5 w-5 items-center justify-center rounded-full bg-brand">
                <Text className="text-xs font-bold text-white">{activeOrders.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Order Success Banner ─── */}
      {orderSuccess && (
        <View className="flex-row items-center gap-3 border-b border-emerald-500/30 bg-emerald-500/15 px-5 py-3">
          <MaterialIcons name="check-circle" size={20} color="#10B981" />
          <Text className="flex-1 text-sm font-semibold text-emerald-400">
            Order placed! The kitchen has been notified.
          </Text>
        </View>
      )}

      {/* ─── Inline error banner ─── */}
      {error && menu.length > 0 && (
        <View className="flex-row items-center gap-3 border-b border-red-500/30 bg-red-500/10 px-5 py-3">
          <MaterialIcons name="error-outline" size={18} color="#EF4444" />
          <Text className="flex-1 text-sm text-red-400">{error}</Text>
          <TouchableOpacity onPress={() => setError('')}>
            <MaterialIcons name="close" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      )}

      {/* ─── Menu List ─── */}
      {sections.length > 0 ? (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          renderSectionHeader={({ section }) => (
            <View className="bg-slate-900 px-5 pb-2 pt-5">
              <Text className="text-lg font-bold text-white">{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => <MenuItemCard item={item} currency={currency} />}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingBottom: cart.itemCount > 0 ? 100 : 30 }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View className="flex-1 items-center justify-center">
          <MaterialIcons name="restaurant-menu" size={48} color="#475569" />
          <Text className="mt-3 text-base text-slate-500">Menu not available</Text>
        </View>
      )}

      {/* ─── Cart Bar (sticky bottom) ─── */}
      {cart.itemCount > 0 && (
        <TouchableOpacity
          onPress={() => setShowCart(true)}
          activeOpacity={0.85}
          className="absolute bottom-6 left-4 right-4 flex-row items-center justify-between rounded-2xl bg-brand px-5 py-4"
          style={{
            elevation: 8,
            shadowColor: '#F97316',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
          }}>
          <View className="flex-row items-center gap-3">
            <View className="h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <Text className="text-sm font-bold text-white">{cart.itemCount}</Text>
            </View>
            <Text className="text-base font-bold text-white">View Cart</Text>
          </View>
          <Text className="text-lg font-bold text-white">{formatPrice(cart.total, currency)}</Text>
        </TouchableOpacity>
      )}

      {/* ─── Cart Modal ─── */}
      <Modal visible={showCart} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/60">
          <View className="max-h-[85%] rounded-t-3xl border-t border-slate-700 bg-slate-800">
            {/* Cart Header */}
            <View className="flex-row items-center justify-between px-5 pb-3 pt-5">
              <Text className="text-xl font-bold text-white">Your Cart</Text>
              <TouchableOpacity
                onPress={() => setShowCart(false)}
                className="h-10 w-10 items-center justify-center rounded-full bg-slate-700">
                <MaterialIcons name="close" size={22} color="#F8FAFC" />
              </TouchableOpacity>
            </View>

            {/* Cart Items */}
            <ScrollView className="px-5" showsVerticalScrollIndicator={false}>
              {cart.items.map((item, idx) => (
                <View
                  key={`${item.menuItemId}-${item.variantName || ''}`}
                  className="flex-row items-center border-b border-slate-700/50 py-4">
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-white">{item.name}</Text>
                    {item.variantName && (
                      <Text className="text-sm text-slate-400">{item.variantName}</Text>
                    )}
                    <Text className="mt-0.5 text-sm font-bold text-brand">
                      {formatPrice(parseFloat(item.price) * item.quantity, currency)}
                    </Text>
                  </View>

                  {/* Quantity controls */}
                  <View className="flex-row items-center gap-3">
                    <TouchableOpacity
                      onPress={() =>
                        cart.updateQuantity(item.menuItemId, item.quantity - 1, item.variantName)
                      }
                      className="h-9 w-9 items-center justify-center rounded-full bg-slate-700">
                      <MaterialIcons
                        name={item.quantity === 1 ? 'delete-outline' : 'remove'}
                        size={18}
                        color={item.quantity === 1 ? '#EF4444' : '#F97316'}
                      />
                    </TouchableOpacity>
                    <Text className="w-6 text-center text-lg font-bold text-white">
                      {item.quantity}
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        cart.updateQuantity(item.menuItemId, item.quantity + 1, item.variantName)
                      }
                      className="h-9 w-9 items-center justify-center rounded-full bg-slate-700">
                      <MaterialIcons name="add" size={18} color="#F97316" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {/* Clear cart */}
              {cart.items.length > 1 && (
                <TouchableOpacity onPress={cart.clearCart} className="mt-1 py-3">
                  <Text className="text-center text-sm font-medium text-red-400">Clear All</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {/* Cart Footer */}
            <View className="border-t border-slate-700 px-5 pb-8 pt-4">
              <View className="mb-4 flex-row justify-between">
                <Text className="text-base text-slate-300">Total</Text>
                <Text className="text-xl font-bold text-white">
                  {formatPrice(cart.total, currency)}
                </Text>
              </View>
              <Button
                title="Place Order"
                loading={placing}
                onPress={handlePlaceOrder}
                disabled={placing || cart.items.length === 0}
                size="lg"
                icon={<MaterialIcons name="send" size={20} color="#fff" />}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Orders Modal ─── */}
      <Modal visible={showOrders} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/60">
          <View className="max-h-[85%] rounded-t-3xl border-t border-slate-700 bg-slate-800">
            {/* Orders Header */}
            <View className="flex-row items-center justify-between px-5 pb-3 pt-5">
              <Text className="text-xl font-bold text-white">My Orders</Text>
              <View className="flex-row items-center gap-3">
                <TouchableOpacity onPress={refreshOrders}>
                  <MaterialIcons name="refresh" size={22} color="#F97316" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowOrders(false)}
                  className="h-10 w-10 items-center justify-center rounded-full bg-slate-700">
                  <MaterialIcons name="close" size={22} color="#F8FAFC" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Orders List */}
            <ScrollView
              className="px-5"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}>
              {orders.length === 0 ? (
                <View className="items-center py-16">
                  <MaterialIcons name="receipt-long" size={48} color="#475569" />
                  <Text className="mt-3 text-base text-slate-500">No orders yet</Text>
                  <Text className="mt-1 text-sm text-slate-600">
                    Add items from the menu to get started
                  </Text>
                </View>
              ) : (
                orders.map((order: any) => {
                  const statusStyle = getStatusStyle(order.status || 'received');
                  const orderTotal =
                    order.items?.reduce(
                      (sum: number, oi: any) =>
                        sum + parseFloat(oi.priceAtOrder || '0') * (oi.quantity || 1),
                      0
                    ) || 0;

                  return (
                    <View key={order.id} className="mb-3 rounded-2xl bg-slate-700/40 p-4">
                      {/* Order header */}
                      <View className="mb-3 flex-row items-center justify-between">
                        <Text className="text-base font-bold text-white">#{order.orderNumber}</Text>
                        <View className={`rounded-full px-3 py-1 ${statusStyle.bg}`}>
                          <Text className={`text-xs font-bold ${statusStyle.text}`}>
                            {statusStyle.label}
                          </Text>
                        </View>
                      </View>

                      {/* Order items */}
                      {order.items?.map((oi: any, idx: number) => (
                        <View key={idx} className="flex-row justify-between py-1.5">
                          <Text className="flex-1 text-sm text-slate-300">
                            {oi.quantity}× {oi.itemName}
                            {oi.variantName ? ` (${oi.variantName})` : ''}
                          </Text>
                          <Text className="text-sm text-slate-400">
                            {formatPrice(
                              parseFloat(oi.priceAtOrder || '0') * (oi.quantity || 1),
                              currency
                            )}
                          </Text>
                        </View>
                      ))}

                      {/* Order total */}
                      <View className="mt-2 flex-row justify-between border-t border-slate-600/50 pt-2.5">
                        <Text className="text-sm font-medium text-slate-400">Total</Text>
                        <Text className="text-sm font-bold text-white">
                          {formatPrice(orderTotal, currency)}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Wrapped with CartProvider ───────────────────────────
export default function MenuScreen() {
  return (
    <CartProvider>
      <OrderScreenContent />
    </CartProvider>
  );
}
