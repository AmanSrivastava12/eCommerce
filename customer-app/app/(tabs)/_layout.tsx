import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCart } from '../../lib/hooks/use-cart';
import { useWishlist } from '../../lib/hooks/use-wishlist';
import { colors, headerOptions } from '../../lib/theme';
import type { IconName } from '../../components/ui';

const TABS: { name: string; title: string; icon: IconName; iconActive: IconName; headerShown?: boolean }[] = [
  { name: 'index', title: 'Home', icon: 'home-outline', iconActive: 'home', headerShown: false },
  { name: 'categories', title: 'Categories', icon: 'grid-outline', iconActive: 'grid' },
  { name: 'wishlist', title: 'Wishlist', icon: 'heart-outline', iconActive: 'heart' },
  { name: 'cart', title: 'Cart', icon: 'cart-outline', iconActive: 'cart' },
  { name: 'account', title: 'Account', icon: 'person-circle-outline', iconActive: 'person-circle' },
];

export default function TabsLayout() {
  // Same two badges the website header shows next to Wishlist and Cart.
  const { itemCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const badges: Record<string, number> = { cart: itemCount, wishlist: wishlistCount };

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
            headerShown: tab.headerShown ?? true,
            tabBarBadge: badges[tab.name] ? badges[tab.name] : undefined,
            tabBarBadgeStyle: {
              backgroundColor: tab.name === 'wishlist' ? colors.danger : colors.brand,
              color: colors.brandForeground,
              fontSize: 10,
            },
            tabBarIcon: ({ color, focused, size }) => (
              <Ionicons name={focused ? tab.iconActive : tab.icon} size={size - 2} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
