import {
  View,
  Text,
  ScrollView,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { publicAPI, type FullMenuCategory } from '@/lib/api';
import type { MenuItem, MenuItemVariant } from '@/lib/api/menu';
import { getDeviceId } from '@/lib/utils/device-id';
import { CartProvider, useCart } from '@/lib/context/CartContext';
import { Button } from '@/components/ui/Button';
import { formatPrice, getCurrencySymbol } from '@/lib/utils/currency';
import { MaterialIcons } from '@expo/vector-icons';

// ─── Types ───────────────────────────────────────────────
type MenuItemWithVariants = MenuItem & { variants: MenuItemVariant[] };

type Section = {
  title: string;
  data: MenuItemWithVariants[];
};

// ─── Quantity Stepper (inline +/- on each item) ──────────
function QuantityStepper({ menuItemId, variantName }: { menuItemId: number; variantName?: string }) {
  const cart = useCart();
  const qty = cart.items.find(
    (i) => i.menuItemId === menuItemId && (i.variantName || '') === (variantName || '')
  )?.quantity || 0;

  if (qty === 0) return null;

  return (
    <View className="flex-row items-center gap-2 mt-2">
      <TouchableOpacity
        onPress={() => cart.updateQuantity(menuItemId, qty - 1, variantName)}
        activeOpacity={0.7}
        className="w-8 h-8 rounded-full bg-slate-700 items-center justify-center"
      >
        <MaterialIcons name="remove" size={18} color="#F97316" />
      </TouchableOpacity>
      <Text className="text-white font-bold text-base w-6 text-center">{qty}</Text>
      <TouchableOpacity
        onPress={() => cart.updateQuantity(menuItemId, qty + 1, variantName)}
        activeOpacity={0.7}
        className="w-8 h-8 rounded-full bg-slate-700 items-center justify-center"
      >
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
    <View className="bg-slate-800 rounded-2xl px-4 py-4 mb-3 mx-4">
      <TouchableOpacity
        activeOpacity={hasVariants ? 0.7 : 1}
        onPress={() => hasVariants && setExpanded(!expanded)}
      >
        <View className="flex-row justify-between">
          {/* Left: Info */}
          <View className="flex-1 mr-3">
            <View className="flex-row items-center gap-2">
              {item.isVeg && (
                <View className="w-4 h-4 border border-emerald-500 rounded-sm items-center justify-center">
                  <View className="w-2 h-2 bg-emerald-500 rounded-full" />
                </View>
              )}
              <Text className="text-white font-semibold text-base">{item.name}</Text>
            </View>

            {item.description ? (
              <Text className="text-slate-400 text-sm mt-1" numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}

            {hasVariants ? (
              <View className="flex-row items-center gap-2 mt-1.5">
                <Text className="text-brand font-bold text-base">
                  From {formatPrice(lowestVariantPrice, currency)}
                </Text>
                {totalInCart > 0 && (
                  <View className="bg-brand/20 rounded-full px-2 py-0.5">
                    <Text className="text-brand text-xs font-bold">{totalInCart} in cart</Text>
                  </View>
                )}
              </View>
            ) : (
              <>
                <Text className="text-brand font-bold text-base mt-1.5">{formatPrice(item.price, currency)}</Text>
                <QuantityStepper menuItemId={item.id} />
              </>
            )}
          </View>

          {/* Right: Add button (for non-variant items) or expand arrow (for variant items) */}
          {hasVariants ? (
            <View className="w-11 h-11 rounded-xl items-center justify-center self-start bg-brand/20">
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
              className={`w-11 h-11 rounded-xl items-center justify-center self-start ${
                isInCart() ? 'bg-brand' : 'bg-brand/20'
              }`}
            >
              <MaterialIcons name="add" size={24} color={isInCart() ? '#fff' : '#F97316'} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>

      {/* Variants (shown when expanded) */}
      {hasVariants && expanded && (
        <View className="mt-3 gap-2">
          {item.variants.map((v) => (
            <View
              key={v.id}
              className="flex-row items-center justify-between bg-slate-700/50 rounded-xl px-3 py-2.5"
            >
              <View className="flex-1">
                <Text className="text-slate-200 text-sm font-medium">{v.name}</Text>
                <Text className="text-brand text-sm font-bold">{formatPrice(v.price, currency)}</Text>
                <QuantityStepper menuItemId={item.id} variantName={v.name} />
              </View>
              <TouchableOpacity
                onPress={() => handleAdd(v.name, v.price)}
                activeOpacity={0.7}
                className={`w-9 h-9 rounded-lg items-center justify-center ${
                  isInCart(v.name) ? 'bg-brand' : 'bg-brand/20'
                }`}
              >
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
        if (!tableInfoRes.data.table.existingSessionId) {
          router.replace(`/order/${slug}/${table}`);
          return;
        }

        // Fetch menu
        const menuRes = await publicAPI.getMenu(slug as string);
        setRestaurantName(menuRes.data.restaurant.name);
        setRestaurantLogo(menuRes.data.restaurant.logo || null);
        setCurrency(menuRes.data.restaurant.currency || 'INR');
        setMenu(menuRes.data.menu);

        // Fetch session
        const sessionRes = await publicAPI.createOrGetSession(slug as string, Number(table), did);
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
      <View className="flex-1 bg-slate-900 justify-center items-center">
        <ActivityIndicator size="large" color="#F97316" />
        <Text className="text-slate-400 mt-4">Loading menu...</Text>
      </View>
    );
  }

  // ── Error (full page) ──
  if (error && !menu.length) {
    return (
      <View className="flex-1 bg-slate-900 justify-center items-center px-8">
        <MaterialIcons name="error-outline" size={48} color="#EF4444" />
        <Text className="text-white text-lg font-bold mt-4 text-center">Something went wrong</Text>
        <Text className="text-slate-400 text-sm mt-2 text-center">{error}</Text>
        <Button title="Retry" onPress={() => router.replace(`/order/${slug}/${table}/menu`)} variant="secondary" className="mt-6" />
      </View>
    );
  }

  const activeOrders = orders.filter(
    (o) => o.status !== 'served' && o.status !== 'paid' && o.status !== 'cancelled'
  );

  return (
    <View className="flex-1 bg-slate-900">
      {/* ─── Header ─── */}
      <View className="bg-slate-800/80 px-5 pt-14 pb-4 flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-white text-lg font-bold" numberOfLines={1}>
            {restaurantName}
          </Text>
          <View className="flex-row items-center gap-3 mt-0.5">
            <Text className="text-slate-400 text-sm">Table {table}</Text>
            {session?.joinCode && (
              <View className="flex-row items-center gap-1 bg-brand/15 rounded-lg px-2 py-0.5">
                <MaterialIcons name="share" size={12} color="#F97316" />
                <Text className="text-brand text-xs font-bold">Code: {session.joinCode}</Text>
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
            className="w-11 h-11 rounded-full bg-slate-700 items-center justify-center"
          >
            <MaterialIcons name="receipt-long" size={22} color="#F8FAFC" />
            {activeOrders.length > 0 && (
              <View className="absolute -top-1 -right-1 bg-brand rounded-full w-5 h-5 items-center justify-center">
                <Text className="text-white text-xs font-bold">{activeOrders.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Order Success Banner ─── */}
      {orderSuccess && (
        <View className="bg-emerald-500/15 border-b border-emerald-500/30 px-5 py-3 flex-row items-center gap-3">
          <MaterialIcons name="check-circle" size={20} color="#10B981" />
          <Text className="text-emerald-400 text-sm font-semibold flex-1">
            Order placed! The kitchen has been notified.
          </Text>
        </View>
      )}

      {/* ─── Inline error banner ─── */}
      {error && menu.length > 0 && (
        <View className="bg-red-500/10 border-b border-red-500/30 px-5 py-3 flex-row items-center gap-3">
          <MaterialIcons name="error-outline" size={18} color="#EF4444" />
          <Text className="text-red-400 text-sm flex-1">{error}</Text>
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
            <View className="bg-slate-900 px-5 pt-5 pb-2">
              <Text className="text-white text-lg font-bold">{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => <MenuItemCard item={item} currency={currency} />}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingBottom: cart.itemCount > 0 ? 100 : 30 }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View className="flex-1 justify-center items-center">
          <MaterialIcons name="restaurant-menu" size={48} color="#475569" />
          <Text className="text-slate-500 mt-3 text-base">Menu not available</Text>
        </View>
      )}

      {/* ─── Cart Bar (sticky bottom) ─── */}
      {cart.itemCount > 0 && (
        <TouchableOpacity
          onPress={() => setShowCart(true)}
          activeOpacity={0.85}
          className="absolute bottom-6 left-4 right-4 bg-brand rounded-2xl px-5 py-4 flex-row items-center justify-between"
          style={{ elevation: 8, shadowColor: '#F97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}
        >
          <View className="flex-row items-center gap-3">
            <View className="bg-white/20 rounded-full w-8 h-8 items-center justify-center">
              <Text className="text-white font-bold text-sm">{cart.itemCount}</Text>
            </View>
            <Text className="text-white font-bold text-base">View Cart</Text>
          </View>
          <Text className="text-white font-bold text-lg">{formatPrice(cart.total, currency)}</Text>
        </TouchableOpacity>
      )}

      {/* ─── Cart Modal ─── */}
      <Modal visible={showCart} animationType="slide" transparent>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-slate-800 border-t border-slate-700 rounded-t-3xl max-h-[85%]">
            {/* Cart Header */}
            <View className="flex-row justify-between items-center px-5 pt-5 pb-3">
              <Text className="text-white text-xl font-bold">Your Cart</Text>
              <TouchableOpacity
                onPress={() => setShowCart(false)}
                className="w-10 h-10 rounded-full bg-slate-700 items-center justify-center"
              >
                <MaterialIcons name="close" size={22} color="#F8FAFC" />
              </TouchableOpacity>
            </View>

            {/* Cart Items */}
            <ScrollView className="px-5" showsVerticalScrollIndicator={false}>
              {cart.items.map((item, idx) => (
                <View
                  key={`${item.menuItemId}-${item.variantName || ''}`}
                  className="flex-row items-center py-4 border-b border-slate-700/50"
                >
                  <View className="flex-1">
                    <Text className="text-white font-semibold text-base">
                      {item.name}
                    </Text>
                    {item.variantName && (
                      <Text className="text-slate-400 text-sm">{item.variantName}</Text>
                    )}
                    <Text className="text-brand font-bold text-sm mt-0.5">
                      {formatPrice(parseFloat(item.price) * item.quantity, currency)}
                    </Text>
                  </View>

                  {/* Quantity controls */}
                  <View className="flex-row items-center gap-3">
                    <TouchableOpacity
                      onPress={() =>
                        cart.updateQuantity(item.menuItemId, item.quantity - 1, item.variantName)
                      }
                      className="w-9 h-9 rounded-full bg-slate-700 items-center justify-center"
                    >
                      <MaterialIcons
                        name={item.quantity === 1 ? 'delete-outline' : 'remove'}
                        size={18}
                        color={item.quantity === 1 ? '#EF4444' : '#F97316'}
                      />
                    </TouchableOpacity>
                    <Text className="text-white font-bold text-lg w-6 text-center">
                      {item.quantity}
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        cart.updateQuantity(item.menuItemId, item.quantity + 1, item.variantName)
                      }
                      className="w-9 h-9 rounded-full bg-slate-700 items-center justify-center"
                    >
                      <MaterialIcons name="add" size={18} color="#F97316" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {/* Clear cart */}
              {cart.items.length > 1 && (
                <TouchableOpacity onPress={cart.clearCart} className="py-3 mt-1">
                  <Text className="text-red-400 text-sm text-center font-medium">Clear All</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {/* Cart Footer */}
            <View className="px-5 pt-4 pb-8 border-t border-slate-700">
              <View className="flex-row justify-between mb-4">
                <Text className="text-slate-300 text-base">Total</Text>
                <Text className="text-white text-xl font-bold">{formatPrice(cart.total, currency)}</Text>
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
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-slate-800 border-t border-slate-700 rounded-t-3xl max-h-[85%]">
            {/* Orders Header */}
            <View className="flex-row justify-between items-center px-5 pt-5 pb-3">
              <Text className="text-white text-xl font-bold">My Orders</Text>
              <View className="flex-row items-center gap-3">
                <TouchableOpacity onPress={refreshOrders}>
                  <MaterialIcons name="refresh" size={22} color="#F97316" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowOrders(false)}
                  className="w-10 h-10 rounded-full bg-slate-700 items-center justify-center"
                >
                  <MaterialIcons name="close" size={22} color="#F8FAFC" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Orders List */}
            <ScrollView className="px-5" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              {orders.length === 0 ? (
                <View className="items-center py-16">
                  <MaterialIcons name="receipt-long" size={48} color="#475569" />
                  <Text className="text-slate-500 mt-3 text-base">No orders yet</Text>
                  <Text className="text-slate-600 text-sm mt-1">Add items from the menu to get started</Text>
                </View>
              ) : (
                orders.map((order: any) => {
                  const statusStyle = getStatusStyle(order.status || 'received');
                  const orderTotal = order.items?.reduce(
                    (sum: number, oi: any) => sum + parseFloat(oi.priceAtOrder || '0') * (oi.quantity || 1),
                    0
                  ) || 0;

                  return (
                    <View key={order.id} className="bg-slate-700/40 rounded-2xl p-4 mb-3">
                      {/* Order header */}
                      <View className="flex-row justify-between items-center mb-3">
                        <Text className="text-white font-bold text-base">#{order.orderNumber}</Text>
                        <View className={`px-3 py-1 rounded-full ${statusStyle.bg}`}>
                          <Text className={`text-xs font-bold ${statusStyle.text}`}>
                            {statusStyle.label}
                          </Text>
                        </View>
                      </View>

                      {/* Order items */}
                      {order.items?.map((oi: any, idx: number) => (
                        <View key={idx} className="flex-row justify-between py-1.5">
                          <Text className="text-slate-300 text-sm flex-1">
                            {oi.quantity}× {oi.itemName}
                            {oi.variantName ? ` (${oi.variantName})` : ''}
                          </Text>
                          <Text className="text-slate-400 text-sm">
                            {formatPrice(parseFloat(oi.priceAtOrder || '0') * (oi.quantity || 1), currency)}
                          </Text>
                        </View>
                      ))}

                      {/* Order total */}
                      <View className="flex-row justify-between pt-2.5 mt-2 border-t border-slate-600/50">
                        <Text className="text-slate-400 text-sm font-medium">Total</Text>
                        <Text className="text-white text-sm font-bold">{formatPrice(orderTotal, currency)}</Text>
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
