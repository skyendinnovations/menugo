import { View, Text, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState } from 'react';
import { tableAPI } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';

export default function CreateTable() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [singleNumber, setSingleNumber] = useState('');
  const [singleCapacity, setSingleCapacity] = useState('4');
  const [bulkFrom, setBulkFrom] = useState('');
  const [bulkTo, setBulkTo] = useState('');
  const [bulkCapacity, setBulkCapacity] = useState('4');

  const restaurantId = Number(id);

  const handleCreateSingle = async () => {
    if (!singleNumber) {
      setError('Table number is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await tableAPI.create(restaurantId, Number(singleNumber), Number(singleCapacity) || 4);
      router.back();
    } catch (err: any) {
      setError(err.message || 'Failed to create table');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBulk = async () => {
    if (!bulkFrom || !bulkTo) {
      setError('From and To are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await tableAPI.bulkCreate(
        restaurantId,
        Number(bulkFrom),
        Number(bulkTo),
        Number(bulkCapacity) || 4
      );
      router.back();
    } catch (err: any) {
      setError(err.message || 'Failed to create tables');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Add Tables' }} />
      <ScrollView className="flex-1 bg-black p-4">
        {error ? <Alert variant="destructive" description={error} className="mb-4" /> : null}

        <Tabs defaultValue="single">
          <TabsList>
            <TabsTrigger value="single"><Text>Single</Text></TabsTrigger>
            <TabsTrigger value="bulk"><Text>Bulk</Text></TabsTrigger>
          </TabsList>

          <TabsContent value="single">
            <View className="gap-4">
              <View>
                <Label required>Table Number</Label>
                <Input
                  value={singleNumber}
                  onChangeText={setSingleNumber}
                  placeholder="e.g. 1"
                  keyboardType="numeric"
                />
              </View>
              <View>
                <Label>Capacity</Label>
                <Input
                  value={singleCapacity}
                  onChangeText={setSingleCapacity}
                  placeholder="4"
                  keyboardType="numeric"
                />
              </View>
              <Button
                title={loading ? 'Creating...' : 'Create Table'}
                onPress={handleCreateSingle}
                disabled={loading}
                className="bg-red-600"
              />
            </View>
          </TabsContent>

          <TabsContent value="bulk">
            <View className="gap-4">
              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Label required>From</Label>
                  <Input
                    value={bulkFrom}
                    onChangeText={setBulkFrom}
                    placeholder="1"
                    keyboardType="numeric"
                  />
                </View>
                <View className="flex-1">
                  <Label required>To</Label>
                  <Input
                    value={bulkTo}
                    onChangeText={setBulkTo}
                    placeholder="20"
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <View>
                <Label>Capacity (all)</Label>
                <Input
                  value={bulkCapacity}
                  onChangeText={setBulkCapacity}
                  placeholder="4"
                  keyboardType="numeric"
                />
              </View>
              <Button
                title={loading ? 'Creating...' : 'Create Tables'}
                onPress={handleCreateBulk}
                disabled={loading}
                className="bg-red-600"
              />
            </View>
          </TabsContent>
        </Tabs>
      </ScrollView>
    </>
  );
}
