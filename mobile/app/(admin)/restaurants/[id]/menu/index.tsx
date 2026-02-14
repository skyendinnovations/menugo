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
import { formatPrice } from '@/lib/utils/currency';
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

  useFocusEffect(useCallback(() => { fetchMenu(); }, [fetchMenu]));

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
        <View className="flex-row justify-between items-center px-5 py-4">
          <View className="flex-row items-center gap-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-xl bg-slate-800 items-center justify-center"
            >
              <MaterialIcons name="arrow-back" size={22} color="#F8FAFC" />
            </TouchableOpacity>
            <Text className="text-white text-xl font-bold">Menu</Text>
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
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#F97316" />
          </View>
        ) : categories.length === 0 ? (
          <View className="flex-1 justify-center items-center px-6">
            <View className="w-20 h-20 rounded-full bg-slate-800 items-center justify-center mb-4">
              <MaterialIcons name="restaurant-menu" size={40} color="#64748B" />
            </View>
            <Text className="text-slate-400 text-lg font-medium">No menu categories yet</Text>
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
                  onPressIn={() => setSelectedCategory(cat.id)}
                >
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
                        <View className="flex-row justify-between items-center">
                          {item.imagePath ? (
                            <Image
                              source={{ uri: item.imagePath.startsWith('http') ? item.imagePath : fileAPI.getFullUrl(item.imagePath) }}
                              className="w-14 h-14 rounded-xl mr-3"
                              resizeMode="cover"
                            />
                          ) : null}
                          <View className="flex-1 mr-4">
                            <View className="flex-row items-center gap-2">
                              <Text className="text-white font-bold text-base">{item.name}</Text>
                              {item.isVeg && <Badge variant="success">Veg</Badge>}
                            </View>
                            {item.description && (
                              <Text className="text-slate-400 text-sm mt-1" numberOfLines={2}>
                                {item.description}
                              </Text>
                            )}
                            <Text className="text-brand font-semibold mt-1.5">
                              {item.hasVariants ? `From ${formatPrice(item.price, currency)}` : formatPrice(item.price, currency)}
                            </Text>
                            {item.hasVariants && (
                              <Text className="text-slate-500 text-xs">Has variants</Text>
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
                              className="w-9 h-9 rounded-lg bg-slate-700 items-center justify-center"
                            >
                              <MaterialIcons name="edit" size={18} color="#94A3B8" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </CardContent>
                    </Card>
                  )}
                  ListEmptyComponent={
                    <Text className="text-slate-500 text-center py-10">No items in this category</Text>
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
