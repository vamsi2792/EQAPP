import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
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
  REPORT_REASONS,
  ReportReason,
  blockUser,
  fetchBlocks,
  fetchMessages,
  reportMessage,
  sendMessageRest,
  unblockUser,
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

  // Blocking and reporting
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [reportTarget, setReportTarget] = useState<ChatMessage | null>(null);
  const [reportReason, setReportReason] = useState<ReportReason | null>(null);
  const [reportNote, setReportNote] = useState("");
  const [reportSent, setReportSent] = useState(false);
  const [sheetError, setSheetError] = useState("");

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

  // Whether I have blocked this player (drives the banner and the menu label).
  useEffect(() => {
    fetchBlocks()
      .then((ids) => setBlockedByMe(ids.includes(otherId)))
      .catch(() => {});
  }, [otherId]);

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

  const toggleBlock = async () => {
    setWorking(true);
    setSheetError("");
    try {
      if (blockedByMe) await unblockUser(otherId);
      else await blockUser(otherId);
      setBlockedByMe(!blockedByMe);
      setMenuOpen(false);
    } catch (err) {
      setSheetError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setWorking(false);
    }
  };

  const openReport = (message: ChatMessage) => {
    setReportTarget(message);
    setReportReason(null);
    setReportNote("");
    setReportSent(false);
    setSheetError("");
  };

  const closeReport = () => setReportTarget(null);

  const submitReport = async () => {
    if (!reportTarget || !reportReason) return;
    setWorking(true);
    setSheetError("");
    try {
      await reportMessage(reportTarget.id, reportReason, reportNote);
      setReportSent(true);
    } catch (err) {
      setSheetError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setWorking(false);
    }
  };

  const blockAfterReport = async () => {
    setWorking(true);
    try {
      await blockUser(otherId);
      setBlockedByMe(true);
      closeReport();
    } catch (err) {
      setSheetError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setWorking(false);
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
        <TouchableOpacity
          onPress={() => {
            setSheetError("");
            setMenuOpen(true);
          }}
          hitSlop={12}
          accessibilityLabel="Chat options"
          style={styles.menuButton}
        >
          <Text style={styles.menuDots}>⋯</Text>
        </TouchableOpacity>
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
                  <Pressable
                    // Long-press a message from the other player to report it.
                    onLongPress={mine ? undefined : () => openReport(item)}
                    delayLongPress={350}
                    style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}
                  >
                    <Text style={styles.bubbleText}>{item.text}</Text>
                    <Text style={styles.bubbleTime}>{formatTime(item.createdAt)}</Text>
                  </Pressable>
                </View>
              );
            }}
          />
        )}

        {!!error && <Text style={styles.error}>{error}</Text>}

        {blockedByMe ? (
          <View style={styles.blockedBar}>
            <Text style={styles.blockedText}>
              You blocked {otherName}. Unblock them to send messages.
            </Text>
            <TouchableOpacity onPress={toggleBlock} disabled={working}>
              <Text style={styles.blockedAction}>Unblock</Text>
            </TouchableOpacity>
          </View>
        ) : (
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
        )}
      </KeyboardAvoidingView>

      {/* ⋯ menu: block / unblock */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setMenuOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>
              {blockedByMe ? `Unblock ${otherName}?` : `Block ${otherName}?`}
            </Text>
            <Text style={styles.sheetText}>
              {blockedByMe
                ? "You will both be able to message each other again."
                : "Neither of you will be able to send messages to the other. You can still read your past messages, and they are not told that you blocked them."}
            </Text>
            {!!sheetError && <Text style={styles.error}>{sheetError}</Text>}
            <TouchableOpacity
              style={[styles.sheetPrimary, !blockedByMe && styles.sheetDanger]}
              onPress={toggleBlock}
              disabled={working}
            >
              {working ? (
                <ActivityIndicator color="#EAF4EE" />
              ) : (
                <Text style={styles.sheetPrimaryText}>{blockedByMe ? "Unblock" : "Block"}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetCancel} onPress={() => setMenuOpen(false)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Report a message */}
      <Modal visible={!!reportTarget} transparent animationType="slide" onRequestClose={closeReport}>
        <Pressable style={styles.sheetBackdrop} onPress={closeReport}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            {reportSent ? (
              <>
                <Text style={styles.sheetTitle}>Report sent</Text>
                <Text style={styles.sheetText}>
                  Thank you. An admin will review it.{blockedByMe ? "" : " You can also block this player."}
                </Text>
                {!!sheetError && <Text style={styles.error}>{sheetError}</Text>}
                {!blockedByMe && (
                  <TouchableOpacity
                    style={[styles.sheetPrimary, styles.sheetDanger]}
                    onPress={blockAfterReport}
                    disabled={working}
                  >
                    {working ? (
                      <ActivityIndicator color="#EAF4EE" />
                    ) : (
                      <Text style={styles.sheetPrimaryText}>Block {otherName}</Text>
                    )}
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.sheetCancel} onPress={closeReport}>
                  <Text style={styles.sheetCancelText}>Done</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.sheetTitle}>Report this message</Text>
                {!!reportTarget && (
                  <Text style={styles.reportQuote} numberOfLines={3}>
                    “{reportTarget.text}”
                  </Text>
                )}
                {REPORT_REASONS.map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.reasonRow, reportReason === r.id && styles.reasonRowOn]}
                    onPress={() => setReportReason(r.id)}
                  >
                    <Text style={styles.reasonText}>
                      {reportReason === r.id ? "◉ " : "○ "}
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TextInput
                  style={styles.noteInput}
                  value={reportNote}
                  onChangeText={setReportNote}
                  placeholder="Add details (optional)"
                  placeholderTextColor="#8DBFA1"
                  multiline
                  maxLength={500}
                />
                {!!sheetError && <Text style={styles.error}>{sheetError}</Text>}
                <TouchableOpacity
                  style={[styles.sheetPrimary, !reportReason && styles.sendDisabled]}
                  onPress={submitReport}
                  disabled={!reportReason || working}
                >
                  {working ? (
                    <ActivityIndicator color="#EAF4EE" />
                  ) : (
                    <Text style={styles.sheetPrimaryText}>Send report</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.sheetCancel} onPress={closeReport}>
                  <Text style={styles.sheetCancelText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
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

  menuButton: { width: 50, alignItems: "flex-end" },
  menuDots: { color: "#74B08A", fontSize: 26, fontWeight: "800", lineHeight: 26 },

  blockedBar: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: "#1E5F3A",
    alignItems: "center",
  },
  blockedText: { color: "#8DBFA1", textAlign: "center", marginBottom: 8 },
  blockedAction: { color: "#74B08A", fontSize: 16, fontWeight: "700" },

  sheetBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.55)" },
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
  sheetText: { color: "#8DBFA1", fontSize: 14, lineHeight: 20, marginBottom: 14 },
  sheetPrimary: {
    backgroundColor: "#1E5F3A",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 8,
  },
  sheetDanger: { backgroundColor: "#8E2B2B" },
  sheetPrimaryText: { color: "#EAF4EE", fontWeight: "700", fontSize: 15 },
  sheetCancel: { paddingVertical: 13, alignItems: "center" },
  sheetCancelText: { color: "#8DBFA1", fontSize: 15, fontWeight: "600" },

  reportQuote: {
    color: "#BFE0CB",
    fontStyle: "italic",
    backgroundColor: "#13271C",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  reasonRow: {
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#16301F",
    marginBottom: 6,
  },
  reasonRowOn: { borderColor: "#74B08A", backgroundColor: "#13271C" },
  reasonText: { color: "#EAF4EE", fontSize: 15 },
  noteInput: {
    backgroundColor: "#13271C",
    color: "#EAF4EE",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1E5F3A",
    padding: 10,
    minHeight: 60,
    marginTop: 6,
    textAlignVertical: "top",
  },
  sendText: { color: "#EAF4EE", fontWeight: "700" },
});
