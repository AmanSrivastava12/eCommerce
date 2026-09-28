import { Stack } from 'expo-router';
import { headerOptions } from '../../../lib/theme';

export default function BillingStackLayout() {
  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen name="index" options={{ title: 'Billing' }} />
      <Stack.Screen name="bank-account" options={{ title: 'Bank account', presentation: 'modal' }} />
    </Stack>
  );
}
