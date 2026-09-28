import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../lib/auth/auth-context';

// Root entry: routes to the seller or admin stack based on role, or to login if
// unauthenticated. No Stack.Protected in this Expo Router version, so gating is done
// with explicit Redirects driven by AuthContext.
export default function Index() {
  const { isLoading, me } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#f9f5ee", alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#6f4a2f" />
      </View>
    );
  }

  if (!me) return <Redirect href="/(auth)/login" />;
  if (me.role === 'admin') return <Redirect href="/(admin)/dashboard" />;
  return <Redirect href="/(seller)/products" />;
}
