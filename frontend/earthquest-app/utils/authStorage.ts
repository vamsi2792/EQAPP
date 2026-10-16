import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "authToken";
// Keys used by earlier versions of the app; read once for migration, then removed.
const LEGACY_KEYS = ["token", "user"];

// SecureStore (Keychain / Keystore) is unavailable on web, so fall back to AsyncStorage there.
const useSecureStore = Platform.OS !== "web";

export async function getToken(): Promise<string | null> {
  if (!useSecureStore) {
    return AsyncStorage.getItem(TOKEN_KEY);
  }

  const secure = await SecureStore.getItemAsync(TOKEN_KEY);
  if (secure) return secure;

  // One-time migration of a token saved in plain AsyncStorage by older builds.
  const legacy =
    (await AsyncStorage.getItem(TOKEN_KEY)) || (await AsyncStorage.getItem("token"));
  if (legacy) {
    await SecureStore.setItemAsync(TOKEN_KEY, legacy);
    await AsyncStorage.multiRemove([TOKEN_KEY, ...LEGACY_KEYS]);
  }
  return legacy;
}

export async function setToken(token: string): Promise<void> {
  if (useSecureStore) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await AsyncStorage.multiRemove([TOKEN_KEY, ...LEGACY_KEYS]);
  } else {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  }
}

export async function clearToken(): Promise<void> {
  if (useSecureStore) {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
  await AsyncStorage.multiRemove([TOKEN_KEY, ...LEGACY_KEYS]);
}
