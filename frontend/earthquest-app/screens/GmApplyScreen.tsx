import React, { useCallback, useContext, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthContext } from "../App";
import {
  Conduct,
  GmApiError,
  GmStanding,
  fetchConduct,
  fetchStanding,
  submitApplication,
} from "../utils/gmApi";

const MIN_MESSAGE = 20;
const MAX_MESSAGE = 500;

export default function GmApplyScreen({ navigation }: any) {
  const { logout } = useContext(AuthContext);

  const [standing, setStanding] = useState<GmStanding | null>(null);
  const [conduct, setConduct] = useState<Conduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [message, setMessage] = useState("");
  const [agreed, setAgreed] = useState(false);

  const handleError = useCallback(
    (err: unknown) => {
      if (err instanceof GmApiError && err.status === 401) {
        logout(); // saved login expired or was revoked
        return;
      }
      setError(err instanceof Error ? err.message : "Something went wrong");
    },
    [logout]
  );

  const load = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([fetchStanding(), fetchConduct()]);
      setStanding(s);
      setConduct(c);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Load on first show and again whenever the screen comes back into view.
  useFocusEffect(
    useCallback(() => {
      setError("");
      load();
    }, [load])
  );

  const submit = async () => {
    if (!conduct) return;
    setBusy(true);
    setError("");
    try {
      await submitApplication(message.trim(), conduct.version);
      setMessage("");
      setAgreed(false);
      await load();
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = agreed && message.trim().length >= MIN_MESSAGE && !busy;

  const renderBody = () => {
    if (!standing || !conduct) {
      return (
        <View style={styles.center}>
          {!!error && <Text style={styles.error}>{error}</Text>}
        </View>
      );
    }

    if (standing.state === "gm") {
      return (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>You are a Game Mentor 🎉</Text>
            <Text style={styles.muted}>
              You can create a club and get adventure codes for your table, approve who joins, and moderate your group.
            </Text>
          </View>
          <TouchableOpacity style={styles.primary} onPress={() => navigation.navigate("ClubModal")}>
            <Text style={styles.primaryText}>Go to my club</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondary} onPress={() => navigation.navigate("AdventureGroups")}>
            <Text style={styles.secondaryText}>Adventure groups</Text>
          </TouchableOpacity>
        </ScrollView>
      );
    }

    if (standing.state === "membership_required") {
      return (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Membership required</Text>
            <Text style={styles.muted}>
              Game Mentors are EarthQuest members. Become a member first, then come back here to apply.
            </Text>
          </View>
          <TouchableOpacity style={styles.primary} onPress={() => navigation.navigate("BecomeMember")}>
            <Text style={styles.primaryText}>About membership</Text>
          </TouchableOpacity>
        </ScrollView>
      );
    }

    if (standing.state === "pending") {
      return (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Application under review</Text>
            <Text style={styles.muted}>
              The EarthQuest team will look at it soon. Check back here for their decision.
            </Text>
            {!!standing.application && (
              <Text style={styles.quote}>“{standing.application.message}”</Text>
            )}
          </View>
        </ScrollView>
      );
    }

    // can_apply
    const last = standing.application;

    return (
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {last && last.status === "declined" && (
          <View style={[styles.card, styles.declinedCard]}>
            <Text style={styles.cardTitle}>Your last application was declined</Text>
            {!!last.decisionNote && <Text style={styles.muted}>{last.decisionNote}</Text>}
            <Text style={[styles.muted, { marginTop: 6 }]}>You are welcome to apply again.</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>What a Game Mentor does</Text>
        <Text style={styles.muted}>
          A Game Mentor leads a group of players through an adventure. You can create a club and adventure codes for your table, approve who joins, and moderate your group.
        </Text>

        <Text style={[styles.sectionTitle, { marginTop: 22 }]}>{conduct.title}</Text>
        {conduct.points.map((p, i) => (
          <Text key={i} style={styles.point}>
            • {p}
          </Text>
        ))}

        <Text style={[styles.sectionTitle, { marginTop: 22 }]}>Tell us about yourself</Text>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder="Why do you want to be a Game Mentor? Any experience leading groups?"
          placeholderTextColor="#8DBFA1"
          multiline
          maxLength={MAX_MESSAGE}
        />
        <Text style={styles.counter}>
          {message.trim().length}/{MAX_MESSAGE} (at least {MIN_MESSAGE})
        </Text>

        <TouchableOpacity style={styles.agreeRow} onPress={() => setAgreed(!agreed)} accessibilityRole="checkbox">
          <Text style={styles.checkbox}>{agreed ? "☑" : "☐"}</Text>
          <Text style={styles.agreeText}>I have read and agree to the code of conduct above.</Text>
        </TouchableOpacity>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.primary, !canSubmit && styles.disabled]}
          onPress={submit}
          disabled={!canSubmit}
        >
          {busy ? <ActivityIndicator color="#EAF4EE" /> : <Text style={styles.primaryText}>Send application</Text>}
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.headerAction}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Game Mentor</Text>
        <View style={{ width: 50 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#74B08A" />
        </View>
      ) : (
        renderBody()
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0E1A14" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1E5F3A",
  },
  title: { color: "#E8F5E9", fontSize: 20, fontWeight: "800" },
  headerAction: { color: "#74B08A", fontSize: 16, fontWeight: "600", width: 50 },

  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },

  sectionTitle: { color: "#E8F5E9", fontSize: 18, fontWeight: "800", marginBottom: 8 },
  muted: { color: "#8DBFA1", fontSize: 14, lineHeight: 20 },
  point: { color: "#EAF4EE", fontSize: 14, lineHeight: 21, marginBottom: 6 },
  quote: { color: "#BFE0CB", fontStyle: "italic", marginTop: 12, lineHeight: 20 },
  error: { color: "#FF8A80", textAlign: "center", marginVertical: 10 },

  card: {
    backgroundColor: "#13271C",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#1E5F3A",
    padding: 16,
    marginBottom: 14,
  },
  declinedCard: { borderColor: "#8E2B2B" },
  cardTitle: { color: "#E8F5E9", fontSize: 18, fontWeight: "800", marginBottom: 8 },

  input: {
    backgroundColor: "#13271C",
    color: "#EAF4EE",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E5F3A",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 110,
    textAlignVertical: "top",
  },
  counter: { color: "#8DBFA1", fontSize: 12, textAlign: "right", marginTop: 4 },

  agreeRow: { flexDirection: "row", alignItems: "center", marginTop: 16 },
  checkbox: { color: "#74B08A", fontSize: 26, marginRight: 10 },
  agreeText: { color: "#EAF4EE", fontSize: 14, flex: 1, lineHeight: 20 },

  primary: {
    backgroundColor: "#1E5F3A",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  primaryText: { color: "#EAF4EE", fontWeight: "700", fontSize: 15 },
  secondary: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#74B08A",
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },
  secondaryText: { color: "#74B08A", fontWeight: "700" },
  disabled: { opacity: 0.5 },
});
