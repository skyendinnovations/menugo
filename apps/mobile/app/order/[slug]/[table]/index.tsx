import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { publicAPI } from '@/lib/api';
import { getDeviceId, setCustomerName as saveCustomerName } from '@/lib/utils/device-id';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MaterialIcons } from '@expo/vector-icons';
import { ROUTES } from '@/lib/routes';

export default function SeatSelectionScreen() {
  const { slug, table } = useLocalSearchParams<{ slug: string; table: string }>();
  const router = useRouter();

  const [restaurantName, setRestaurantName] = useState('');
  const [capacity, setCapacity] = useState(0);
  const [availableSeats, setAvailableSeats] = useState(0);
  const [occupiedSeats, setOccupiedSeats] = useState(0);
  const [isFull, setIsFull] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [personsCount, setPersonsCount] = useState(1);

  // Join with code
  const [joinCode, setJoinCode] = useState('');
  const [joiningSession, setJoiningSession] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [deviceId, setDeviceId] = useState('');

  // Single fetch — loads table info and auto-redirects if device already has session
  useEffect(() => {
    (async () => {
      try {
        const did = await getDeviceId();
        setDeviceId(did);

        const res = await publicAPI.getTableInfo(slug as string, Number(table), did);
        const { restaurant, table: t } = res.data;

        setRestaurantName(restaurant.name);
        setCapacity(t.capacity);
        setAvailableSeats(t.availableSeats);
        setOccupiedSeats(t.occupiedSeats);
        setIsFull(t.isFull);

        // If this device already has a session → go straight to menu
        if (t.existingSessionId) {
          router.replace(ROUTES.ORDER.menu(slug as string, table as string));
          return;
        }
      } catch (err: any) {
        setError(err.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, table, router]);

  const handleProceed = async () => {
    if (!customerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await saveCustomerName(customerName.trim());
      await publicAPI.createOrGetSession(
        slug as string,
        Number(table),
        deviceId,
        personsCount,
        customerName.trim()
      );
      router.replace(ROUTES.ORDER.menu(slug as string, table as string));
    } catch (err: any) {
      setError(err.message || 'Could not join table');
      // Refresh availability
      try {
        const res = await publicAPI.getTableInfo(slug as string, Number(table), deviceId);
        setAvailableSeats(res.data.table.availableSeats);
        setOccupiedSeats(res.data.table.occupiedSeats);
        setIsFull(res.data.table.isFull);
      } catch {}
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinWithCode = async () => {
    if (!joinCode.trim()) {
      setError('Please enter the session code');
      return;
    }

    setJoiningSession(true);
    setError('');

    try {
      await publicAPI.joinSession(joinCode.trim(), deviceId);
      router.replace(ROUTES.ORDER.menu(slug as string, table as string));
    } catch (err: any) {
      setError(err.message || 'Invalid code. Please check and try again.');
    } finally {
      setJoiningSession(false);
    }
  };

  // --- LOADING ---
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900">
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  // --- TABLE FULL ---
  if (isFull) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-slate-900">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
          keyboardShouldPersistTaps="handled">
          <View className="mb-8 items-center">
            <View className="mb-5 h-24 w-24 items-center justify-center rounded-full bg-red-500/15">
              <MaterialIcons name="no-meals" size={48} color="#EF4444" />
            </View>
            <Text className="text-center text-2xl font-bold text-white">Table Full</Text>
            <Text className="mt-2 text-center text-base text-slate-400">
              All {capacity} seats are taken.
            </Text>
          </View>

          {/* Error */}
          {error ? (
            <View className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
              <Text className="text-center text-sm text-red-400">{error}</Text>
            </View>
          ) : null}

          {/* Join existing session */}
          <View className="mb-6 rounded-2xl bg-slate-800 p-4">
            <View className="mb-2 flex-row items-center gap-2">
              <MaterialIcons name="group" size={20} color="#F97316" />
              <Text className="text-base font-bold text-white">Already at the table?</Text>
            </View>
            <Text className="mb-4 text-sm text-slate-400">
              Enter the code shared by your friend or family member to access the menu.
            </Text>

            <View className="mb-4">
              <Input
                value={joinCode}
                onChangeText={(text) => {
                  setJoinCode(text.replace(/[^0-9]/g, '').slice(0, 4));
                  if (error) setError('');
                }}
                placeholder="Enter 4-digit code"
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>

            <Button
              title="Join Session"
              loading={joiningSession}
              onPress={handleJoinWithCode}
              disabled={joiningSession || !joinCode.trim()}
              size="lg"
              icon={<MaterialIcons name="login" size={20} color="#fff" />}
            />
          </View>

          <Button
            title="Refresh"
            onPress={() => {
              setLoading(true);
              setIsFull(false);
              (async () => {
                try {
                  const res = await publicAPI.getTableInfo(slug as string, Number(table), deviceId);
                  setAvailableSeats(res.data.table.availableSeats);
                  setOccupiedSeats(res.data.table.occupiedSeats);
                  setIsFull(res.data.table.isFull);
                  if (res.data.table.existingSessionId) {
                    router.replace(ROUTES.ORDER.menu(slug as string, table as string));
                  }
                } catch {}
                setLoading(false);
              })();
            }}
            variant="secondary"
            size="lg"
            className="w-full"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // --- MAIN: NAME + PERSONS + JOIN WITH CODE ---
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-slate-900">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled">
        {/* Restaurant + Table Header */}
        <View className="mb-8 items-center">
          <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-brand/15">
            <MaterialIcons name="restaurant" size={40} color="#F97316" />
          </View>
          <Text className="text-center text-2xl font-bold text-white">
            {restaurantName || 'Restaurant'}
          </Text>
          <Text className="mt-1 text-base text-slate-400">Table {table}</Text>
          {occupiedSeats > 0 && (
            <Text className="mt-2 text-sm text-slate-500">
              {availableSeats} of {capacity} seats available
            </Text>
          )}
        </View>

        {/* Error */}
        {error ? (
          <View className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
            <Text className="text-center text-sm text-red-400">{error}</Text>
          </View>
        ) : null}

        {/* ─── Join Existing Session (shown when table has occupied seats) ─── */}
        {occupiedSeats > 0 && (
          <View className="mb-6">
            <View className="rounded-2xl bg-slate-800 p-4">
              <View className="mb-2 flex-row items-center gap-2">
                <MaterialIcons name="group" size={20} color="#F97316" />
                <Text className="text-base font-bold text-white">Already at the table?</Text>
              </View>
              <Text className="mb-4 text-sm text-slate-400">
                Enter the code shared by your friend or family member to access the menu.
              </Text>

              <View className="mb-4">
                <Input
                  value={joinCode}
                  onChangeText={(text) => {
                    setJoinCode(text.replace(/[^0-9]/g, '').slice(0, 4));
                    if (error) setError('');
                  }}
                  placeholder="Enter 4-digit code"
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>

              <Button
                title="Join Session"
                loading={joiningSession}
                onPress={handleJoinWithCode}
                disabled={joiningSession || !joinCode.trim()}
                variant="secondary"
                size="lg"
                icon={<MaterialIcons name="login" size={20} color="#F8FAFC" />}
              />
            </View>

            {/* Divider */}
            <View className="my-6 flex-row items-center">
              <View className="h-px flex-1 bg-slate-700" />
              <Text className="mx-4 text-sm font-medium text-slate-500">or start your own</Text>
              <View className="h-px flex-1 bg-slate-700" />
            </View>
          </View>
        )}

        {/* ─── Start New Session ─── */}
        {/* Name Input */}
        <View className="mb-5">
          <Text className="mb-2 text-sm font-semibold text-slate-300">Your Name</Text>
          <Input
            value={customerName}
            onChangeText={(text) => {
              setCustomerName(text);
              if (error) setError('');
            }}
            placeholder="Enter your name"
          />
        </View>

        {/* Persons Counter */}
        <View className="mb-8">
          <Text className="mb-3 text-sm font-semibold text-slate-300">How many people?</Text>
          <View className="flex-row items-center justify-center gap-8 rounded-2xl bg-slate-800 py-5">
            <TouchableOpacity
              onPress={() => setPersonsCount((p) => Math.max(1, p - 1))}
              disabled={personsCount <= 1}
              activeOpacity={0.7}
              className={`h-14 w-14 items-center justify-center rounded-full ${
                personsCount <= 1 ? 'bg-slate-700' : 'bg-brand/20'
              }`}>
              <MaterialIcons
                name="remove"
                size={32}
                color={personsCount <= 1 ? '#475569' : '#F97316'}
              />
            </TouchableOpacity>

            <View className="min-w-[60px] items-center">
              <Text className="text-5xl font-bold text-white">{personsCount}</Text>
            </View>

            <TouchableOpacity
              onPress={() => setPersonsCount((p) => Math.min(availableSeats, p + 1))}
              disabled={personsCount >= availableSeats}
              activeOpacity={0.7}
              className={`h-14 w-14 items-center justify-center rounded-full ${
                personsCount >= availableSeats ? 'bg-slate-700' : 'bg-brand/20'
              }`}>
              <MaterialIcons
                name="add"
                size={32}
                color={personsCount >= availableSeats ? '#475569' : '#F97316'}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Proceed Button */}
        <Button
          title={occupiedSeats > 0 ? 'Start New Session →' : 'View Menu →'}
          loading={submitting}
          onPress={handleProceed}
          disabled={submitting || !customerName.trim()}
          size="lg"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
