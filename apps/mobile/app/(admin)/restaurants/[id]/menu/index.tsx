import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { menuAPI, type MenuCategory, type MenuItem } from '@/lib/api';
import { fileAPI } from '@/lib/api/file';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Switch } from '@/components/ui/Switch';
import { formatPrice } from '@menugo/dto';
import { restaurantAPI } from '@/lib/api';
import { MaterialIcons } from '@expo/vector-icons';

export default function MenuScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<Record<number, MenuItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [currency, setCurrency] = useState('INR');

  const restaurantId = Number(id);

  // Fetch restaurant currency
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
          itemMap[cat.id] = itemRes.data || [];
        } catch {
          itemMap[cat.id] = [];
        }
      }
      setItems(itemMap);
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

  const handleToggleAvailability = async (itemId: number) => {
    try {
      await menuAPI.toggleAvailability(restaurantId, itemId);
      fetchMenu();
    } catch (error) {
      console.error('Toggle failed:', error);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 bg-slate-900">
        <View className="flex-row items-center justify-between px-5 py-4">
          <View className="flex-row items-center gap-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-xl bg-slate-800">
              <MaterialIcons name="arrow-back" size={22} color="#F8FAFC" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-white">Menu</Text>
          </View>
          <View className="flex-row gap-2">
            <Button
              title="+ Category"
              size="sm"
              variant="secondary"
              onPress={() => router.push(`/(admin)/restaurants/${id}/menu/category-form` as any)}
            />
            <Button
              title="+ Item"
              size="sm"
              onPress={() => router.push(`/(admin)/restaurants/${id}/menu/item-form` as any)}
            />
          </View>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#F97316" />
          </View>
        ) : categories.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-slate-800">
              <MaterialIcons name="restaurant-menu" size={40} color="#64748B" />
            </View>
            <Text className="text-lg font-medium text-slate-400">No menu categories yet</Text>
            <Button
              title="Add Category"
              onPress={() => router.push(`/(admin)/restaurants/${id}/menu/category-form` as any)}
              className="mt-5"
            />
          </View>
        ) : (
          <Tabs defaultValue={String(categories[0]?.id || '')}>
            <TabsList>
              {categories.map((cat) => (
                <TabsTrigger
                  key={cat.id}
                  value={String(cat.id)}
                  onPressIn={() => setSelectedCategory(cat.id)}>
                  <Text>{cat.name}</Text>
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map((cat) => (
              <TabsContent key={cat.id} value={String(cat.id)}>
                <FlatList
                  data={items[cat.id] || []}
                  keyExtractor={(item) => String(item.id)}
                  contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
                  renderItem={({ item }) => (
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
                              <Text className="text-base font-bold text-white">{item.name}</Text>
                              {item.isVeg && <Badge variant="success">Veg</Badge>}
                            </View>
                            {item.description && (
                              <Text className="mt-1 text-sm text-slate-400" numberOfLines={2}>
                                {item.description}
                              </Text>
                            )}
                            <Text className="mt-1.5 font-semibold text-brand">
                              {item.hasVariants
                                ? `From ${formatPrice(item.price, currency)}`
                                : formatPrice(item.price, currency)}
                            </Text>
                            {item.hasVariants && (
                              <Text className="text-xs text-slate-500">Has variants</Text>
                            )}
                          </View>
                          <View className="items-end gap-3">
                            <Switch
                              checked={item.isAvailable ?? true}
                              onCheckedChange={() => handleToggleAvailability(item.id)}
                            />
                            <TouchableOpacity
                              onPress={() =>
                                router.push(
                                  `/(admin)/restaurants/${id}/menu/item-form?itemId=${item.id}` as any
                                )
                              }
                              className="h-9 w-9 items-center justify-center rounded-lg bg-slate-700">
                              <MaterialIcons name="edit" size={18} color="#94A3B8" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </CardContent>
                    </Card>
                  )}
                  ListEmptyComponent={
                    <Text className="py-10 text-center text-slate-500">
                      No items in this category
                    </Text>
                  }
                />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </View>
    </>
  );
}
