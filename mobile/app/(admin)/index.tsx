import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';

// Dummy Data
const DUMMY_USER = {
  name: 'John Doe',
  email: 'john@example.com',
  role: 'Admin',
};

const DUMMY_STATS = [
  { id: '1', title: 'Total Orders', value: '1,234', change: '+12%', icon: 'receipt-long', color: 'bg-blue-500' },
  { id: '2', title: 'Revenue', value: '$45,678', change: '+8%', icon: 'attach-money', color: 'bg-green-500' },
  { id: '3', title: 'Active Tables', value: '24', change: '+3', icon: 'table-restaurant', color: 'bg-purple-500' },
  { id: '4', title: 'Total Menu Items', value: '156', change: '+15', icon: 'restaurant-menu', color: 'bg-orange-500' },
];

const RECENT_ORDERS = [
  { id: '1', orderNumber: '#ORD-1234', table: 'Table 5', amount: '$45.50', status: 'completed', time: '10 mins ago' },
  { id: '2', orderNumber: '#ORD-1235', table: 'Table 12', amount: '$78.90', status: 'pending', time: '15 mins ago' },
  { id: '3', orderNumber: '#ORD-1236', table: 'Table 3', amount: '$32.00', status: 'completed', time: '25 mins ago' },
  { id: '4', orderNumber: '#ORD-1237', table: 'Table 8', amount: '$56.75', status: 'preparing', time: '30 mins ago' },
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
          <Text className="text-white font-bold mb-2" style={{ fontSize: isLargeScreen ? 30 : 24 }}>
            Welcome back, {DUMMY_USER.name.split(' ')[0]}!
          </Text>
          <Text className="text-gray-400" style={{ fontSize: isWeb ? 16 : 14 }}>
            Here's what's happening with your restaurant today.
          </Text>
        </View>

        {/* Stats Cards */}
        <View className="flex-row flex-wrap mb-6" style={{ marginHorizontal: -8 }}>
          {DUMMY_STATS.map((stat) => {
            const cardWidth = isLargeScreen ? '25%' : isMediumScreen ? '50%' : '50%';
            return (
              <View key={stat.id} style={{ width: cardWidth, paddingHorizontal: 8, marginBottom: 16 }}>
                <Card className="bg-gray-900 border-gray-800 rounded-xl">
                  <CardContent className="p-4">
                    <View className="flex-row items-start justify-between mb-2">
                      <View className={`${stat.color} p-2 rounded-lg`}>
                        <MaterialIcons name={stat.icon as any} size={20} color="#fff" />
                      </View>
                      <Badge variant="success" className="bg-green-500/20 text-green-400 text-xs">
                        {stat.change}
                      </Badge>
                    </View>
                    <Text className="text-gray-400 text-xs mb-1">{stat.title}</Text>
                    <Text className="text-white text-xl font-bold">{stat.value}</Text>
                  </CardContent>
                </Card>
              </View>
            );
          })}
        </View>

        {/* Recent Orders */}
        <Card className="bg-gray-900 border-gray-800 rounded-xl">
          <CardHeader className="p-4 border-b border-gray-800">
            <View className="flex-row items-center justify-between">
              <CardTitle className="text-white font-bold" style={{ fontSize: isWeb ? 20 : 18 }}>
                Recent Orders
              </CardTitle>
              <TouchableOpacity>
                <Text className="text-red-500 font-medium" style={{ fontSize: isWeb ? 14 : 12 }}>View All</Text>
              </TouchableOpacity>
            </View>
          </CardHeader>
          <CardContent className="p-4">
            {RECENT_ORDERS.map((order, index) => (
              <View 
                key={order.id} 
                className={`py-3 ${index !== RECENT_ORDERS.length - 1 ? 'border-b border-gray-800' : ''}`}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-white font-semibold text-sm">
                    {order.orderNumber}
                  </Text>
                  <Badge 
                    variant={order.status === 'completed' ? 'success' : order.status === 'pending' ? 'destructive' : 'default'}
                  >
                    {order.status}
                  </Badge>
                </View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-gray-400 text-xs">{order.table}</Text>
                  <View className="flex-row items-center">
                    <Text className="text-white font-bold text-sm mr-2">{order.amount}</Text>
                    <Text className="text-gray-500 text-xs">{order.time}</Text>
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
