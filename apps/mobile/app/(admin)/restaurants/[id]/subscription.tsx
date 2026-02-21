import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import { MaterialIcons } from '@expo/vector-icons';
import { subscriptionAPI } from '@/lib/api/subscription';
import type { SubscriptionPlan, SubscriptionStatus } from '@/lib/api/subscription';

function formatAmount(paise: number, currency: string): string {
  const amount = paise / 100;
  if (amount === 0) return 'Free';
  if (currency === 'INR') return `\u20B9${amount.toLocaleString('en-IN')}`;
  return `${currency} ${amount}`;
}

export default function SubscriptionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const restaurantId = Number(id);

  const fetchData = useCallback(async () => {
    try {
      const [plansRes, statusRes] = await Promise.all([
        subscriptionAPI.getPlans(),
        subscriptionAPI.getStatus(restaurantId),
      ]);
      if (plansRes.success) setPlans(plansRes.data);
      if (statusRes.success) setStatus(statusRes.data);
    } catch (error) {
      console.error('Failed to fetch subscription data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [restaurantId]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  const handleSubscribe = async (planSlug: string) => {
    try {
      setSubscribing(planSlug);
      const res = await subscriptionAPI.getCheckoutUrl(restaurantId, planSlug, interval);
      if (res.success && res.data.url) {
        await WebBrowser.openBrowserAsync(res.data.url);
        fetchData();
      }
    } catch (error) {
      console.error('Failed to get checkout URL:', error);
    } finally {
      setSubscribing(null);
    }
  };

  const isCurrentPlan = (planSlug: string) => {
    if (!status) return planSlug === 'starter';
    if (!status.active && !status.planSlug) return planSlug === 'starter';
    return status.planSlug === planSlug;
  };

  const planIcons: Record<string, keyof typeof MaterialIcons.glyphMap> = {
    starter: 'rocket-launch',
    professional: 'workspace-premium',
    enterprise: 'diamond',
  };

  const planColors: Record<string, string> = {
    starter: '#64748B',
    professional: '#F97316',
    enterprise: '#8B5CF6',
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-900 items-center justify-center">
        <Stack.Screen options={{ title: 'Subscription', headerShown: false }} />
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        className="flex-1 bg-slate-900"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchData();
            }}
            tintColor="#F97316"
          />
        }>
        {/* Header */}
        <View className="px-4 pt-6 pb-2">
          <View className="flex-row items-center gap-3 mb-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-xl bg-slate-800">
              <MaterialIcons name="arrow-back" size={22} color="#F8FAFC" />
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-slate-50">Subscription</Text>
          </View>
          <Text className="text-slate-400">
            Select the plan that best fits your restaurant
          </Text>
        </View>

        {/* Current Status */}
        {status && (status.active || status.planSlug) && (
          <View className="mx-4 mt-4 p-4 bg-slate-800 rounded-xl border border-slate-700">
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="verified" size={20} color="#10B981" />
              <Text className="text-emerald-400 font-semibold">Active Subscription</Text>
            </View>
            <Text className="text-slate-300 mt-1">
              Plan: <Text className="text-slate-50 font-semibold capitalize">{status.planSlug}</Text>
              {status.interval && (
                <Text className="text-slate-400"> ({status.interval})</Text>
              )}
            </Text>
            {status.expiresAt && (
              <Text className="text-slate-400 text-sm mt-1">
                Expires: {new Date(status.expiresAt).toLocaleDateString()}
              </Text>
            )}
          </View>
        )}

        {/* Interval Toggle */}
        <View className="flex-row justify-center mt-6 mb-4">
          <View className="flex-row bg-slate-800 rounded-xl p-1">
            <TouchableOpacity
              onPress={() => setInterval('monthly')}
              className={`px-5 py-2.5 rounded-lg ${
                interval === 'monthly' ? 'bg-orange-500' : ''
              }`}>
              <Text
                className={`font-semibold ${
                  interval === 'monthly' ? 'text-white' : 'text-slate-400'
                }`}>
                Monthly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setInterval('yearly')}
              className={`px-5 py-2.5 rounded-lg ${
                interval === 'yearly' ? 'bg-orange-500' : ''
              }`}>
              <Text
                className={`font-semibold ${
                  interval === 'yearly' ? 'text-white' : 'text-slate-400'
                }`}>
                Yearly
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {interval === 'yearly' && (
          <View className="mx-4 mb-4">
            <Text className="text-emerald-400 text-center text-sm font-medium">
              Save ~17% with yearly billing
            </Text>
          </View>
        )}

        {/* Plan Cards */}
        <View className="px-4 pb-8 gap-4">
          {plans.map((plan) => {
            const isCurrent = isCurrentPlan(plan.slug);
            const color = planColors[plan.slug] || '#F97316';
            const amount =
              interval === 'yearly' ? plan.yearlyAmount : plan.monthlyAmount;
            const isFree = amount === 0;

            return (
              <View
                key={plan.id}
                className={`bg-slate-800 rounded-2xl border overflow-hidden ${
                  isCurrent ? 'border-orange-500' : 'border-slate-700'
                }`}>
                <View className="p-5">
                  <View className="flex-row items-center gap-3 mb-3">
                    <View
                      className="w-10 h-10 rounded-xl items-center justify-center"
                      style={{ backgroundColor: `${color}20` }}>
                      <MaterialIcons
                        name={planIcons[plan.slug] || 'star'}
                        size={22}
                        color={color}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-lg font-bold text-slate-50">
                        {plan.name}
                      </Text>
                    </View>
                    {isCurrent && (
                      <View className="bg-orange-500/20 px-3 py-1 rounded-full">
                        <Text className="text-orange-400 text-xs font-semibold">
                          Current
                        </Text>
                      </View>
                    )}
                  </View>

                  <View className="flex-row items-baseline mb-4">
                    <Text className="text-3xl font-bold text-slate-50">
                      {formatAmount(amount, plan.currency)}
                    </Text>
                    {!isFree && (
                      <Text className="text-slate-400 ml-1">
                        /{interval === 'yearly' ? 'year' : 'month'}
                      </Text>
                    )}
                  </View>

                  <View className="gap-2.5">
                    {(plan.features as string[]).map((feature, idx) => (
                      <View key={idx} className="flex-row items-center gap-2">
                        <MaterialIcons name="check-circle" size={18} color="#10B981" />
                        <Text className="text-slate-300 flex-1">{feature}</Text>
                      </View>
                    ))}
                  </View>

                  <View className="mt-4 pt-4 border-t border-slate-700">
                    <View className="flex-row flex-wrap gap-2">
                      <View className="bg-slate-700/50 px-3 py-1.5 rounded-lg">
                        <Text className="text-slate-300 text-xs">
                          {(plan.limits as any).maxTables
                            ? `${(plan.limits as any).maxTables} tables`
                            : 'Unlimited tables'}
                        </Text>
                      </View>
                      <View className="bg-slate-700/50 px-3 py-1.5 rounded-lg">
                        <Text className="text-slate-300 text-xs">
                          {(plan.limits as any).maxRestaurants === 1
                            ? '1 restaurant'
                            : `${(plan.limits as any).maxRestaurants} restaurants`}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View className="px-5 pb-5">
                  {isCurrent ? (
                    <View className="bg-slate-700 py-3 rounded-xl items-center">
                      <Text className="text-slate-400 font-semibold">Current Plan</Text>
                    </View>
                  ) : isFree ? (
                    <View className="bg-slate-700 py-3 rounded-xl items-center">
                      <Text className="text-slate-400 font-semibold">Free Forever</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => handleSubscribe(plan.slug)}
                      disabled={subscribing === plan.slug}
                      className="py-3 rounded-xl items-center"
                      style={{ backgroundColor: color }}>
                      {subscribing === plan.slug ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text className="text-white font-bold text-base">
                          {status?.planSlug ? 'Upgrade' : 'Subscribe'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </>
  );
}
