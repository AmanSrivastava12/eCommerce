import { Redirect, Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../../lib/auth/auth-context';
import { colors, headerOptions } from '../../lib/theme';
import type { IconName } from '../../components/ui';

const TABS: { name: string; title: string; icon: IconName; iconActive: IconName; nestedStack?: boolean }[] = [
  { name: 'dashboard', title: 'Dashboard', icon: 'grid-outline', iconActive: 'grid' },
  { name: 'sellers/index', title: 'Sellers', icon: 'storefront-outline', iconActive: 'storefront' },
  { name: 'users/index', title: 'Users', icon: 'people-outline', iconActive: 'people' },
  { name: 'categories/index', title: 'Categories', icon: 'pricetags-outline', iconActive: 'pricetags' },
  { name: 'sales', title: 'Sales', icon: 'flash-outline', iconActive: 'flash', nestedStack: true },
  { name: 'coupons', title: 'Coupons', icon: 'ticket-outline', iconActive: 'ticket', nestedStack: true },
  { name: 'returns/index', title: 'Returns', icon: 'return-down-back-outline', iconActive: 'return-down-back' },
];

export default function AdminLayout() {
  const { me, isLoading } = useAuth();

  if (isLoading) return null;
  if (!me) return <Redirect href="/(auth)/login" />;
  if (me.role !== 'admin') return <Redirect href="/" />;

  return (
    <Tabs
      screenOptions={{
        ...headerOptions,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
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
