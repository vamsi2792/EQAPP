import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthContext } from "../App";
import {
  AdminReport,
  ChatApiError,
  REPORT_REASONS,
  fetchReports,
  resolveReport,
} from "../utils/chatApi";

const reasonLabel = (id: string) => REPORT_REASONS.find((r) => r.id === id)?.label ?? id;

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function ReportsScreen({ navigation }: any) {
  const { logout } = useContext(AuthContext);
  const [status, setStatus] = useState<"open" | "resolved">("open");
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

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

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setReports(await fetchReports(status));
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [status, handleError]);

  useEffect(() => {
    load();
  }, [load]);

  const resolve = async (id: string) => {
    setBusyId(id);
    setError("");
    try {
      await resolveReport(id);
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      handleError(err);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.headerAction}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Chat reports</Text>
        <TouchableOpacity onPress={load} hitSlop={12}>
          <Text style={styles.headerAction}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {(["open", "resolved"] as const).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.tab, status === s && styles.tabOn]}
            onPress={() => setStatus(s)}
          >
            <Text style={[styles.tabText, status === s && styles.tabTextOn]}>
              {s === "open" ? "Open" : "Resolved"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#74B08A" />
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: 14 }}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {status === "open" ? "No open reports. 🎉" : "No resolved reports yet."}
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{reasonLabel(item.reason)}</Text>
              <Text style={styles.meta}>
                {item.reporter?.name ?? "Unknown"} reported {item.reported?.name ?? "Unknown"} ·{" "}
                {formatWhen(item.createdAt)}
              </Text>
              {!!item.note && <Text style={styles.note}>“{item.note}”</Text>}

              <View style={styles.context}>
                {item.context.map((c, i) => {
                  const fromReported = c.sender === item.reported?.id;
                  return (
                    <View key={i} style={[styles.ctxRow, c.reported && styles.ctxReported]}>
                      <Text style={styles.ctxWho}>
                        {fromReported ? item.reported?.name : item.reporter?.name}
                      </Text>
                      <Text style={styles.ctxText}>{c.text}</Text>
                    </View>
                  );
                })}
              </View>

              {item.status === "open" && (
                <TouchableOpacity
                  style={styles.resolveButton}
                  onPress={() => resolve(item.id)}
                  disabled={busyId === item.id}
                >
                  {busyId === item.id ? (
                    <ActivityIndicator color="#EAF4EE" />
                  ) : (
                    <Text style={styles.resolveText}>Mark resolved</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        />
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
  tabText: { color: "#8DBFA1", fontWeight: "600" },
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
  cardTitle: { color: "#EAF4EE", fontSize: 16, fontWeight: "800" },
  meta: { color: "#8DBFA1", fontSize: 12, marginTop: 4 },
  note: { color: "#BFE0CB", fontStyle: "italic", marginTop: 8 },

  context: { marginTop: 10 },
  ctxRow: { paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, marginBottom: 3 },
  ctxReported: { backgroundColor: "#3A2323", borderWidth: 1, borderColor: "#8E2B2B" },
  ctxWho: { color: "#8DBFA1", fontSize: 11, fontWeight: "700" },
  ctxText: { color: "#EAF4EE", fontSize: 14, marginTop: 1 },

  resolveButton: {
    marginTop: 10,
    backgroundColor: "#1E5F3A",
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  resolveText: { color: "#EAF4EE", fontWeight: "700" },
});
