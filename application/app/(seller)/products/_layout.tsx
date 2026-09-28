import { Stack } from 'expo-router';
import { headerOptions } from '../../../lib/theme';

export default function ProductsStackLayout() {
  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen name="index" options={{ title: 'My Products' }} />
      <Stack.Screen name="new" options={{ title: 'New Product' }} />
      <Stack.Screen name="[id]/edit" options={{ title: 'Edit Product' }} />
    </Stack>
  );
}
