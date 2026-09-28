import { Stack } from 'expo-router';
import { headerOptions } from '../../../lib/theme';

export default function OrdersStackLayout() {
  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen name="index" options={{ title: 'Orders' }} />
      <Stack.Screen name="[id]" options={{ title: 'Order details' }} />
    </Stack>
  );
}
