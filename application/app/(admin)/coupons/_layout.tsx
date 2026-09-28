import { Stack } from 'expo-router';
import { headerOptions } from '../../../lib/theme';

export default function CouponsStackLayout() {
  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen name="index" options={{ title: 'Coupons' }} />
      <Stack.Screen name="new" options={{ title: 'New Coupon' }} />
    </Stack>
  );
}
