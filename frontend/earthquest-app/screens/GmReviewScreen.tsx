import React, { useCallback, useContext, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthContext } from "../App";
import ConfirmSheet from "../components/ConfirmSheet";
import {
  AdminApplication,
  GameMentor,
  GmApiError,
  GmImpact,
  approveApplication,
  declineApplication,
  fetchApplications,
  fetchGameMentors,
  revokeGameMentor,
} from "../utils/gmApi";

type Tab = "pending" | "mentors";
type Deciding = { application: AdminApplication; kind: "approve" | "decline" };

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });

/** Plain-language list of what revoking this Game Mentor will delete. */
const describeImpact = (impact: GmImpact) => {
  const parts: string[] = [];

  if (impact.club) {
    parts.push(
      `their club "${impact.club.name}" (${impact.club.members} other ${impact.club.members === 1 ? "member" : "members"})`
    );
  }
  if (impact.groups > 0) {
    parts.push(
      `${impact.groups} adventure ${impact.groups === 1 ? "group" : "groups"} (${impact.groupPlayers} other ${impact.groupPlayers === 1 ? "player" : "players"})`
    );
  }

  return parts.length === 0
    ? "They have no club or groups, so nothing else will be deleted."
    : `This will delete ${parts.join(" and ")}. Everyone in them is removed and will no longer be connected.`;
};

