import React, { useCallback, useContext, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthContext } from "../App";
import { AdventureApiError, CatalogueAdventure, fetchAdventures } from "../utils/adventureApi";

export default function AdventureSelectScreen({ navigation }: any) {
  const { logout } = useContext(AuthContext);
  const [adventures, setAdventures] = useState<CatalogueAdventure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setAdventures(await fetchAdventures());
    } catch (err) {
      if (err instanceof AdventureApiError && err.status === 401) {
        logout(); // saved login expired or was revoked
        return;
      }
      setError(err instanceof Error ? err.message : "Could not load the adventures");
    } finally {
      setLoading(false);
    }
  }, [logout]);

  // Load on first show and again whenever the screen comes back into view.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Choose Your Adventure</Text>

        {loading && <ActivityIndicator size="large" color="#74B08A" />}

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.error}>{error}</Text>
            <Pressable
              style={styles.retry}
              onPress={() => {
                setLoading(true);
                load();
              }}
            >
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        )}

        {!loading && !error && adventures.length === 0 && (
          <Text style={styles.empty}>No adventures are available yet.</Text>
        )}

        {adventures.map((adv) => (
          <Pressable
            key={adv.id}
            disabled={!adv.unlocked}
            style={[styles.card, !adv.unlocked && styles.lockedCard]}
            onPress={() => navigation.navigate("Map", { adventure: adv })}
          >
            <Text style={styles.cardTitle}>{adv.title}</Text>
            <Text style={styles.cardSubtitle}>{adv.subtitle}</Text>

            {!adv.unlocked && <Text style={styles.lock}>🔒 Locked</Text>}
          </Pressable>
        ))}

        <Pressable style={styles.groupsButton} onPress={() => navigation.navigate("MyAdventures")}>
          <Text style={styles.groupsTitle}>My adventures</Text>
          <Text style={styles.groupsText}>Enter a code from your Game Mentor, or see your codes</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0E1A14" },
  content: { padding: 20, flexGrow: 1, justifyContent: "center" },
  title: {
    fontSize: 26,
    color: "#E8F5E9",
    marginBottom: 30,
    fontWeight: "800",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#1E5F3A",
    padding: 20,
    borderRadius: 14,
    marginBottom: 15,
    borderColor: "#74B08A",
    borderWidth: 2,
  },
  lockedCard: { opacity: 0.5 },
  cardTitle: { fontSize: 18, color: "#EAF4EE", fontWeight: "700" },
  cardSubtitle: { fontSize: 14, color: "#A5D6A7", marginTop: 5 },
  lock: { marginTop: 10, color: "#FF6B6B" },

  errorBox: { alignItems: "center", marginBottom: 20 },
  error: { color: "#FF8A80", textAlign: "center", marginBottom: 12 },
  retry: {
    borderWidth: 1,
    borderColor: "#74B08A",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryText: { color: "#74B08A", fontWeight: "700" },
  empty: { color: "#8DBFA1", textAlign: "center", marginBottom: 20 },

  groupsButton: {
    backgroundColor: "#13271C",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#74B08A",
    padding: 18,
    marginTop: 10,
  },
  groupsTitle: { color: "#E8F5E9", fontSize: 17, fontWeight: "800" },
  groupsText: { color: "#8DBFA1", fontSize: 13, marginTop: 4 },
});
