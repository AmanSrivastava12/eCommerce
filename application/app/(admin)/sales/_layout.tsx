import { Stack } from 'expo-router';
import { headerOptions } from '../../../lib/theme';

export default function SalesStackLayout() {
  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen name="index" options={{ title: 'Sales' }} />
      <Stack.Screen name="new" options={{ title: 'New Sale' }} />
    </Stack>
  );
}
