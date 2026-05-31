import React, { useState } from 'react';

import {

  View,

  Text,

  Pressable,

  ScrollView,

  ViewProps,

  ScrollViewProps,

  PressableProps,

} from 'react-native';



interface TabsProps extends ViewProps {

  defaultValue: string;

  children: React.ReactNode;

}



interface TabsListProps extends ScrollViewProps {

  children: React.ReactNode;

}



interface TabsTriggerProps extends Omit<PressableProps, 'onPress'> {

  value: string;

  children: React.ReactNode;

}



interface TabsContentProps extends ViewProps {

  value: string;

  children: React.ReactNode;

}



const TabsContext = React.createContext<{

  activeTab: string;

  setActiveTab: (value: string) => void;

} | null>(null);



export function Tabs({ defaultValue, children, className, ...props }: TabsProps) {

  const [activeTab, setActiveTab] = useState(defaultValue);



  return (

    <TabsContext.Provider value={{ activeTab, setActiveTab }}>

      <View className={`flex-1 ${className || ''}`} {...props}>

        {children}

      </View>

    </TabsContext.Provider>

  );

}



export function TabsList({ children, className, ...props }: TabsListProps) {

  return (

    <ScrollView

      horizontal

      showsHorizontalScrollIndicator={false}

      className={`max-h-14 ${className || ''}`}

      contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}

      {...props}>

      {children}

    </ScrollView>

  );

}



export function TabsTrigger({ value, children, className, ...props }: TabsTriggerProps) {

  const context = React.useContext(TabsContext);



  if (!context) {

    throw new Error('TabsTrigger must be used within Tabs');

  }



  const isActive = context.activeTab === value;



  return (

    <Pressable

      onPress={() => context.setActiveTab(value)}

      className={`min-w-[96px] h-12 items-center justify-center rounded-full px-5 ${

        isActive ? 'bg-brand' : 'border border-gray-200 bg-gray-100'

      } ${className || ''}`}

      {...props}>

      <Text className={`text-sm font-semibold leading-none text-center ${isActive ? 'text-white' : 'text-gray-600'}`}>

        {children}

      </Text>

    </Pressable>

  );

}



export function TabsContent({ value, children, className, ...props }: TabsContentProps) {

  const context = React.useContext(TabsContext);



  if (!context) {

    throw new Error('TabsContent must be used within Tabs');

  }



  if (context.activeTab !== value) {

    return null;

  }



  return (

    <View className={`flex-1 pt-4 ${className || ''}`} {...props}>

      {children}

    </View>

  );

}

