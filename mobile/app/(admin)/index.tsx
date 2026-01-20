import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';

const DUMMY_USER = {
  name: 'John Doe',
  email: 'john@example.com',
  role: 'Admin',
};

const DUMMY_STATS = [
  {
    id: '1',
    title: 'Total Orders',
    value: '1,234',
    change: '+12%',
    icon: 'receipt-long',
    color: 'bg-blue-500',
  },
  {
    id: '2',
    title: 'Revenue',
    value: '$45,678',
    change: '+8%',
    icon: 'attach-money',
    color: 'bg-green-500',
  },
  {
    id: '3',
    title: 'Active Tables',
    value: '24',
    change: '+3',
    icon: 'table-restaurant',
    color: 'bg-purple-500',
  },
  {
    id: '4',
    title: 'Total Menu Items',
    value: '156',
    change: '+15',
    icon: 'restaurant-menu',
    color: 'bg-orange-500',
  },
];

const RECENT_ORDERS = [
  {
    id: '1',
    orderNumber: '#ORD-1234',
    table: 'Table 5',
    amount: '$45.50',
    status: 'completed',
    time: '10 mins ago',
  },
  {
    id: '2',
    orderNumber: '#ORD-1235',
    table: 'Table 12',
    amount: '$78.90',
    status: 'pending',
    time: '15 mins ago',
  },
  {
    id: '3',
    orderNumber: '#ORD-1236',
    table: 'Table 3',
    amount: '$32.00',
    status: 'completed',
    time: '25 mins ago',
  },
  {
    id: '4',
    orderNumber: '#ORD-1237',
    table: 'Table 8',
    amount: '$56.75',
    status: 'preparing',
    time: '30 mins ago',
  },
];

export default function AdminDashboard() {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isLargeScreen = width >= 1024;
  const isMediumScreen = width >= 768;

  return (
    <ScrollView className="flex-1 bg-black" contentContainerStyle={{ padding: isWeb ? 24 : 16 }}>
      <View style={{ maxWidth: isWeb ? 1280 : '100%', width: '100%', marginHorizontal: 'auto' }}>
        {/* Welcome Section */}
        <View className="mb-6">
          <Text className="mb-2 font-bold text-white" style={{ fontSize: isLargeScreen ? 30 : 24 }}>
            Welcome back, {DUMMY_USER.name.split(' ')[0]}!
          </Text>
          <Text className="text-gray-400" style={{ fontSize: isWeb ? 16 : 14 }}>
            Here's what's happening with your restaurant today.
          </Text>
        </View>

        {/* Stats Cards */}
        <View className="mb-6 flex-row flex-wrap" style={{ marginHorizontal: -8 }}>
          {DUMMY_STATS.map((stat) => {
            const cardWidth = isLargeScreen ? '25%' : isMediumScreen ? '50%' : '50%';
            return (
              <View
                key={stat.id}
                style={{ width: cardWidth, paddingHorizontal: 8, marginBottom: 16 }}>
                <Card className="rounded-xl border-gray-800 bg-gray-900">
                  <CardContent className="p-4">
                    <View className="mb-2 flex-row items-start justify-between">
                      <View className={`${stat.color} rounded-lg p-2`}>
                        <MaterialIcons name={stat.icon as any} size={20} color="#fff" />
                      </View>
                      <Badge variant="success" className="bg-green-500/20 text-xs text-green-400">
                        {stat.change}
                      </Badge>
                    </View>
                    <Text className="mb-1 text-xs text-gray-400">{stat.title}</Text>
                    <Text className="text-xl font-bold text-white">{stat.value}</Text>
                  </CardContent>
                </Card>
              </View>
            );
          })}
        </View>

        {/* Recent Orders */}
        <Card className="rounded-xl border-gray-800 bg-gray-900">
          <CardHeader className="border-b border-gray-800 p-4">
            <View className="flex-row items-center justify-between">
              <CardTitle className="font-bold text-white" style={{ fontSize: isWeb ? 20 : 18 }}>
                Recent Orders
              </CardTitle>
              <TouchableOpacity>
                <Text className="font-medium text-red-500" style={{ fontSize: isWeb ? 14 : 12 }}>
                  View All
                </Text>
              </TouchableOpacity>
            </View>
          </CardHeader>
          <CardContent className="p-4">
            {RECENT_ORDERS.map((order, index) => (
              <View
                key={order.id}
                className={`py-3 ${index !== RECENT_ORDERS.length - 1 ? 'border-b border-gray-800' : ''}`}>
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-sm font-semibold text-white">{order.orderNumber}</Text>
                  <Badge
                    variant={
                      order.status === 'completed'
                        ? 'success'
                        : order.status === 'pending'
                          ? 'destructive'
                          : 'default'
                    }>
                    {order.status}
                  </Badge>
                </View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs text-gray-400">{order.table}</Text>
                  <View className="flex-row items-center">
                    <Text className="mr-2 text-sm font-bold text-white">{order.amount}</Text>
                    <Text className="text-xs text-gray-500">{order.time}</Text>
                  </View>
                </View>
              </View>
            ))}
          </CardContent>
        </Card>
      </View>
    </ScrollView>
  );
}
