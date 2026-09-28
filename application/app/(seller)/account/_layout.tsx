import { Stack } from 'expo-router';
import { headerOptions } from '../../../lib/theme';

export default function AccountStackLayout() {
  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen name="index" options={{ title: 'Account' }} />
      <Stack.Screen name="addresses" options={{ title: 'Addresses' }} />
      <Stack.Screen name="address-form" options={{ title: 'Address', presentation: 'modal' }} />
      <Stack.Screen name="change-password" options={{ title: 'Change password' }} />
    </Stack>
  );
}
