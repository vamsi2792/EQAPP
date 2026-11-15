import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthContext } from "../App";
import {
  ChatApiError,
  ChatMessage,
  fetchMessages,
  sendMessageRest,
} from "../utils/chatApi";
import { getChatSocket, sendOverSocket } from "../utils/chatSocket";

const MAX_LENGTH = 1000;

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function ChatScreen({ route, navigation }: any) {
  const { conversationId, otherId, otherName } = route.params as {
    conversationId: string;
    otherId: string;
    otherName: string;
  };
  const { logout } = useContext(AuthContext);

  // Newest first (the list is inverted, so index 0 sits at the bottom).
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const handleError = useCallback(
    (err: unknown) => {
      if (err instanceof ChatApiError && err.status === 401) {
        logout();
        return;
      }
      setError(err instanceof Error ? err.message : "Something went wrong");
    },
    [logout]
  );

  // Adds a message once, even if it arrives both as the send acknowledgement and as a push.
  const addMessage = useCallback((m: ChatMessage) => {
    setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [m, ...prev]));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const page = await fetchMessages(conversationId);
        setMessages(page);
        setHasMore(page.length >= 30);
      } catch (err) {
        handleError(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [conversationId, handleError]);

  // Live messages for this conversation.
  useEffect(() => {
    const socket = getChatSocket();
    if (!socket) return;

    const onNew = ({ message }: { message: ChatMessage }) => {
      if (message.conversation === conversationId) addMessage(message);
    };

    socket.on("message:new", onNew);
    return () => {
      socket.off("message:new", onNew);
    };
  }, [conversationId, addMessage]);

  const loadOlder = async () => {
    if (loadingOlder || !hasMore || messages.length === 0) return;
    setLoadingOlder(true);
    try {
      const page = await fetchMessages(conversationId, messages[messages.length - 1].createdAt);
      setMessages((prev) => [...prev, ...page.filter((m) => !prev.some((x) => x.id === m.id))]);
      setHasMore(page.length >= 30);
    } catch (err) {
      handleError(err);
    } finally {
      setLoadingOlder(false);
    }
  };

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;

    setSending(true);
    setError("");

    try {
      // Prefer the live socket; fall back to HTTP if it is not connected right now.
      const ack = await sendOverSocket(conversationId, body);

      if (ack.ok) {
        addMessage(ack.message);
      } else if (ack.message === "Not connected" || ack.message === "No response from server") {
        addMessage(await sendMessageRest(conversationId, body));
      } else {
        throw new Error(ack.message);
      }

      setText("");
    } catch (err) {
      handleError(err); // the draft stays in the box so nothing is lost
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {otherName}
        </Text>
        <View style={{ width: 50 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#74B08A" />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            inverted
            data={messages}
            keyExtractor={(m) => m.id}
            onEndReached={loadOlder}
            onEndReachedThreshold={0.3}
            contentContainerStyle={styles.listContent}
            ListFooterComponent={
              loadingOlder ? <ActivityIndicator style={{ margin: 12 }} color="#74B08A" /> : undefined
            }
            ListEmptyComponent={
              <Text style={[styles.empty, { transform: [{ scaleY: -1 }] }]}>
                Say hello to {otherName}!
              </Text>
            }
            renderItem={({ item }) => {
              const mine = item.sender !== otherId;
              return (
                <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    <Text style={styles.bubbleText}>{item.text}</Text>
                    <Text style={styles.bubbleTime}>{formatTime(item.createdAt)}</Text>
                  </View>
                </View>
              );
            }}
          />
        )}

        {!!error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Message"
            placeholderTextColor="#8DBFA1"
            multiline
            maxLength={MAX_LENGTH}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!text.trim() || sending) && styles.sendDisabled]}
            onPress={send}
            disabled={!text.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator color="#EAF4EE" />
            ) : (
              <Text style={styles.sendText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  back: { color: "#74B08A", fontSize: 16, fontWeight: "600", width: 50 },
  title: { color: "#E8F5E9", fontSize: 18, fontWeight: "800", flex: 1, textAlign: "center" },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { color: "#8DBFA1", textAlign: "center", padding: 30 },
  listContent: { paddingHorizontal: 14, paddingVertical: 10 },

  bubbleRow: { marginVertical: 3, flexDirection: "row" },
  rowMine: { justifyContent: "flex-end" },
  rowTheirs: { justifyContent: "flex-start" },
  bubble: { maxWidth: "80%", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMine: { backgroundColor: "#1E5F3A", borderBottomRightRadius: 4 },
  bubbleTheirs: {
    backgroundColor: "#16301F",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#1E5F3A",
  },
  bubbleText: { color: "#EAF4EE", fontSize: 15, lineHeight: 20 },
  bubbleTime: { color: "#8DBFA1", fontSize: 10, alignSelf: "flex-end", marginTop: 3 },

  error: { color: "#FF8A80", textAlign: "center", paddingVertical: 6, paddingHorizontal: 14 },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#1E5F3A",
  },
  input: {
    flex: 1,
    maxHeight: 110,
    backgroundColor: "#13271C",
    color: "#EAF4EE",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#1E5F3A",
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: "#1E5F3A",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 11,
    minWidth: 62,
    alignItems: "center",
  },
  sendDisabled: { opacity: 0.5 },
  sendText: { color: "#EAF4EE", fontWeight: "700" },
});
