import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import { MaterialIcons } from '@expo/vector-icons';
import { ROUTES } from '@/lib/routes';
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
  const insets = useSafeAreaInsets();
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

  const renderPlanAction = (planSlug: string, isCurrent: boolean, isFree: boolean) => {
    if (isCurrent) {
      return (
        <View className="items-center rounded-xl bg-gray-100 py-3">
          <Text className="font-semibold text-gray-600">Current Plan</Text>
        </View>
      );
    }

    if (isFree) {
      return (
        <View className="items-center rounded-xl bg-gray-100 py-3">
          <Text className="font-semibold text-gray-600">Free Forever</Text>
        </View>
      );
    }

    return (
      <TouchableOpacity
        onPress={() => handleSubscribe(planSlug)}
        disabled={subscribing === planSlug}
        className="items-center rounded-xl py-3"
        style={{ backgroundColor: planColors[planSlug] || '#F97316' }}>
        {subscribing === planSlug ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text className="text-base font-bold text-white">
            {status?.planSlug ? 'Upgrade' : 'Subscribe'}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Stack.Screen options={{ title: 'Subscription', headerShown: false }} />
        <ActivityIndicator size="large" color="#DC2626" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        className="flex-1 bg-white"
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
        <View className="px-4 pb-2" style={{ paddingTop: insets.top + 12 }}>
          <View className="flex-row items-center gap-3 mb-4">
            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace(ROUTES.ADMIN.HOME);
                }
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="h-10 w-10 items-center justify-center rounded-xl bg-gray-100 active:opacity-70">
              <MaterialIcons name="arrow-back" size={22} color="#111827" />
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-black">Subscription</Text>
          </View>
          <Text className="text-gray-600">
            Select the plan that best fits your restaurant
          </Text>
        </View>

        {/* Current Status */}
        {status && (status.active || status.planSlug) && (
          <View className="mx-4 mt-4 rounded-xl border border-gray-200 bg-white p-4">
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="verified" size={20} color="#10B981" />
              <Text className="font-semibold text-emerald-600">Active Subscription</Text>
            </View>
            <Text className="mt-1 text-gray-600">
              Plan: <Text className="font-semibold capitalize text-black">{status.planSlug}</Text>
              {status.interval && (
                <Text className="text-gray-500"> ({status.interval})</Text>
              )}
            </Text>
            {status.expiresAt && (
              <Text className="mt-1 text-sm text-gray-500">
                Expires: {new Date(status.expiresAt).toLocaleDateString()}
              </Text>
            )}
          </View>
        )}

        {/* Interval Toggle */}
        <View className="flex-row justify-center mt-6 mb-4">
          <View className="flex-row rounded-xl bg-gray-100 p-1">
            <TouchableOpacity
              onPress={() => setInterval('monthly')}
              className={`px-5 py-2.5 rounded-lg ${
                interval === 'monthly' ? 'bg-orange-500' : ''
              }`}>
              <Text
                className={`font-semibold ${
                  interval === 'monthly' ? 'text-white' : 'text-gray-500'
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
                  interval === 'yearly' ? 'text-white' : 'text-gray-500'
                }`}>
                Yearly
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {interval === 'yearly' && (
          <View className="mx-4 mb-4">
            <Text className="text-center text-sm font-medium text-emerald-600">
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
                className={`rounded-2xl border overflow-hidden bg-white ${
                  isCurrent ? 'border-orange-500' : 'border-gray-200'
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
                      <Text className="text-lg font-bold text-black">
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
                    <Text className="text-3xl font-bold text-black">
                      {formatAmount(amount, plan.currency)}
                    </Text>
                    {!isFree && (
                      <Text className="ml-1 text-gray-500">
                        /{interval === 'yearly' ? 'year' : 'month'}
                      </Text>
                    )}
                  </View>

                  <View className="gap-2.5">
                    {plan.features.map((feature) => (
                      <View key={feature} className="flex-row items-center gap-2">
                        <MaterialIcons name="check-circle" size={18} color="#10B981" />
                        <Text className="flex-1 text-gray-700">{feature}</Text>
                      </View>
                    ))}
                  </View>

                  <View className="mt-4 border-t border-gray-200 pt-4">
                    <View className="flex-row flex-wrap gap-2">
                      <View className="rounded-lg bg-gray-100 px-3 py-1.5">
                        <Text className="text-xs text-gray-600">
                          {(plan.limits as any).maxTables
                            ? `${(plan.limits as any).maxTables} tables`
                            : 'Unlimited tables'}
                        </Text>
                      </View>
                      <View className="rounded-lg bg-gray-100 px-3 py-1.5">
                        <Text className="text-xs text-gray-600">
                          {(plan.limits as any).maxRestaurants === 1
                            ? '1 restaurant'
                            : `${(plan.limits as any).maxRestaurants} restaurants`}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View className="px-5 pb-5">
                  {renderPlanAction(plan.slug, isCurrent, isFree)}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </>
  );
}
