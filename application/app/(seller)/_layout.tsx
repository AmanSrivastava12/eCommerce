import { Redirect, Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../../lib/auth/auth-context';
import { colors, headerOptions } from '../../lib/theme';
import type { IconName } from '../../components/ui';

const TABS: { name: string; title: string; icon: IconName; iconActive: IconName; nestedStack?: boolean }[] = [
  { name: 'products', title: 'Products', icon: 'cube-outline', iconActive: 'cube', nestedStack: true },
  { name: 'orders', title: 'Orders', icon: 'receipt-outline', iconActive: 'receipt', nestedStack: true },
  { name: 'reviews', title: 'Reviews', icon: 'star-outline', iconActive: 'star' },
  { name: 'billing', title: 'Billing', icon: 'wallet-outline', iconActive: 'wallet', nestedStack: true },
  { name: 'account', title: 'Account', icon: 'person-circle-outline', iconActive: 'person-circle', nestedStack: true },
];

export default function SellerLayout() {
  const { me, isLoading } = useAuth();

  if (isLoading) return null;
  if (!me) return <Redirect href="/(auth)/login" />;
  if (me.role !== 'seller') return <Redirect href="/" />;

  return (
    <Tabs
      screenOptions={{
        ...headerOptions,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            // Tabs that own a Stack render their own header; showing both doubles the top bar.
            headerShown: !tab.nestedStack,
            tabBarIcon: ({ color, focused, size }) => (
              <Ionicons name={focused ? tab.iconActive : tab.icon} size={size - 2} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
