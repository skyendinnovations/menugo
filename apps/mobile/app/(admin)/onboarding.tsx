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
import { ROUTES } from '@/lib/routes';

function ProgressDots({ current, total }: { readonly current: number; readonly total: number }) {
  return (
    <View className="flex-row justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => {
        const getDotStyle = () => {
          if (i === current) return 'w-8 bg-brand';
          if (i < current) return 'w-2 bg-brand';
          return 'w-2 bg-gray-300';
        };
        return <View key={`dot-${i}`} className={`h-2 rounded-full ${getDotStyle()}`} />;
      })}
    </View>
  );
}

function WelcomeStep({ onNext }: { readonly onNext: () => void }) {
  return (
    <View className="flex-1 justify-between p-6">
      <View className="mb-8 h-28 w-28 items-center justify-center rounded-full bg-brand/15">
        <MaterialIcons name="restaurant-menu" size={56} color="#DC2626" />
      </View>
      <Text className="text-center text-3xl font-bold text-black">Welcome to MenuGo!</Text>
      <Text className="mt-4 text-center text-base leading-6 text-gray-600">
        Manage your restaurant&apos;s menus, tables, orders, and staff — all in one place.
      </Text>
      <Text className="mt-6 text-center text-sm text-gray-500">
        Let&apos;s set up your first restaurant to get started.
      </Text>
      <Button title="Get Started" onPress={onNext} size="lg" className="mt-10 w-full" />
    </View>
  );
}

function RestaurantDetailsStep({
  onNext,
  onBack,
}: {
  readonly onNext: (restaurant: Restaurant) => void;
  readonly onBack: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Restaurant name is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await restaurantAPI.create({
        name: name.trim(),
        description: description.trim() || undefined,
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });
      onNext(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to create restaurant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 px-5 bg-white" showsVerticalScrollIndicator={false}>
      <View className="mb-6 flex-row items-center gap-4">
        <TouchableOpacity
          onPress={onBack}
          className="h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
          <MaterialIcons name="arrow-back" size={22} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-black">Restaurant Details</Text>
      </View>

      {error ? <Alert variant="destructive" description={error} className="mb-5" /> : null}

      <View className="gap-5">
        <View>
          <Label required>Restaurant Name</Label>
          <Input
            value={name}
            onChangeText={setName}
            placeholder="Enter restaurant name"
            variant="light"
          />
        </View>
        <View>
          <Label>Description</Label>
          <Textarea
            value={description}
            onChangeText={setDescription}
            placeholder="Brief description"
            variant="light"
          />
        </View>
        <View>
          <Label>Address</Label>
          <Input
            value={address}
            onChangeText={setAddress}
            placeholder="Restaurant address"
            variant="light"
          />
        </View>
        <View>
          <Label>Phone</Label>
          <Input
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone number"
            keyboardType="phone-pad"
            variant="light"
          />
        </View>
        <View>
          <Label>Email</Label>
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="Contact email"
            keyboardType="email-address"
            variant="light"
          />
        </View>
        <Button
          title="Next"
          loading={loading}
          onPress={handleCreate}
          disabled={loading}
          size="lg"
          className="mb-8 mt-2"
        />
      </View>
    </ScrollView>
  );
}

function TableSetupStep({
  restaurant,
  onNext,
}: {
  readonly restaurant: Restaurant;
  readonly onNext: () => void;
}) {
  const [from, setFrom] = useState('1');
  const [to, setTo] = useState('10');
  const [capacity, setCapacity] = useState('4');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    setError('');
    const fromNum = Number.parseInt(from, 10);
    const toNum = Number.parseInt(to, 10);
    const capNum = Number.parseInt(capacity, 10);

    if (Number.isNaN(fromNum) || Number.isNaN(toNum) || fromNum < 1 || toNum < fromNum) {
      setError('Invalid table range. Please enter a valid start and end number.');
      return;
    }
    if (Number.isNaN(capNum) || capNum < 1) {
      setError('Invalid capacity. Please enter a valid number.');
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
    <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
      <Text className="mb-2 text-2xl font-bold text-black">Table Setup</Text>
      <Text className="mb-6 text-sm text-gray-600">
        Create tables for your restaurant. You can always add more later.
      </Text>

      {error ? <Alert variant="destructive" description={error} className="mb-5" /> : null}

      <View className="gap-5">
        <View className="flex-row gap-4">
          <View className="flex-1">
            <Label required>From Table #</Label>
            <Input
              value={from}
              onChangeText={setFrom}
              placeholder="1"
              keyboardType="number-pad"
              variant="light"
            />
          </View>
          <View className="flex-1">
            <Label required>To Table #</Label>
            <Input
              value={to}
              onChangeText={setTo}
              placeholder="10"
              keyboardType="number-pad"
              variant="light"
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
            variant="light"
          />
        </View>
        <View className="mb-8 mt-4 flex-row gap-3">
          <Button title="Skip" onPress={onNext} variant="ghost" className="flex-1" size="lg" />
          <Button
            title="Create Tables"
            loading={loading}
            onPress={handleCreate}
            disabled={loading}
            className="flex-1"
            size="lg"
          />
        </View>
      </View>
    </ScrollView>
  );
}

function CompleteStep({ restaurant }: { readonly restaurant: Restaurant }) {
  const router = useRouter();
  return (
    <View className="flex-1 items-center justify-center bg-gray-50 p-8">
      <View className="mb-8 h-28 w-28 items-center justify-center rounded-full bg-emerald-500/15">
        <MaterialIcons name="check-circle" size={56} color="#10B981" />
      </View>
      <Text className="text-center text-3xl font-bold text-black">You&apos;re all set!</Text>
      <Text className="mt-4 text-center text-base text-gray-600">
        Your restaurant &quot;{restaurant.name}&quot; has been created successfully.
      </Text>

      <View className="mt-10 w-full gap-3">
        <Button
          title="Go to Dashboard"
          onPress={() => router.replace(ROUTES.ADMIN.RESTAURANTS.detail(restaurant.id) as any)}
          size="lg"
        />
        <Button
          title="Set up Menu"
          onPress={() => router.replace(ROUTES.ADMIN.MENU.list(restaurant.id) as any)}
          variant="secondary"
          size="lg"
        />
        <Button
          title="Invite Staff"
          onPress={() =>
            router.replace(ROUTES.ADMIN.MEMBERS.invite(restaurant.id) as any)
          }
          variant="ghost"
          size="lg"
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

  return (
    <View className="flex-1 bg-white pt-4">
      <ProgressDots current={step} total={4} />
      {step === 0 && <WelcomeStep onNext={() => setStep(1)} />}
      {step === 1 && (
        <RestaurantDetailsStep onNext={handleRestaurantCreated} onBack={() => setStep(0)} />
      )}
      {step === 2 && restaurant && (
        <TableSetupStep restaurant={restaurant} onNext={() => setStep(3)} />
      )}
      {step === 3 && restaurant && <CompleteStep restaurant={restaurant} />}
    </View>
  );
}
