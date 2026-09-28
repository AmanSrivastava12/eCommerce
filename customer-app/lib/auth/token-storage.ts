import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const GUEST_SESSION_KEY = 'guestSessionId';

// SecureStore has no web implementation, so the web preview falls back to localStorage —
// the same storage the website itself uses for these keys.
const isWeb = Platform.OS === 'web';
/** Small key/value persistence on the device (SecureStore on native, localStorage on web). */
export const deviceStorage = {
  get: async (key: string) => (isWeb ? window.localStorage.getItem(key) : SecureStore.getItemAsync(key)),
  set: async (key: string, value: string) =>
    isWeb ? window.localStorage.setItem(key, value) : SecureStore.setItemAsync(key, value),
  remove: async (key: string) => (isWeb ? window.localStorage.removeItem(key) : SecureStore.deleteItemAsync(key)),
};

function randomId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

let guestIdPromise: Promise<string> | null = null;

export const tokenStorage = {
  getAccessToken: () => deviceStorage.get(ACCESS_TOKEN_KEY),
  getRefreshToken: () => deviceStorage.get(REFRESH_TOKEN_KEY),
  async setTokens(accessToken: string, refreshToken: string) {
    await deviceStorage.set(ACCESS_TOKEN_KEY, accessToken);
    await deviceStorage.set(REFRESH_TOKEN_KEY, refreshToken);
  },
  async clear() {
    await deviceStorage.remove(ACCESS_TOKEN_KEY);
    await deviceStorage.remove(REFRESH_TOKEN_KEY);
  },
  /** Stable per-install id so a signed-out shopper's cart survives app restarts. */
  guestSessionId() {
    // Memoised so concurrent first calls can't each mint (and persist) a different id.
    guestIdPromise ??= (async () => {
      let id = await deviceStorage.get(GUEST_SESSION_KEY);
      if (!id) {
        id = randomId();
        await deviceStorage.set(GUEST_SESSION_KEY, id);
      }
      return id;
    })();
    return guestIdPromise;
  },
};
