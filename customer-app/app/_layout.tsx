import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from '../components/keyboard';
import { AuthProvider } from '../lib/auth/auth-context';
import { PaymentsProvider } from '../lib/payments';
import { colors, headerOptions } from '../lib/theme';
import { FeedbackHost } from '../components/feedback';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <PaymentsProvider>
                <Stack screenOptions={{ ...headerOptions, headerBackButtonDisplayMode: 'minimal' }}>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="search" options={{ headerShown: false }} />
                  <Stack.Screen name="product/[id]" options={{ title: '' }} />
                  <Stack.Screen name="category/[slug]" options={{ title: 'Category' }} />
                  <Stack.Screen name="checkout" options={{ title: 'Checkout' }} />
                  <Stack.Screen name="orders/index" options={{ title: 'Your Orders' }} />
                  <Stack.Screen name="orders/[id]" options={{ title: 'Order details' }} />
                  <Stack.Screen name="addresses" options={{ title: 'Saved Addresses' }} />
                  <Stack.Screen name="info/[slug]" options={{ title: '' }} />
                  <Stack.Screen name="login" options={{ title: 'Sign in', presentation: 'modal' }} />
                  <Stack.Screen name="register" options={{ title: 'Create account', presentation: 'modal' }} />
                  <Stack.Screen name="forgot-password" options={{ title: 'Forgot password' }} />
                  <Stack.Screen name="reset-password" options={{ title: 'Reset password' }} />
                </Stack>
                <StatusBar style="dark" />
                <FeedbackHost />
              </PaymentsProvider>
            </AuthProvider>
          </QueryClientProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
