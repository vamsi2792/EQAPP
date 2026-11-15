import React, { useCallback, useContext, useState } from "react";
import {
  ActivityIndicator,
  Linking,
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
import ConfirmSheet from "../components/ConfirmSheet";
import {
  ClubApiError,
  ClubFields,
  ClubPerson,
  MyClub,
  approveMember,
  assignModerator,
  banMember,
  createClub,
  declineMember,
  deleteClub,
  getMyClub,
  joinClub,
  kickMember,
  leaveClub,
  removeModerator,
  unbanMember,
  updateClub,
} from "../utils/clubApi";
import { displayName, openConversation } from "../utils/chatApi";
import { fetchProfile } from "../utils/profileApi";

type Tab = "members" | "requests" | "banned";
type Mode = "main" | "create" | "edit";

type Confirm = {
  title: string;
  message: string;
  label: string;
  danger?: boolean;
  action: () => Promise<unknown>;
};

const ROLE_LABEL = { gm: "Game Master", moderator: "Moderator", member: "Member" } as const;
const ROLE_COLOR = { gm: "#74B08A", moderator: "#FFD700", member: "#8DBFA1" } as const;

export default function ClubScreen({ navigation }: any) {
  const { logout } = useContext(AuthContext);

  const [data, setData] = useState<MyClub | null>(null);
  const [isGm, setIsGm] = useState(false);
  const [myId, setMyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [mode, setMode] = useState<Mode>("main");
  const [tab, setTab] = useState<Tab>("members");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [form, setForm] = useState({ clubName: "", bio: "", discord: "" });
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [confirmError, setConfirmError] = useState("");

  const handleError = useCallback(
    (err: unknown, setter: (m: string) => void = setError) => {
      if (err instanceof ClubApiError && err.status === 401) {
        logout(); // saved login expired or was revoked
        return;
      }
      setter(err instanceof Error ? err.message : "Something went wrong");
    },
    [logout]
  );

  const load = useCallback(async () => {
    try {
      setError("");
      const [club, profile] = await Promise.all([getMyClub(), fetchProfile()]);
      setData(club);
      setIsGm(profile.accountType === "gm");
      setMyId(profile.id);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Load when the screen first appears and again every time it comes back into view.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  /** Runs a club action, then refreshes the screen from the server. */
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await action();
      await load();
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
    try {
      await confirm.action();
      setConfirm(null);
      setExpandedId(null);
      await load();
    } catch (err) {
      handleError(err, setConfirmError);
    } finally {
      setBusy(false);
    }
  };

  const messagePerson = async (p: ClubPerson) => {
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

  const openDiscord = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      setError("Could not open the Discord link.");
    }
  };

  const submitForm = async () => {
    const fields: ClubFields = {
      clubName: form.clubName,
      bio: form.bio,
      discord: form.discord,
    };

    const ok = await run(() => (mode === "create" ? createClub(fields) : updateClub(fields)));
    if (ok) setMode("main");
  };

  const goBack = () => {
    if (mode !== "main") setMode("main");
    else navigation.goBack();
  };

  /* ===================== PIECES ===================== */

  const header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={goBack} hitSlop={12}>
        <Text style={styles.headerAction}>‹ Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{mode === "main" ? "Club" : mode === "create" ? "New club" : "Edit club"}</Text>
      <View style={{ width: 50 }} />
    </View>
  );

  const renderForm = () => (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Club name</Text>
      <TextInput
        style={styles.input}
        value={form.clubName}
        onChangeText={(t) => setForm({ ...form, clubName: t })}
        placeholder="e.g. Emerald Wardens"
        placeholderTextColor="#8DBFA1"
        maxLength={60}
      />

      <Text style={styles.label}>About the club</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={form.bio}
        onChangeText={(t) => setForm({ ...form, bio: t })}
        placeholder="What is your club about?"
        placeholderTextColor="#8DBFA1"
        multiline
        maxLength={300}
      />

      <Text style={styles.label}>Discord invite link (optional)</Text>
      <TextInput
        style={styles.input}
        value={form.discord}
        onChangeText={(t) => setForm({ ...form, discord: t })}
        placeholder="https://discord.gg/..."
        placeholderTextColor="#8DBFA1"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={200}
      />

      {!!error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.primary} onPress={submitForm} disabled={busy}>
        {busy ? (
          <ActivityIndicator color="#EAF4EE" />
        ) : (
          <Text style={styles.primaryText}>{mode === "create" ? "Create club" : "Save changes"}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  const renderNoClub = () => (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionTitle}>Join a club</Text>
      <Text style={styles.muted}>
        Ask your Game Master for the club code. They will approve your request.
      </Text>

      <View style={styles.joinRow}>
        <TextInput
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
          value={joinCode}
          onChangeText={setJoinCode}
          placeholder="Club code"
          placeholderTextColor="#8DBFA1"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={12}
        />
        <TouchableOpacity
          style={[styles.joinButton, (!joinCode.trim() || busy) && styles.disabled]}
          onPress={async () => {
            if (await run(() => joinClub(joinCode.trim()))) setJoinCode("");
          }}
          disabled={!joinCode.trim() || busy}
        >
          {busy ? <ActivityIndicator color="#EAF4EE" /> : <Text style={styles.primaryText}>Send request</Text>}
        </TouchableOpacity>
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      {isGm && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Lead your own club</Text>
          <Text style={styles.muted}>As a Game Master you can create a club and approve who joins.</Text>
          <TouchableOpacity
            style={styles.primary}
            onPress={() => {
              setForm({ clubName: "", bio: "", discord: "" });
              setError("");
              setMode("create");
            }}
          >
            <Text style={styles.primaryText}>＋ Create a club</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );

  const renderPending = (club: NonNullable<MyClub["club"]>) => (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Request sent</Text>
        <Text style={styles.muted}>
          Waiting for the Game Master of <Text style={styles.bold}>{club.name}</Text> to approve you.
        </Text>
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity
        style={styles.secondary}
        onPress={() =>
          askConfirm({
            title: "Cancel your request?",
            message: `Your request to join ${club.name} will be withdrawn.`,
            label: "Cancel request",
            action: leaveClub,
          })
        }
      >
        <Text style={styles.secondaryText}>Cancel request</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const personActions = (p: ClubPerson, myRole: "gm" | "moderator" | "member") => {
    const staff = myRole === "gm" || myRole === "moderator";
    const isSelf = p.id === myId;
    const removable =
      staff && !isSelf && p.role !== "gm" && (p.role !== "moderator" || myRole === "gm");
    const clubName = data?.club?.name ?? "the club";

    return (
      <View style={styles.actions}>
        {!isSelf && (
          <ActionButton label="Message" onPress={() => messagePerson(p)} disabled={busy} />
        )}

        {myRole === "gm" && !isSelf && p.role === "member" && (
          <ActionButton label="Make moderator" onPress={() => run(() => assignModerator(p.id))} disabled={busy} />
        )}
        {myRole === "gm" && p.role === "moderator" && (
          <ActionButton label="Remove moderator" onPress={() => run(() => removeModerator(p.id))} disabled={busy} />
        )}

        {removable && (
          <>
            <ActionButton
              label="Remove"
              danger
              disabled={busy}
              onPress={() =>
                askConfirm({
                  title: `Remove ${p.name}?`,
                  message: `${p.name} will leave ${clubName}. They can ask to join again.`,
                  label: "Remove",
                  danger: true,
                  action: () => kickMember(p.id),
                })
              }
            />
            <ActionButton
              label="Ban"
              danger
              disabled={busy}
              onPress={() =>
                askConfirm({
                  title: `Ban ${p.name}?`,
                  message: `${p.name} will be removed and cannot rejoin unless you unban them.`,
                  label: "Ban",
                  danger: true,
                  action: () => banMember(p.id),
                })
              }
            />
          </>
        )}
      </View>
    );
  };

  const renderClub = (view: MyClub) => {
    const club = view.club!;
    const myRole = view.myRole as "gm" | "moderator" | "member";
    const staff = myRole === "gm" || myRole === "moderator";
    const members = view.members ?? [];
    const pending = view.pending ?? [];
    const banned = view.banned ?? [];

    const tabs: { id: Tab; label: string; count: number }[] = [
      { id: "members", label: "Members", count: members.length },
      ...(staff
        ? [
            { id: "requests" as Tab, label: "Requests", count: pending.length },
            { id: "banned" as Tab, label: "Banned", count: banned.length },
          ]
        : []),
    ];

    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.clubName}>{club.name}</Text>
            <Text style={[styles.roleChip, { color: ROLE_COLOR[myRole] }]}>{ROLE_LABEL[myRole]}</Text>
          </View>
          <Text style={styles.code}>Club code: {club.code}</Text>
          {!!club.bio && <Text style={styles.bio}>{club.bio}</Text>}

          {!!club.discord && (
            <TouchableOpacity style={styles.secondary} onPress={() => openDiscord(club.discord!)}>
              <Text style={styles.secondaryText}>💬 Join our Discord</Text>
            </TouchableOpacity>
          )}

          {myRole === "gm" && (
            <TouchableOpacity
              style={styles.secondary}
              onPress={() => {
                setForm({ clubName: club.name, bio: club.bio ?? "", discord: club.discord ?? "" });
                setError("");
                setMode("edit");
              }}
            >
              <Text style={styles.secondaryText}>✏️ Edit club info</Text>
            </TouchableOpacity>
          )}
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.tabs}>
          {tabs.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.tab, tab === t.id && styles.tabOn]}
              onPress={() => {
                setTab(t.id);
                setExpandedId(null);
              }}
            >
              <Text style={[styles.tabText, tab === t.id && styles.tabTextOn]}>
                {t.label} ({t.count})
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === "members" &&
          members.map((p) => (
            <View key={p.id} style={styles.personCard}>
              <TouchableOpacity
                style={styles.personRow}
                onPress={() => setExpandedId(expandedId === p.id ? null : p.id)}
              >
                <Avatar name={p.name} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.personName}>
                    {p.name}
                    {p.id === myId ? " (you)" : ""}
                  </Text>
                  {!!p.username && <Text style={styles.muted}>@{p.username}</Text>}
                </View>
                {!!p.role && (
                  <Text style={[styles.roleChip, { color: ROLE_COLOR[p.role] }]}>{ROLE_LABEL[p.role]}</Text>
                )}
              </TouchableOpacity>
              {expandedId === p.id && personActions(p, myRole)}
            </View>
          ))}

        {tab === "requests" &&
          (pending.length === 0 ? (
            <Text style={styles.empty}>No pending requests.</Text>
          ) : (
            pending.map((p) => (
              <View key={p.id} style={styles.personCard}>
                <View style={styles.personRow}>
                  <Avatar name={p.name} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.personName}>{p.name}</Text>
                    {!!p.username && <Text style={styles.muted}>@{p.username}</Text>}
                  </View>
                </View>
                <View style={styles.actions}>
                  <ActionButton label="Approve" onPress={() => run(() => approveMember(p.id))} disabled={busy} />
                  <ActionButton label="Decline" danger onPress={() => run(() => declineMember(p.id))} disabled={busy} />
                </View>
              </View>
            ))
          ))}

        {tab === "banned" &&
          (banned.length === 0 ? (
            <Text style={styles.empty}>Nobody is banned.</Text>
          ) : (
            banned.map((p) => (
              <View key={p.id} style={styles.personCard}>
                <View style={styles.personRow}>
                  <Avatar name={p.name} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.personName}>{p.name}</Text>
                    {!!p.username && <Text style={styles.muted}>@{p.username}</Text>}
                  </View>
                </View>
                <View style={styles.actions}>
                  <ActionButton label="Unban" onPress={() => run(() => unbanMember(p.id))} disabled={busy} />
                </View>
              </View>
            ))
          ))}

        <View style={{ marginTop: 24 }}>
          {myRole === "gm" ? (
            <TouchableOpacity
              style={styles.dangerButton}
              onPress={() =>
                askConfirm({
                  title: "Delete this club?",
                  message: `${club.name} will be deleted and everyone in it will be removed. This cannot be undone.`,
                  label: "Delete club",
                  danger: true,
                  action: deleteClub,
                })
              }
            >
              <Text style={styles.primaryText}>Delete club</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.dangerButton}
              onPress={() =>
                askConfirm({
                  title: "Leave this club?",
                  message: `You will leave ${club.name}. You can ask to join again later.`,
                  label: "Leave club",
                  danger: true,
                  action: leaveClub,
                })
              }
            >
              <Text style={styles.primaryText}>Leave club</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    );
  };

  /* ===================== RENDER ===================== */

  let body: React.ReactNode;

  if (loading) {
    body = (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#74B08A" />
      </View>
    );
  } else if (mode !== "main") {
    body = renderForm();
  } else if (!data || !data.club || !data.myRole) {
    body = renderNoClub();
  } else if (data.myRole === "pending") {
    body = renderPending(data.club);
  } else {
    body = renderClub(data);
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

function Avatar({ name }: { name: string }) {
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{(name[0] || "?").toUpperCase()}</Text>
    </View>
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
  bold: { color: "#EAF4EE", fontWeight: "700" },
  empty: { color: "#8DBFA1", textAlign: "center", padding: 24 },
  error: { color: "#FF8A80", textAlign: "center", marginVertical: 10 },

  label: { color: "#BFE0CB", fontSize: 13, fontWeight: "700", marginBottom: 6, marginTop: 6 },
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
  multiline: { minHeight: 90, textAlignVertical: "top" },

  joinRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 },
  joinButton: {
    backgroundColor: "#1E5F3A",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    minWidth: 112,
    alignItems: "center",
  },

  primary: {
    backgroundColor: "#1E5F3A",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 14,
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
  },
  cardTitle: { color: "#E8F5E9", fontSize: 18, fontWeight: "800", marginBottom: 6 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  clubName: { color: "#E8F5E9", fontSize: 22, fontWeight: "800", flex: 1, marginRight: 8 },
  roleChip: { fontSize: 12, fontWeight: "800", marginTop: 4 },
  code: { color: "#8DBFA1", fontWeight: "700", marginTop: 6 },
  bio: { color: "#EAF4EE", fontSize: 15, lineHeight: 21, marginTop: 10 },

  tabs: { flexDirection: "row", gap: 8, marginTop: 18, marginBottom: 12 },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#16301F",
    alignItems: "center",
  },
  tabOn: { backgroundColor: "#1E5F3A", borderColor: "#74B08A" },
  tabText: { color: "#8DBFA1", fontWeight: "600", fontSize: 13 },
  tabTextOn: { color: "#EAF4EE" },

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

  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 12, paddingBottom: 12 },
  actionButton: {
    backgroundColor: "#1E5F3A",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  actionDanger: { backgroundColor: "#8E2B2B" },
  actionText: { color: "#EAF4EE", fontWeight: "700", fontSize: 13 },
});
