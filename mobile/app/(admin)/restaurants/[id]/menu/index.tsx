import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { menuAPI, type MenuCategory, type MenuItem } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Switch } from '@/components/ui/Switch';
import { MaterialIcons } from '@expo/vector-icons';

export default function MenuScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<Record<number, MenuItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  const restaurantId = Number(id);

  const fetchMenu = useCallback(async () => {
    try {
      setLoading(true);
      const catRes = await menuAPI.getCategories(restaurantId);
      const cats = catRes.data || [];
      setCategories(cats);

      if (cats.length > 0 && !selectedCategory) {
        setSelectedCategory(cats[0].id);
      }

      // Fetch items for all categories
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

  const currentItems = selectedCategory ? items[selectedCategory] || [] : [];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 bg-black">
        <View className="flex-row justify-between items-center p-4">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity onPress={() => router.back()}>
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text className="text-white text-xl font-bold">Menu</Text>
          </View>
          <View className="flex-row gap-2">
            <Button
              title="+ Category"
              onPress={() => router.push(`/(admin)/restaurants/${id}/menu/category-form` as any)}
              className="bg-gray-700 rounded-lg px-3 py-2"
            />
            <Button
              title="+ Item"
              onPress={() => router.push(`/(admin)/restaurants/${id}/menu/item-form` as any)}
              className="bg-red-600 rounded-lg px-3 py-2"
            />
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#dc2626" />
        ) : categories.length === 0 ? (
          <View className="flex-1 justify-center items-center">
            <MaterialIcons name="restaurant-menu" size={64} color="#374151" />
            <Text className="text-gray-400 text-lg mt-4">No menu categories yet</Text>
            <Button
              title="Add Category"
              onPress={() => router.push(`/(admin)/restaurants/${id}/menu/category-form` as any)}
              className="mt-4 bg-red-600"
            />
          </View>
        ) : (
          <>
            <Tabs defaultValue={String(categories[0]?.id || '')}>
              <TabsList>
                {categories.map((cat) => (
                  <TabsTrigger
                    key={cat.id}
                    value={String(cat.id)}
                    onPress={() => setSelectedCategory(cat.id)}
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
                    renderItem={({ item }) => (
                      <Card className="mb-3">
                        <CardContent>
                          <View className="flex-row justify-between items-center">
                            <View className="flex-1">
                              <View className="flex-row items-center gap-2">
                                <Text className="text-white font-bold text-base">{item.name}</Text>
                                {item.isVeg && (
                                  <Badge variant="success">Veg</Badge>
                                )}
                              </View>
                              {item.description && (
                                <Text className="text-gray-400 text-sm mt-1" numberOfLines={2}>
                                  {item.description}
                                </Text>
                              )}
                              <Text className="text-red-500 font-semibold mt-1">
                                ${item.price}
                              </Text>
                            </View>
                            <View className="items-end gap-2">
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
                              >
                                <MaterialIcons name="edit" size={20} color="#6b7280" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </CardContent>
                      </Card>
                    )}
                    ListEmptyComponent={
                      <Text className="text-gray-500 text-center py-8">
                        No items in this category
                      </Text>
                    }
                  />
                </TabsContent>
              ))}
            </Tabs>
          </>
        )}
      </View>
    </>
  );
}
