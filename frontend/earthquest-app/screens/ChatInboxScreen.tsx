import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthContext } from "../App";
import {
  ChatApiError,
  ChatConversation,
  ChatUser,
  displayName,
  fetchContacts,
  fetchConversations,
  openConversation,
} from "../utils/chatApi";
import { getChatSocket } from "../utils/chatSocket";

const formatTime = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString()
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" });
};

export default function ChatInboxScreen({ navigation }: any) {
  const { logout } = useContext(AuthContext);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [pickerOpen, setPickerOpen] = useState(false);
  const [contacts, setContacts] = useState<ChatUser[] | null>(null);
  const [pickerError, setPickerError] = useState("");

  const handleError = useCallback(
    (err: unknown, setter: (m: string) => void) => {
      if (err instanceof ChatApiError && err.status === 401) {
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
      setConversations(await fetchConversations());
    } catch (err) {
      handleError(err, setError);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Refresh whenever the screen comes back into view (e.g. after leaving a chat).
  useEffect(() => navigation.addListener("focus", load), [navigation, load]);

  // Keep the list live: move/update a conversation as soon as a message arrives.
  useEffect(() => {
    const socket = getChatSocket();
    if (!socket) return;

    const onUpdated = ({ conversation }: { conversation: ChatConversation }) => {
      setConversations((prev) => [
        conversation,
        ...prev.filter((c) => c.id !== conversation.id),
      ]);
    };

    socket.on("conversation:updated", onUpdated);
    return () => {
      socket.off("conversation:updated", onUpdated);
    };
  }, []);

  const openPicker = async () => {
    setPickerOpen(true);
    setPickerError("");
    setContacts(null);
    try {
      setContacts(await fetchContacts());
    } catch (err) {
      handleError(err, setPickerError);
    }
  };

  const startChat = async (user: ChatUser) => {
    try {
      const conversation = await openConversation(user.id);
      setPickerOpen(false);
      navigation.navigate("Chat", {
        conversationId: conversation.id,
        otherId: conversation.other.id,
        otherName: displayName(conversation.other),
      });
    } catch (err) {
      handleError(err, setPickerError);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.headerAction}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity onPress={openPicker} hitSlop={12}>
          <Text style={styles.headerAction}>＋ New</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#74B08A" />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => c.id}
          contentContainerStyle={conversations.length === 0 && styles.emptyWrap}
          ListHeaderComponent={error ? <Text style={styles.error}>{error}</Text> : undefined}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptyText}>
                Tap “＋ New” to message a player from your club or adventure.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() =>
                navigation.navigate("Chat", {
                  conversationId: item.id,
                  otherId: item.other.id,
                  otherName: displayName(item.other),
                })
              }
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(item.other.firstName?.[0] || "?").toUpperCase()}
                </Text>
              </View>
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <Text style={styles.name} numberOfLines={1}>
                    {displayName(item.other)}
                  </Text>
                  {!!item.lastMessage && (
                    <Text style={styles.time}>{formatTime(item.lastMessage.at)}</Text>
                  )}
                </View>
                <Text style={styles.preview} numberOfLines={1}>
                  {item.lastMessage
                    ? `${item.lastMessage.sender === item.other.id ? "" : "You: "}${
                        item.lastMessage.text
                      }`
                    : "No messages yet"}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}

      {/* Who can I message? */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <SafeAreaView style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>New message</Text>
              <TouchableOpacity onPress={() => setPickerOpen(false)} hitSlop={12}>
                <Text style={styles.headerAction}>Close</Text>
              </TouchableOpacity>
            </View>

            {!!pickerError && <Text style={styles.error}>{pickerError}</Text>}

            {contacts === null && !pickerError ? (
              <ActivityIndicator style={{ marginTop: 30 }} color="#74B08A" />
            ) : (
              <FlatList
                data={contacts ?? []}
                keyExtractor={(u) => u.id}
                ListEmptyComponent={
                  !pickerError ? (
                    <Text style={styles.emptyText}>
                      No one to message yet. Join a club or enter an adventure code to play with
                      others, then you can chat with them here.
                    </Text>
                  ) : undefined
                }
                renderItem={({ item }) => (
                  <Pressable
                    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                    onPress={() => startChat(item)}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {(item.firstName?.[0] || "?").toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.rowBody}>
                      <Text style={styles.name}>{displayName(item)}</Text>
                      {!!item.username && <Text style={styles.preview}>@{item.username}</Text>}
                    </View>
                  </Pressable>
                )}
              />
            )}
          </SafeAreaView>
        </View>
      </Modal>
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

  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 30 },
  emptyWrap: { flexGrow: 1 },
  emptyTitle: { color: "#E8F5E9", fontSize: 18, fontWeight: "700", marginBottom: 8 },
  emptyText: { color: "#8DBFA1", fontSize: 14, textAlign: "center", padding: 20, lineHeight: 20 },
  error: { color: "#FF8A80", textAlign: "center", padding: 12 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#16301F",
  },
  rowPressed: { backgroundColor: "#13271C" },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1E5F3A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarText: { color: "#EAF4EE", fontSize: 18, fontWeight: "700" },
  rowBody: { flex: 1 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { color: "#EAF4EE", fontSize: 16, fontWeight: "700", flexShrink: 1 },
  time: { color: "#8DBFA1", fontSize: 12, marginLeft: 8 },
  preview: { color: "#8DBFA1", fontSize: 14, marginTop: 2 },

  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    maxHeight: "75%",
    minHeight: "40%",
    backgroundColor: "#0E1A14",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1.5,
    borderColor: "#74B08A",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
  },
  sheetTitle: { color: "#E8F5E9", fontSize: 18, fontWeight: "800" },
});
