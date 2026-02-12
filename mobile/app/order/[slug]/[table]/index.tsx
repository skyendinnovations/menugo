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
          router.replace(`/order/${slug}/${table}/menu`);
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
      router.replace(`/order/${slug}/${table}/menu`);
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
      router.replace(`/order/${slug}/${table}/menu`);
    } catch (err: any) {
      setError(err.message || 'Invalid code. Please check and try again.');
    } finally {
      setJoiningSession(false);
    }
  };

  // --- LOADING ---
  if (loading) {
    return (
      <View className="flex-1 bg-slate-900 justify-center items-center">
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  // --- TABLE FULL ---
  if (isFull) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-slate-900"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-center mb-8">
            <View className="w-24 h-24 rounded-full bg-red-500/15 items-center justify-center mb-5">
              <MaterialIcons name="no-meals" size={48} color="#EF4444" />
            </View>
            <Text className="text-white text-2xl font-bold text-center">Table Full</Text>
            <Text className="text-slate-400 text-base mt-2 text-center">
              All {capacity} seats are taken.
            </Text>
          </View>

          {/* Error */}
          {error ? (
            <View className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-5">
              <Text className="text-red-400 text-sm text-center">{error}</Text>
            </View>
          ) : null}

          {/* Join existing session */}
          <View className="bg-slate-800 rounded-2xl p-4 mb-6">
            <View className="flex-row items-center gap-2 mb-2">
              <MaterialIcons name="group" size={20} color="#F97316" />
              <Text className="text-white font-bold text-base">Already at the table?</Text>
            </View>
            <Text className="text-slate-400 text-sm mb-4">
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
                    router.replace(`/order/${slug}/${table}/menu`);
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
      className="flex-1 bg-slate-900"
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Restaurant + Table Header */}
        <View className="items-center mb-8">
          <View className="w-20 h-20 rounded-full bg-brand/15 items-center justify-center mb-4">
            <MaterialIcons name="restaurant" size={40} color="#F97316" />
          </View>
          <Text className="text-white text-2xl font-bold text-center">
            {restaurantName || 'Restaurant'}
          </Text>
          <Text className="text-slate-400 text-base mt-1">Table {table}</Text>
          {occupiedSeats > 0 && (
            <Text className="text-slate-500 text-sm mt-2">
              {availableSeats} of {capacity} seats available
            </Text>
          )}
        </View>

        {/* Error */}
        {error ? (
          <View className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-5">
            <Text className="text-red-400 text-sm text-center">{error}</Text>
          </View>
        ) : null}

        {/* ─── Join Existing Session (shown when table has occupied seats) ─── */}
        {occupiedSeats > 0 && (
          <View className="mb-6">
            <View className="bg-slate-800 rounded-2xl p-4">
              <View className="flex-row items-center gap-2 mb-2">
                <MaterialIcons name="group" size={20} color="#F97316" />
                <Text className="text-white font-bold text-base">Already at the table?</Text>
              </View>
              <Text className="text-slate-400 text-sm mb-4">
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
            <View className="flex-row items-center my-6">
              <View className="flex-1 h-px bg-slate-700" />
              <Text className="text-slate-500 text-sm mx-4 font-medium">or start your own</Text>
              <View className="flex-1 h-px bg-slate-700" />
            </View>
          </View>
        )}

        {/* ─── Start New Session ─── */}
        {/* Name Input */}
        <View className="mb-5">
          <Text className="text-slate-300 text-sm font-semibold mb-2">Your Name</Text>
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
          <Text className="text-slate-300 text-sm font-semibold mb-3">How many people?</Text>
          <View className="flex-row items-center justify-center gap-8 bg-slate-800 rounded-2xl py-5">
            <TouchableOpacity
              onPress={() => setPersonsCount((p) => Math.max(1, p - 1))}
              disabled={personsCount <= 1}
              activeOpacity={0.7}
              className={`w-14 h-14 rounded-full items-center justify-center ${
                personsCount <= 1 ? 'bg-slate-700' : 'bg-brand/20'
              }`}
            >
              <MaterialIcons
                name="remove"
                size={32}
                color={personsCount <= 1 ? '#475569' : '#F97316'}
              />
            </TouchableOpacity>

            <View className="items-center min-w-[60px]">
              <Text className="text-white text-5xl font-bold">{personsCount}</Text>
            </View>

            <TouchableOpacity
              onPress={() => setPersonsCount((p) => Math.min(availableSeats, p + 1))}
              disabled={personsCount >= availableSeats}
              activeOpacity={0.7}
              className={`w-14 h-14 rounded-full items-center justify-center ${
                personsCount >= availableSeats ? 'bg-slate-700' : 'bg-brand/20'
              }`}
            >
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