export default function GmReviewScreen({ navigation }: any) {
  const { logout } = useContext(AuthContext);

  const [tab, setTab] = useState<Tab>("pending");
  const [pending, setPending] = useState<AdminApplication[]>([]);
  const [mentors, setMentors] = useState<GameMentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [deciding, setDeciding] = useState<Deciding | null>(null);
  const [note, setNote] = useState("");
  const [decisionError, setDecisionError] = useState("");

  const [revoking, setRevoking] = useState<GameMentor | null>(null);
  const [revokeError, setRevokeError] = useState("");

  const handleError = useCallback(
    (err: unknown, setter: (m: string) => void = setError) => {
      if (err instanceof GmApiError && err.status === 401) {
        logout(); // saved login expired or was revoked
        return;
      }
      setter(err instanceof Error ? err.message : "Something went wrong");
    },
    [logout]
  );

  const load = useCallback(async () => {
    try {
      const [p, m] = await Promise.all([fetchApplications("pending"), fetchGameMentors()]);
      setPending(p);
      setMentors(m);
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

  const decide = async () => {
    if (!deciding) return;
    setBusy(true);
    setDecisionError("");
    try {
      const { application, kind } = deciding;
      if (kind === "approve") await approveApplication(application.id, note);
      else await declineApplication(application.id, note);
      setDeciding(null);
      setNote("");
      await load();
    } catch (err) {
      handleError(err, setDecisionError);
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    if (!revoking) return;
    setBusy(true);
    setRevokeError("");
    try {
      await revokeGameMentor(revoking.id);
      setRevoking(null);
      await load();
    } catch (err) {
      handleError(err, setRevokeError);
    } finally {
      setBusy(false);
    }
  };

  const openDecision = (application: AdminApplication, kind: "approve" | "decline") => {
    setNote("");
    setDecisionError("");
    setDeciding({ application, kind });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.headerAction}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Game Mentors</Text>
        <TouchableOpacity onPress={load} hitSlop={12}>
          <Text style={styles.headerAction}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {(
          [
            { id: "pending", label: `Applications (${pending.length})` },
            { id: "mentors", label: `Game Mentors (${mentors.length})` },
          ] as { id: Tab; label: string }[]
        ).map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tab, tab === t.id && styles.tabOn]}
            onPress={() => setTab(t.id)}
          >
            <Text style={[styles.tabText, tab === t.id && styles.tabTextOn]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#74B08A" />
        </View>
      ) : tab === "pending" ? (
        <FlatList
          data={pending}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ padding: 14 }}
          ListEmptyComponent={<Text style={styles.empty}>No applications waiting. 🎉</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.applicant?.name ?? "Unknown player"}</Text>
              <Text style={styles.meta}>
                {item.applicant?.username ? `@${item.applicant.username} · ` : ""}
                {item.applicant?.email} · applied {formatWhen(item.createdAt)}
              </Text>
              <Text style={styles.message}>“{item.message}”</Text>

              <View style={styles.actions}>
                <TouchableOpacity style={styles.approve} onPress={() => openDecision(item, "approve")}>
                  <Text style={styles.buttonText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.decline} onPress={() => openDecision(item, "decline")}>
                  <Text style={styles.buttonText}>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={mentors}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 14 }}
          ListEmptyComponent={<Text style={styles.empty}>There are no Game Mentors yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.username ? `@${item.username} · ` : ""}
                {item.email}
              </Text>
              <Text style={styles.message}>
                {item.impact.club
                  ? `Runs “${item.impact.club.name}” with ${item.impact.club.members} other ${item.impact.club.members === 1 ? "member" : "members"}. `
                  : "No club. "}
                {item.impact.groups} adventure {item.impact.groups === 1 ? "group" : "groups"}.
              </Text>

              <TouchableOpacity
                style={[styles.decline, { marginTop: 12 }]}
                onPress={() => {
                  setRevokeError("");
                  setRevoking(item);
                }}
              >
                <Text style={styles.buttonText}>Revoke Game Mentor status</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Approve / decline, with an optional note the applicant will see */}
      <Modal visible={!!deciding} transparent animationType="fade" onRequestClose={() => setDeciding(null)}>
        <Pressable style={styles.backdrop} onPress={() => setDeciding(null)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>
              {deciding?.kind === "approve" ? "Approve" : "Decline"} {deciding?.application.applicant?.name}?
            </Text>
            <Text style={styles.sheetText}>
              {deciding?.kind === "approve"
                ? "They become a Game Mentor and can create clubs and adventure codes."
                : "They stay a member and can apply again."}{" "}
              You can add a note they will see.
            </Text>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="Note (optional)"
              placeholderTextColor="#8DBFA1"
              multiline
              maxLength={300}
            />
            {!!decisionError && <Text style={styles.error}>{decisionError}</Text>}
            <TouchableOpacity
              style={[styles.sheetPrimary, deciding?.kind === "decline" && styles.sheetDanger]}
              onPress={decide}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#EAF4EE" />
              ) : (
                <Text style={styles.buttonText}>{deciding?.kind === "approve" ? "Approve" : "Decline"}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetCancel} onPress={() => setDeciding(null)} disabled={busy}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Revoking deletes things, so it spells out exactly what */}
      <ConfirmSheet
        visible={!!revoking}
        title={`Revoke ${revoking?.name ?? ""}?`}
        message={
          revoking
            ? `${revoking.name} goes back to being a regular member and can no longer create clubs or adventure codes. ${describeImpact(revoking.impact)} This cannot be undone.`
            : ""
        }
        confirmLabel="Revoke and delete"
        danger
        busy={busy}
        error={revokeError}
        onConfirm={revoke}
        onCancel={() => setRevoking(null)}
      />
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
  headerAction: { color: "#74B08A", fontSize: 16, fontWeight: "600" },

  tabs: { flexDirection: "row", padding: 12, gap: 8 },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#16301F",
  },
  tabOn: { backgroundColor: "#1E5F3A", borderColor: "#74B08A" },
  tabText: { color: "#8DBFA1", fontWeight: "600", fontSize: 13 },
  tabTextOn: { color: "#EAF4EE" },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { color: "#8DBFA1", textAlign: "center", padding: 40 },
  error: { color: "#FF8A80", textAlign: "center", padding: 8 },

  card: {
    backgroundColor: "#13271C",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E5F3A",
    padding: 14,
    marginBottom: 12,
  },
  cardTitle: { color: "#EAF4EE", fontSize: 17, fontWeight: "800" },
  meta: { color: "#8DBFA1", fontSize: 12, marginTop: 4 },
  message: { color: "#BFE0CB", fontSize: 14, lineHeight: 20, marginTop: 10 },

  actions: { flexDirection: "row", gap: 8, marginTop: 12 },
  approve: { flex: 1, backgroundColor: "#1E5F3A", borderRadius: 10, paddingVertical: 11, alignItems: "center" },
  decline: { flex: 1, backgroundColor: "#8E2B2B", borderRadius: 10, paddingVertical: 11, alignItems: "center" },
  buttonText: { color: "#EAF4EE", fontWeight: "700" },

  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: {
    backgroundColor: "#0E1A14",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1.5,
    borderColor: "#74B08A",
    padding: 20,
    paddingBottom: 30,
  },
  sheetTitle: { color: "#E8F5E9", fontSize: 18, fontWeight: "800", marginBottom: 10 },
  sheetText: { color: "#8DBFA1", fontSize: 14, lineHeight: 20, marginBottom: 12 },
  noteInput: {
    backgroundColor: "#13271C",
    color: "#EAF4EE",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1E5F3A",
    padding: 10,
    minHeight: 60,
    textAlignVertical: "top",
  },
  sheetPrimary: {
    backgroundColor: "#1E5F3A",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 12,
  },
  sheetDanger: { backgroundColor: "#8E2B2B" },
  sheetCancel: { paddingVertical: 13, alignItems: "center" },
  sheetCancelText: { color: "#8DBFA1", fontSize: 15, fontWeight: "600" },
});
