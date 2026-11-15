import React, { useCallback, useContext, useState } from "react";
import {
  ActivityIndicator,
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

import { AuthContext } from "../App";
import ConfirmSheet from "../components/ConfirmSheet";
import {
  AdventureApiError,
  CatalogueAdventure,
  GroupDetail,
  GroupPerson,
  GroupSummary,
  createCode,
  deleteGroup,
  enterCode,
  fetchAdventures,
  fetchGroup,
  fetchGroups,
  leaveGroup,
  newCode,
  removePlayer,
  setGroupActive,
} from "../utils/adventureApi";
import { displayName, openConversation } from "../utils/chatApi";
import { fetchProfile } from "../utils/profileApi";

type Confirm = {
  title: string;
  message: string;
  label: string;
  danger?: boolean;
  // Return "closed" when the action removed the group from the caller's view (leave/delete).
  action: () => Promise<unknown | "closed">;
};

export default function AdventureGroupsScreen({ navigation }: any) {
  const { logout } = useContext(AuthContext);

  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [adventures, setAdventures] = useState<CatalogueAdventure[]>([]);
  const [isGm, setIsGm] = useState(false);
  const [myId, setMyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [codeInput, setCodeInput] = useState("");
  const [detail, setDetail] = useState<GroupDetail | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [confirmError, setConfirmError] = useState("");

  const handleError = useCallback(
    (err: unknown, setter: (m: string) => void = setError) => {
      if (err instanceof AdventureApiError && err.status === 401) {
        logout(); // saved login expired or was revoked
        return;
      }
      setter(err instanceof Error ? err.message : "Something went wrong");
    },
    [logout]
  );

  const loadList = useCallback(async () => {
    try {
      const [list, catalogue, profile] = await Promise.all([
        fetchGroups(),
        fetchAdventures(),
        fetchProfile(),
      ]);
      setGroups(list);
      setAdventures(catalogue);
      setIsGm(profile.accountType === "gm");
      setMyId(profile.id);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const openDetail = useCallback(
    async (id: string) => {
      try {
        setDetail(await fetchGroup(id));
      } catch (err) {
        // The group may have been deleted or we were removed: fall back to the list.
        setDetail(null);
        handleError(err);
        await loadList();
      }
    },
    [handleError, loadList]
  );

  // Load on first show and again whenever the screen comes back into view.
  useFocusEffect(
    useCallback(() => {
      setError("");
      loadList();
    }, [loadList])
  );

  /** Runs an action, then refreshes the list (and the open group, if any). */
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      await loadList();
      if (detail) await openDetail(detail.id);
      return true;
    } catch (err) {
      handleError(err);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const askConfirm = (c: Confirm) => {
    setConfirmError("");
    setConfirm(c);
  };

  const runConfirmed = async () => {
    if (!confirm) return;
    setBusy(true);
    setConfirmError("");
    let closed = false;
    try {
      closed = (await confirm.action()) === "closed";
      setConfirm(null);
    } catch (err) {
      handleError(err, setConfirmError);
      setBusy(false);
      return;
    }
    setBusy(false);

    if (closed) setDetail(null); // back to the list: that group is gone for us
    await loadList();
    if (detail && !closed) await openDetail(detail.id);
  };

  const joinWithCode = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { group } = await enterCode(codeInput.trim());
      setCodeInput("");
      await loadList();
      setNotice(`You joined ${group.adventure.title}.`);
      await openDetail(group.id);
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  const getCodeFor = async (adventure: CatalogueAdventure) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { group } = await createCode(adventure.id);
      await loadList();
      await openDetail(group.id);
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  const shareCode = async (code: string, title: string) => {
    try {
      await Share.share({ message: `Join my ${title} group on EarthQuest! Code: ${code}` });
    } catch {
      setNotice(`Sharing isn't available here. Give players this code: ${code}`);
    }
  };

  const messagePlayer = async (p: GroupPerson) => {
    setBusy(true);
    setError("");
    try {
      const conversation = await openConversation(p.id);
      navigation.navigate("Chat", {
        conversationId: conversation.id,
        otherId: conversation.other.id,
        otherName: displayName(conversation.other),
      });
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  const goBack = () => {
    if (detail) {
      setDetail(null);
      setError("");
      setNotice("");
    } else {
      navigation.goBack();
    }
  };

  /* ===================== VIEWS ===================== */

  const header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={goBack} hitSlop={12}>
        <Text style={styles.headerAction}>‹ Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{detail ? "Group" : "Adventure groups"}</Text>
      <View style={{ width: 50 }} />
    </View>
  );

  const renderList = () => {
    const open = adventures.filter((a) => a.unlocked);

    return (
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>Enter a code</Text>
        <Text style={styles.muted}>
          Your Game Mentor can give you a code to join their group. Then you can see each other and chat.
        </Text>

        <View style={styles.joinRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            value={codeInput}
            onChangeText={setCodeInput}
            placeholder="Adventure code"
            placeholderTextColor="#8DBFA1"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={12}
          />
          <TouchableOpacity
            style={[styles.joinButton, (!codeInput.trim() || busy) && styles.disabled]}
            onPress={joinWithCode}
            disabled={!codeInput.trim() || busy}
          >
            {busy ? <ActivityIndicator color="#EAF4EE" /> : <Text style={styles.primaryText}>Join</Text>}
          </TouchableOpacity>
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}
        {!!notice && <Text style={styles.notice}>{notice}</Text>}

        {isGm && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Start a group</Text>
            <Text style={styles.muted}>
              Get a code for your table and share it with your players. You get one code per adventure.
            </Text>
            {open.length === 0 ? (
              <Text style={styles.muted}>No adventures are open yet.</Text>
            ) : (
              open.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  style={styles.secondary}
                  onPress={() => getCodeFor(a)}
                  disabled={busy}
                >
                  <Text style={styles.secondaryText}>Get a code for {a.title}</Text>
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Your groups</Text>
        {groups.length === 0 ? (
          <Text style={styles.empty}>You are not in any group yet.</Text>
        ) : (
          groups.map((g) => (
            <TouchableOpacity key={g.id} style={styles.card} onPress={() => openDetail(g.id)}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{g.adventure.title}</Text>
                <Text style={[styles.roleChip, g.role === "owner" && { color: "#74B08A" }]}>
                  {g.role === "owner" ? "Game Mentor" : "Player"}
                </Text>
              </View>
              {!!g.adventure.subtitle && <Text style={styles.muted}>{g.adventure.subtitle}</Text>}
              <Text style={styles.small}>
                {g.playerCount} {g.playerCount === 1 ? "player" : "players"}
                {g.role === "owner" && g.isActive === false ? " · joining paused" : ""}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    );
  };

  const renderDetail = (g: GroupDetail) => {
    const owner = g.role === "owner";

    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.clubName}>{g.adventure.title}</Text>
            <Text style={[styles.roleChip, owner && { color: "#74B08A" }]}>
              {owner ? "Game Mentor" : "Player"}
            </Text>
          </View>
          {!!g.adventure.subtitle && <Text style={styles.muted}>{g.adventure.subtitle}</Text>}

          {owner && !!g.code && (
            <>
              <Text style={styles.codeLabel}>Group code</Text>
              <Text style={styles.code} selectable>
                {g.code}
              </Text>
              <Text style={styles.small}>
                {g.isActive === false ? "Joining is paused: new players cannot use this code." : "Players can join with this code."}
              </Text>

              <TouchableOpacity
                style={styles.secondary}
                onPress={() => shareCode(g.code!, g.adventure.title)}
              >
                <Text style={styles.secondaryText}>Share code</Text>
              </TouchableOpacity>

              <View style={styles.actions}>
                <ActionButton
                  label={g.isActive === false ? "Resume joining" : "Pause joining"}
                  disabled={busy}
                  onPress={() => run(() => setGroupActive(g.id, g.isActive === false))}
                />
                <ActionButton
                  label="New code"
                  disabled={busy}
                  onPress={() =>
                    askConfirm({
                      title: "Create a new code?",
                      message:
                        "The old code will stop working. Players already in the group stay in it.",
                      label: "New code",
                      action: () => newCode(g.id),
                    })
                  }
                />
              </View>
            </>
          )}
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}
        {!!notice && <Text style={styles.notice}>{notice}</Text>}

        <Text style={[styles.sectionTitle, { marginTop: 22 }]}>Players ({g.players.length})</Text>
        {g.players.map((p) => (
          <View key={p.id} style={styles.personCard}>
            <View style={styles.personRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(p.name[0] || "?").toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.personName}>
                  {p.name}
                  {p.id === myId ? " (you)" : ""}
                </Text>
                {!!p.username && <Text style={styles.muted}>@{p.username}</Text>}
              </View>
              {p.role === "owner" && <Text style={[styles.roleChip, { color: "#74B08A" }]}>Game Mentor</Text>}
            </View>

            {p.id !== myId && (
              <View style={styles.actions}>
                <ActionButton label="Message" disabled={busy} onPress={() => messagePlayer(p)} />
                {owner && (
                  <ActionButton
                    label="Remove"
                    danger
                    disabled={busy}
                    onPress={() =>
                      askConfirm({
                        title: `Remove ${p.name}?`,
                        message: `${p.name} will leave this group. To keep them from rejoining, create a new code.`,
                        label: "Remove",
                        danger: true,
                        action: () => removePlayer(g.id, p.id),
                      })
                    }
                  />
                )}
              </View>
            )}
          </View>
        ))}

        <View style={{ marginTop: 24 }}>
          {owner ? (
            <TouchableOpacity
              style={styles.dangerButton}
              onPress={() =>
                askConfirm({
                  title: "Delete this group?",
                  message: "Everyone will be removed from the group and the code stops working. This cannot be undone.",
                  label: "Delete group",
                  danger: true,
                  action: async () => {
                    await deleteGroup(g.id);
                    return "closed";
                  },
                })
              }
            >
              <Text style={styles.primaryText}>Delete group</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.dangerButton}
              onPress={() =>
                askConfirm({
                  title: "Leave this group?",
                  message: "You will no longer see these players or be able to message them. You can rejoin with the code.",
                  label: "Leave group",
                  danger: true,
                  action: async () => {
                    await leaveGroup(g.id);
                    return "closed";
                  },
                })
              }
            >
              <Text style={styles.primaryText}>Leave group</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    );
  };

  let body: React.ReactNode;
  if (loading) {
    body = (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#74B08A" />
      </View>
    );
  } else if (detail) {
    body = renderDetail(detail);
  } else {
    body = renderList();
  }

  return (
    <SafeAreaView style={styles.container}>
      {header}
      {body}

      <ConfirmSheet
        visible={!!confirm}
        title={confirm?.title ?? ""}
        message={confirm?.message ?? ""}
        confirmLabel={confirm?.label ?? "Confirm"}
        danger={confirm?.danger}
        busy={busy}
        error={confirmError}
        onConfirm={runConfirmed}
        onCancel={() => setConfirm(null)}
      />
    </SafeAreaView>
  );
}

function ActionButton({
  label,
  onPress,
  danger,
  disabled,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.actionButton, danger && styles.actionDanger, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.actionText}>{label}</Text>
    </TouchableOpacity>
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
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  sectionTitle: { color: "#E8F5E9", fontSize: 18, fontWeight: "800", marginBottom: 6 },
  muted: { color: "#8DBFA1", fontSize: 14, lineHeight: 20 },
  small: { color: "#8DBFA1", fontSize: 12, marginTop: 6 },
  empty: { color: "#8DBFA1", textAlign: "center", padding: 20 },
  error: { color: "#FF8A80", textAlign: "center", marginVertical: 10 },
  notice: { color: "#BFE0CB", textAlign: "center", marginVertical: 10 },

  input: {
    backgroundColor: "#13271C",
    color: "#EAF4EE",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E5F3A",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 10,
  },
  joinRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 },
  joinButton: {
    backgroundColor: "#1E5F3A",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 13,
    minWidth: 80,
    alignItems: "center",
  },

  primaryText: { color: "#EAF4EE", fontWeight: "700", fontSize: 15 },
  secondary: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#74B08A",
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
  },
  secondaryText: { color: "#74B08A", fontWeight: "700" },
  dangerButton: {
    backgroundColor: "#8E2B2B",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  disabled: { opacity: 0.5 },

  card: {
    backgroundColor: "#13271C",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#1E5F3A",
    padding: 16,
    marginBottom: 10,
  },
  cardTitle: { color: "#E8F5E9", fontSize: 17, fontWeight: "800", flex: 1, marginRight: 8 },
  clubName: { color: "#E8F5E9", fontSize: 22, fontWeight: "800", flex: 1, marginRight: 8 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  roleChip: { color: "#8DBFA1", fontSize: 12, fontWeight: "800", marginTop: 4 },

  codeLabel: { color: "#BFE0CB", fontSize: 13, fontWeight: "700", marginTop: 16 },
  code: { color: "#EAF4EE", fontSize: 34, fontWeight: "800", letterSpacing: 6, marginTop: 2 },

  personCard: {
    backgroundColor: "#13271C",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#16301F",
    marginBottom: 8,
  },
  personRow: { flexDirection: "row", alignItems: "center", padding: 12 },
  personName: { color: "#EAF4EE", fontSize: 16, fontWeight: "700" },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1E5F3A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: { color: "#EAF4EE", fontSize: 17, fontWeight: "700" },

  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 12, paddingBottom: 12, marginTop: 8 },
  actionButton: {
    backgroundColor: "#1E5F3A",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  actionDanger: { backgroundColor: "#8E2B2B" },
  actionText: { color: "#EAF4EE", fontWeight: "700", fontSize: 13 },
});
