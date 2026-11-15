import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  /** Red confirm button, for things that cannot be undone. */
  danger?: boolean;
  busy?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

// A bottom sheet used instead of Alert.alert, whose buttons do not work on web.
export default function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  danger,
  busy,
  error,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          {!!error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.primary, danger && styles.danger]}
            onPress={onConfirm}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#EAF4EE" />
            ) : (
              <Text style={styles.primaryText}>{confirmLabel}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancel} onPress={onCancel} disabled={busy}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  title: { color: "#E8F5E9", fontSize: 18, fontWeight: "800", marginBottom: 10 },
  message: { color: "#8DBFA1", fontSize: 14, lineHeight: 20, marginBottom: 14 },
  error: { color: "#FF8A80", textAlign: "center", marginBottom: 8 },
  primary: {
    backgroundColor: "#1E5F3A",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 8,
  },
  danger: { backgroundColor: "#8E2B2B" },
  primaryText: { color: "#EAF4EE", fontWeight: "700", fontSize: 15 },
  cancel: { paddingVertical: 13, alignItems: "center" },
  cancelText: { color: "#8DBFA1", fontSize: 15, fontWeight: "600" },
});
