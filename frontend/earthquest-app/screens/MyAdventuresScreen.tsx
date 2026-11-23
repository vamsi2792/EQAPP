import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AdventureApiError,
  MyAdventure,
  enterCode,
  fetchMine,
  newMemberCode,
  setAdventureActive,
} from "../utils/adventureApi";

const STORE_URL = process.env.EXPO_PUBLIC_STORE_URL || "https://earthquest.com";

export default function MyAdventuresScreen() {
  const [list, setList] = useState<MyAdventure[] | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const fail = (err: unknown) =>
    setError(err instanceof AdventureApiError ? err.message : "Something went wrong");

  const load = useCallback(async () => {
    try {
      setList(await fetchMine());
    } catch (err) {
      fail(err);
      setList((prev) => prev ?? []);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const run = async (action: () => Promise<MyAdventure[] | unknown>, done?: string) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await action();
      if (Array.isArray(result)) setList(result as MyAdventure[]);
      else await load();
      if (done) setNotice(done);
      return true;
    } catch (err) {
      fail(err);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const share = (label: string, value: string) =>
    Share.share({ message: `${label}: ${value}` }).catch(() => undefined);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>My adventures</Text>

        <Text style={styles.section}>Enter a code</Text>
        <Text style={styles.muted}>
          Your Game Mentor gives you a code for their adventure. You need to be an approved member
          of their club.
        </Text>
        <View style={styles.row}>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            placeholder="Adventure code"
            placeholderTextColor="#8DBFA1"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={12}
          />
          <TouchableOpacity
            style={[styles.button, (!code.trim() || busy) && styles.disabled]}
            disabled={!code.trim() || busy}
            onPress={async () => {
              if (await run(() => enterCode(code.trim()), "You're in!")) setCode("");
            }}
          >
            <Text style={styles.buttonText}>Join</Text>
          </TouchableOpacity>
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}
        {!!notice && <Text style={styles.notice}>{notice}</Text>}

        {list === null && <ActivityIndicator color="#74B08A" style={{ marginTop: 24 }} />}

        {list !== null && list.length === 0 && (
          <Text style={[styles.muted, { marginTop: 24 }]}>
            You have no adventures yet. Buy one on our website, or ask your Game Mentor for a code.
          </Text>
        )}

        {(list || []).map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.cardTitle}>{item.adventure.title}</Text>
            {!!item.adventure.subtitle && <Text style={styles.cardSub}>{item.adventure.subtitle}</Text>}
            <Text style={styles.muted}>
              {item.role === "owner" ? "You are the Game Mentor" : "You are playing"} ·{" "}
              {item.playerCount} {item.playerCount === 1 ? "player" : "players"}
            </Text>

            {item.role === "owner" && (
              <>
                <Text style={styles.codeLabel}>Code for your club members</Text>
                <TouchableOpacity onPress={() => share("Adventure code", item.memberCode || "")}>
                  <Text style={styles.code}>{item.memberCode}</Text>
                </TouchableOpacity>
                {item.isActive === false && <Text style={styles.paused}>Paused: nobody can join</Text>}

                {!!item.gmCode && (
                  <>
                    <Text style={styles.codeLabel}>Game Mentor code (keep private)</Text>
                    <Text style={styles.code}>{item.gmCode}</Text>
                  </>
                )}

                <View style={styles.row}>
                  <TouchableOpacity
                    style={[styles.secondary, busy && styles.disabled]}
                    disabled={busy}
                    onPress={() => run(() => newMemberCode(item.id), "New member code created")}
                  >
                    <Text style={styles.secondaryText}>New member code</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.secondary, busy && styles.disabled]}
                    disabled={busy}
                    onPress={() => run(() => setAdventureActive(item.id, item.isActive === false))}
                  >
                    <Text style={styles.secondaryText}>
                      {item.isActive === false ? "Resume joining" : "Pause joining"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        ))}

        <TouchableOpacity style={styles.link} onPress={() => Linking.openURL(STORE_URL)}>
          <Text style={styles.linkText}>Buy adventures on our website ↗</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0E1A14" },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 26, color: "#E8F5E9", fontWeight: "800", marginBottom: 20 },
  section: { fontSize: 18, color: "#EAF4EE", fontWeight: "700", marginBottom: 6 },
  muted: { color: "#8DBFA1", marginBottom: 10 },
  row: { flexDirection: "row", gap: 10, marginTop: 6 },
  input: {
    flex: 1,
    backgroundColor: "#16261D",
    borderColor: "#2E5A41",
    borderWidth: 1,
    borderRadius: 10,
    color: "#EAF4EE",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  button: {
    backgroundColor: "#1E5F3A",
    borderColor: "#74B08A",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  buttonText: { color: "#EAF4EE", fontWeight: "700" },
  disabled: { opacity: 0.5 },
  error: { color: "#FF8A80", marginTop: 10 },
  notice: { color: "#A5D6A7", marginTop: 10 },
  card: {
    backgroundColor: "#16261D",
    borderColor: "#2E5A41",
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginTop: 18,
  },
  cardTitle: { fontSize: 18, color: "#EAF4EE", fontWeight: "700" },
  cardSub: { color: "#A5D6A7", marginTop: 2, marginBottom: 6 },
  codeLabel: { color: "#8DBFA1", marginTop: 12, fontSize: 12 },
  code: { color: "#EAF4EE", fontSize: 24, fontWeight: "800", letterSpacing: 3 },
  paused: { color: "#FFB74D", marginTop: 4 },
  secondary: {
    flex: 1,
    borderColor: "#74B08A",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 14,
    alignItems: "center",
  },
  secondaryText: { color: "#74B08A", fontWeight: "700", textAlign: "center" },
  link: { marginTop: 28, alignItems: "center" },
  linkText: { color: "#74B08A", fontWeight: "700" },
});
