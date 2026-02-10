import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { restaurantAPI, tableAPI, type Restaurant } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Textarea } from '@/components/ui/Textarea';
import { MaterialIcons } from '@expo/vector-icons';

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <View className="flex-row justify-center items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          className={`h-2 rounded-full ${
            i === current ? 'w-8 bg-red-600' : i < current ? 'w-2 bg-red-600' : 'w-2 bg-gray-700'
          }`}
        />
      ))}
    </View>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <View className="flex-1 justify-center items-center px-6">
      <MaterialIcons name="restaurant-menu" size={80} color="#dc2626" />
      <Text className="text-white text-3xl font-bold mt-6 text-center">
        Welcome to MenuGo!
      </Text>
      <Text className="text-gray-400 text-base mt-4 text-center leading-6">
        Manage your restaurant's menus, tables, orders, and staff — all in one place.
      </Text>
      <Text className="text-gray-500 text-sm mt-6 text-center">
        Let's set up your first restaurant to get started.
      </Text>
      <Button
        title="Get Started"
        onPress={onNext}
        className="bg-red-600 mt-10 w-full"
      />
    </View>
  );
}

function RestaurantDetailsStep({
  onNext,
  onBack,
}: {
  onNext: (restaurant: Restaurant) => void;
  onBack: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
  });

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setError('Restaurant name is required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await restaurantAPI.create({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        address: form.address.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
      });
      onNext(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to create restaurant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
      <View className="flex-row items-center mb-6">
        <TouchableOpacity onPress={onBack} className="mr-3 p-1">
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="text-white text-2xl font-bold">Restaurant Details</Text>
      </View>

      {error ? <Alert variant="destructive" description={error} className="mb-4" /> : null}

      <View className="gap-4">
        <View>
          <Label required>Restaurant Name</Label>
          <Input
            value={form.name}
            onChangeText={(name) => setForm((p) => ({ ...p, name }))}
            placeholder="Enter restaurant name"
          />
        </View>

        <View>
          <Label>Description</Label>
          <Textarea
            value={form.description}
            onChangeText={(description) => setForm((p) => ({ ...p, description }))}
            placeholder="Brief description"
          />
        </View>

        <View>
          <Label>Address</Label>
          <Input
            value={form.address}
            onChangeText={(address) => setForm((p) => ({ ...p, address }))}
            placeholder="Restaurant address"
          />
        </View>

        <View>
          <Label>Phone</Label>
          <Input
            value={form.phone}
            onChangeText={(phone) => setForm((p) => ({ ...p, phone }))}
            placeholder="Phone number"
            keyboardType="phone-pad"
          />
        </View>

        <View>
          <Label>Email</Label>
          <Input
            value={form.email}
            onChangeText={(email) => setForm((p) => ({ ...p, email }))}
            placeholder="Contact email"
            keyboardType="email-address"
          />
        </View>

        <Button
          title={loading ? 'Creating...' : 'Next'}
          onPress={handleCreate}
          disabled={loading}
          className="bg-red-600 mt-4 mb-8"
        />
      </View>
    </ScrollView>
  );
}

function TableSetupStep({
  restaurant,
  onNext,
}: {
  restaurant: Restaurant;
  onNext: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [from, setFrom] = useState('1');
  const [to, setTo] = useState('10');
  const [capacity, setCapacity] = useState('4');

  const handleCreate = async () => {
    const fromNum = parseInt(from, 10);
    const toNum = parseInt(to, 10);
    const capNum = parseInt(capacity, 10);

    if (isNaN(fromNum) || isNaN(toNum) || fromNum < 1 || toNum < fromNum) {
      setError('Please enter valid table numbers (From must be less than To)');
      return;
    }
    if (isNaN(capNum) || capNum < 1) {
      setError('Please enter a valid capacity');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await tableAPI.bulkCreate(restaurant.id, fromNum, toNum, capNum);
      onNext();
    } catch (err: any) {
      setError(err.message || 'Failed to create tables');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
      <Text className="text-white text-2xl font-bold mb-6">Table Setup</Text>

      <Text className="text-gray-400 text-sm mb-6">
        Create tables for your restaurant. You can always add more later.
      </Text>

      {error ? <Alert variant="destructive" description={error} className="mb-4" /> : null}

      <View className="gap-4">
        <View className="flex-row gap-4">
          <View className="flex-1">
            <Label required>From Table #</Label>
            <Input
              value={from}
              onChangeText={setFrom}
              placeholder="1"
              keyboardType="number-pad"
            />
          </View>
          <View className="flex-1">
            <Label required>To Table #</Label>
            <Input
              value={to}
              onChangeText={setTo}
              placeholder="10"
              keyboardType="number-pad"
            />
          </View>
        </View>

        <View>
          <Label required>Capacity per Table</Label>
          <Input
            value={capacity}
            onChangeText={setCapacity}
            placeholder="4"
            keyboardType="number-pad"
          />
        </View>

        <View className="flex-row gap-3 mt-4 mb-8">
          <Button
            title="Skip"
            onPress={onNext}
            className="flex-1 bg-gray-800"
          />
          <Button
            title={loading ? 'Creating...' : 'Create Tables'}
            onPress={handleCreate}
            disabled={loading}
            className="flex-1 bg-red-600"
          />
        </View>
      </View>
    </ScrollView>
  );
}

function CompleteStep({ restaurant }: { restaurant: Restaurant }) {
  const router = useRouter();

  return (
    <View className="flex-1 justify-center items-center px-6">
      <MaterialIcons name="check-circle" size={80} color="#16a34a" />
      <Text className="text-white text-3xl font-bold mt-6 text-center">
        You're all set!
      </Text>
      <Text className="text-gray-400 text-base mt-4 text-center">
        Your restaurant "{restaurant.name}" has been created successfully.
      </Text>

      <View className="w-full gap-3 mt-10">
        <Button
          title="Go to Dashboard"
          onPress={() => router.replace(`/(admin)/restaurants/${restaurant.id}` as any)}
          className="bg-red-600"
        />
        <Button
          title="Set up Menu"
          onPress={() => router.replace(`/(admin)/restaurants/${restaurant.id}/menu` as any)}
          className="bg-gray-800"
        />
        <Button
          title="Invite Staff"
          onPress={() => router.replace(`/(admin)/restaurants/${restaurant.id}/members/invite` as any)}
          className="bg-gray-800"
        />
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);

  const handleRestaurantCreated = (r: Restaurant) => {
    setRestaurant(r);
    setStep(2);
  };

  const handleTablesComplete = () => {
    setStep(3);
  };

  return (
    <View className="flex-1 bg-black pt-4">
      <ProgressDots current={step} total={4} />

      {step === 0 && <WelcomeStep onNext={() => setStep(1)} />}

      {step === 1 && (
        <RestaurantDetailsStep
          onNext={handleRestaurantCreated}
          onBack={() => setStep(0)}
        />
      )}

      {step === 2 && restaurant && (
        <TableSetupStep
          restaurant={restaurant}
          onNext={handleTablesComplete}
        />
      )}

      {step === 3 && restaurant && <CompleteStep restaurant={restaurant} />}
    </View>
  );
}
