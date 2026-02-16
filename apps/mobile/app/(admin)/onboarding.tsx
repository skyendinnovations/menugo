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
    <View className="mb-8 flex-row items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          className={`h-1.5 rounded-full ${
            i === current ? 'w-8 bg-brand' : i < current ? 'w-2 bg-brand' : 'w-2 bg-slate-700'
          }`}
        />
      ))}
    </View>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View className="mb-8 h-28 w-28 items-center justify-center rounded-full bg-brand/15">
        <MaterialIcons name="restaurant-menu" size={56} color="#F97316" />
      </View>
      <Text className="text-center text-3xl font-bold text-white">Welcome to MenuGo!</Text>
      <Text className="mt-4 text-center text-base leading-6 text-slate-400">
        Manage your restaurant&apos;s menus, tables, orders, and staff — all in one place.
      </Text>
      <Text className="mt-6 text-center text-sm text-slate-500">
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
    <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
      <View className="mb-6 flex-row items-center gap-4">
        <TouchableOpacity
          onPress={onBack}
          className="h-10 w-10 items-center justify-center rounded-xl bg-slate-800">
          <MaterialIcons name="arrow-back" size={22} color="#F8FAFC" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-white">Restaurant Details</Text>
      </View>

      {error ? <Alert variant="destructive" description={error} className="mb-5" /> : null}

      <View className="gap-5">
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

function TableSetupStep({ restaurant, onNext }: { restaurant: Restaurant; onNext: () => void }) {
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
    <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
      <Text className="mb-2 text-2xl font-bold text-white">Table Setup</Text>
      <Text className="mb-6 text-sm text-slate-400">
        Create tables for your restaurant. You can always add more later.
      </Text>

      {error ? <Alert variant="destructive" description={error} className="mb-5" /> : null}

      <View className="gap-5">
        <View className="flex-row gap-4">
          <View className="flex-1">
            <Label required>From Table #</Label>
            <Input value={from} onChangeText={setFrom} placeholder="1" keyboardType="number-pad" />
          </View>
          <View className="flex-1">
            <Label required>To Table #</Label>
            <Input value={to} onChangeText={setTo} placeholder="10" keyboardType="number-pad" />
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

function CompleteStep({ restaurant }: { restaurant: Restaurant }) {
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center px-8">
      <View className="mb-8 h-28 w-28 items-center justify-center rounded-full bg-emerald-500/15">
        <MaterialIcons name="check-circle" size={56} color="#10B981" />
      </View>
      <Text className="text-center text-3xl font-bold text-white">You&apos;re all set!</Text>
      <Text className="mt-4 text-center text-base text-slate-400">
        Your restaurant &quot;{restaurant.name}&quot; has been created successfully.
      </Text>

      <View className="mt-10 w-full gap-3">
        <Button
          title="Go to Dashboard"
          onPress={() => router.replace(`/(admin)/restaurants/${restaurant.id}` as any)}
          size="lg"
        />
        <Button
          title="Set up Menu"
          onPress={() => router.replace(`/(admin)/restaurants/${restaurant.id}/menu` as any)}
          variant="secondary"
          size="lg"
        />
        <Button
          title="Invite Staff"
          onPress={() =>
            router.replace(`/(admin)/restaurants/${restaurant.id}/members/invite` as any)
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
    <View className="flex-1 bg-slate-900 pt-4">
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
