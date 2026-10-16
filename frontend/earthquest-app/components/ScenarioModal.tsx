import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";

import { getToken } from "../utils/authStorage";

export type Scenario = {
  id: string;
  code?: string;
  title?: string;
  locationName?: string;
  description?: string;
  images?: string[];
  [key: string]: any;
};

type ServerImage = { id: string; url: string; caption: string };

type ScenarioContent = {
  exists: boolean;
  customized: boolean;
  description: string;
  images: ServerImage[];
};

type Props = {
  scenario: Scenario | null;
  apiBase: string;
  isAdmin: boolean;
  onClose: () => void;
  onOpenMission: (scenario: Scenario) => void;
  onUnauthorized: () => void;
};

const MAX_IMAGE_WIDTH = 2000;
const NGROK_HEADERS = { "ngrok-skip-browser-warning": "true" };

export default function ScenarioModal({
  scenario,
  apiBase,
  isAdmin,
  onClose,
  onOpenMission,
  onUnauthorized,
}: Props) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width * 0.92, 440);
  const slideWidth = cardWidth - 2 * CARD_PADDING;

  const [content, setContent] = useState<ScenarioContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);
  const listRef = useRef<FlatList<any>>(null);
  // Keep the latest callback without making `call` (and the load effect) change every render.
  const unauthorizedRef = useRef(onUnauthorized);
  unauthorizedRef.current = onUnauthorized;

  const scenarioId = scenario?.id;

  const absolute = (url: string) => (url.startsWith("/") ? `${apiBase}${url}` : url);

  // One place for every API call: adds the token, handles expired logins and errors.
  const call = useCallback(
    async (method: string, path: string, body?: any, form?: FormData) => {
      const token = await getToken();
      const res = await fetch(`${apiBase}/api/scenarios/${scenarioId}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...NGROK_HEADERS,
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
      });

      if (res.status === 401) {
        unauthorizedRef.current();
        throw new Error("Your session expired. Please log in again.");
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Something went wrong");
      return data as ScenarioContent;
    },
    [apiBase, scenarioId]
  );

  const applyContent = (data: ScenarioContent) => {
    setContent(data);
    setCaptions(Object.fromEntries(data.images.map((i) => [i.id, i.caption])));
  };

  // Reload from the server every time a scenario opens so players always see the latest.
  useEffect(() => {
    setContent(null);
    setError("");
    setEditing(false);
    setPage(0);
    if (!scenarioId) return;

    let cancelled = false;
    setLoading(true);
    call("GET", "")
      .then((data) => {
        if (cancelled) return;
        applyContent(data);
        setDraftText(data.description);
      })
      .catch(() => {
        // Offline or server error: players still see the built-in content.
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [scenarioId, call]);

  if (!scenario) return null;

  const builtIn = (scenario.images ?? []).map((url) => ({ id: url, url, caption: "" }));
  const slides: ServerImage[] = content?.customized ? content.images : builtIn;
  const description = content?.description || scenario.description || "";

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  // Before the first image change, copy the built-in images into the database so they
  // can be reordered/removed like uploads (otherwise they would vanish on first upload).
  const ensureImported = async (): Promise<ScenarioContent> => {
    if (content?.customized) return content;
    return call("POST", "/seed", { urls: scenario.images ?? [] });
  };

  const saveText = () =>
    run(async () => applyContent(await call("PUT", "", { description: draftText })));

  const pickAndUpload = () =>
    run(async () => {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const picked = result.assets[0];

      // iPhones save HEIC photos, which the server (and Android phones) cannot use. Re-encode
      // everything as JPEG and shrink huge originals (a 48 MP photo is far above the 8 MB limit).
      const asset = await ImageManipulator.manipulateAsync(
        picked.uri,
        picked.width > MAX_IMAGE_WIDTH ? [{ resize: { width: MAX_IMAGE_WIDTH } }] : [],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      await ensureImported();

      const form = new FormData();
      if (Platform.OS === "web") {
        const blob = await (await fetch(asset.uri)).blob();
        form.append("image", blob, "photo.jpg");
      } else {
        // Expo's fetch cannot send React Native's classic { uri, name, type } form part
        // ("Unsupported FormDataPart implementation"); expo-file-system's File can.
        form.append("image", new File(asset.uri) as any);
      }

      const data = await call("POST", "/images", undefined, form);
      applyContent(data);
      setPage(data.images.length - 1);
      requestAnimationFrame(() =>
        listRef.current?.scrollToIndex({ index: data.images.length - 1, animated: true })
      );
    });

  const saveCaption = (img: ServerImage) =>
    run(async () => {
      const text = captions[img.id] ?? "";
      if (text === img.caption) return;
      applyContent(await call("PATCH", `/images/${img.id}`, { caption: text }));
    });

  const removeImage = (img: ServerImage) =>
    Alert.alert("Delete image?", "Every player will stop seeing it.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          run(async () => {
            const base = await ensureImported();
            // Imported images get new ids, so find the same picture by URL.
            const target = base.images.find((i) => i.url === img.url) ?? img;
            applyContent(await call("DELETE", `/images/${target.id}`));
            setPage(0);
          }),
      },
    ]);

  const move = (index: number, delta: number) =>
    run(async () => {
      const base = await ensureImported();
      const ids = base.images.map((i) => i.id);
      const to = index + delta;
      if (to < 0 || to >= ids.length) return;
      [ids[index], ids[to]] = [ids[to], ids[index]];
      applyContent(await call("PUT", "/order", { order: ids }));
    });

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setPage(Math.round(e.nativeEvent.contentOffset.x / slideWidth));

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        {/* Light dim only: the map stays visible behind the window. Tap outside to close. */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={[styles.card, { width: cardWidth }]}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <TouchableOpacity style={styles.close} onPress={onClose} hitSlop={10}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.title}>
              {scenario.code ? `${scenario.code} - ` : ""}
              {scenario.title}
            </Text>
            {!!scenario.locationName && (
              <Text style={styles.subtitle}>{scenario.locationName}</Text>
            )}

            {/* ===== Carousel ===== */}
            {isAdmin && (
              <View style={styles.toolbar}>
                <Text style={styles.adminBadge}>ADMIN</Text>
                <TouchableOpacity
                  style={styles.toolBtn}
                  onPress={pickAndUpload}
                  disabled={busy}
                  accessibilityLabel="Upload image"
                >
                  {busy ? (
                    <ActivityIndicator size="small" color="#EAF4EE" />
                  ) : (
                    <Text style={styles.toolIcon}>＋</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toolBtn, editing && styles.toolBtnOn]}
                  onPress={() => setEditing((v) => !v)}
                  accessibilityLabel="Edit text, captions and order"
                >
                  <Text style={styles.toolIcon}>✎</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toolBtn, slides.length === 0 && styles.toolBtnOff]}
                  onPress={() => slides[page] && removeImage(slides[page])}
                  disabled={busy || slides.length === 0}
                  accessibilityLabel="Delete this image"
                >
                  <Text style={styles.toolIcon}>🗑</Text>
                </TouchableOpacity>
              </View>
            )}
            {!!error && !editing && <Text style={styles.error}>{error}</Text>}

            {slides.length > 0 ? (
              <View>
                <FlatList
                  ref={listRef}
                  data={slides}
                  keyExtractor={(i) => i.id}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={onScrollEnd}
                  getItemLayout={(_, index) => ({
                    length: slideWidth,
                    offset: slideWidth * index,
                    index,
                  })}
                  renderItem={({ item }) => (
                    <View style={{ width: slideWidth }}>
                      <Image
                        source={{ uri: absolute(item.url), headers: NGROK_HEADERS }}
                        style={[styles.image, { width: slideWidth }]}
                        resizeMode="cover"
                      />
                      {!!item.caption && <Text style={styles.caption}>{item.caption}</Text>}
                    </View>
                  )}
                />
                {slides.length > 1 && (
                  <View style={styles.dots}>
                    {slides.map((s, i) => (
                      <View key={s.id} style={[styles.dot, i === page && styles.dotActive]} />
                    ))}
                    <Text style={styles.counter}>
                      {Math.min(page + 1, slides.length)}/{slides.length}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={[styles.image, styles.empty, { width: slideWidth }]}>
                <Text style={styles.emptyText}>No images yet</Text>
              </View>
            )}

            {loading && <ActivityIndicator color="#74B08A" style={{ marginTop: 8 }} />}

            {!!description && <Text style={styles.description}>{description}</Text>}

            <TouchableOpacity style={styles.primary} onPress={() => onOpenMission(scenario)}>
              <Text style={styles.primaryText}>Open Mission</Text>
            </TouchableOpacity>

            {/* ===== Admin tools ===== */}
            {isAdmin && editing && (
              <View style={styles.admin}>
                {!!error && <Text style={styles.error}>{error}</Text>}

                <Text style={styles.label}>Scenario text</Text>
                <TextInput
                  style={[styles.input, styles.multiline]}
                  value={draftText}
                  onChangeText={setDraftText}
                  multiline
                  maxLength={2000}
                  placeholder="Text shown to players (leave empty to use the default)"
                  placeholderTextColor="#5B7B69"
                />
                <TouchableOpacity style={styles.secondary} onPress={saveText} disabled={busy}>
                  <Text style={styles.secondaryText}>Save text</Text>
                </TouchableOpacity>

                <Text style={[styles.label, { marginTop: 16 }]}>
                  Images ({slides.length}) - changes appear for all players
                </Text>

                {slides.map((img, index) => (
                  <View key={img.id} style={styles.row}>
                    <Image
                      source={{ uri: absolute(img.url), headers: NGROK_HEADERS }}
                      style={styles.thumb}
                    />
                    <View style={{ flex: 1 }}>
                      <TextInput
                        style={[styles.input, { paddingVertical: 6 }]}
                        value={content?.customized ? (captions[img.id] ?? "") : ""}
                        editable={!!content?.customized && !busy}
                        onChangeText={(t) => setCaptions((c) => ({ ...c, [img.id]: t }))}
                        onEndEditing={() => saveCaption(img)}
                        maxLength={200}
                        placeholder={content?.customized ? "Caption" : "Caption (after first change)"}
                        placeholderTextColor="#5B7B69"
                      />
                    </View>
                    <View style={styles.rowButtons}>
                      <TouchableOpacity disabled={busy || index === 0} onPress={() => move(index, -1)}>
                        <Text style={[styles.icon, index === 0 && styles.iconOff]}>▲</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        disabled={busy || index === slides.length - 1}
                        onPress={() => move(index, 1)}
                      >
                        <Text style={[styles.icon, index === slides.length - 1 && styles.iconOff]}>▼</Text>
                      </TouchableOpacity>
                      <TouchableOpacity disabled={busy} onPress={() => removeImage(img)}>
                        <Text style={[styles.icon, { color: "#E57373" }]}>🗑</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                <TouchableOpacity style={styles.primary} onPress={pickAndUpload} disabled={busy}>
                  {busy ? (
                    <ActivityIndicator color="#EAF4EE" />
                  ) : (
                    <Text style={styles.primaryText}>＋ Upload image from device</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const CARD_PADDING = 16;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  card: {
    maxHeight: "82%",
    backgroundColor: "#0E1A14",
    borderRadius: 16,
    padding: CARD_PADDING,
    borderWidth: 1.5,
    borderColor: "#74B08A",
  },
  close: {
    position: "absolute",
    top: 0,
    right: 0,
    zIndex: 5,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  closeText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  title: { fontSize: 18, fontWeight: "800", color: "#E8F5E9", paddingRight: 36 },
  subtitle: { fontSize: 14, color: "#8DBFA1", marginBottom: 10 },
  image: { height: 190, borderRadius: 10, marginTop: 6 },
  empty: { backgroundColor: "#13271D", justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#5B7B69" },
  caption: { color: "#BFE0CB", fontSize: 13, marginTop: 6 },
  dots: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 8 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#2B4A39", marginHorizontal: 3 },
  dotActive: { backgroundColor: "#74B08A" },
  counter: { color: "#8DBFA1", fontSize: 12, marginLeft: 8 },
  description: { color: "#CFE8D8", fontSize: 14, lineHeight: 20, marginTop: 12 },
  primary: {
    marginTop: 14,
    backgroundColor: "#1E5F3A",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryText: { color: "#EAF4EE", fontWeight: "700" },
  secondary: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#74B08A",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  secondaryText: { color: "#BFE0CB", fontWeight: "600" },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 4,
  },
  adminBadge: {
    marginRight: "auto",
    color: "#0E1A14",
    backgroundColor: "#74B08A",
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: "hidden",
  },
  toolBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1E5F3A",
    borderWidth: 1,
    borderColor: "#74B08A",
    alignItems: "center",
    justifyContent: "center",
  },
  toolBtnOn: { backgroundColor: "#2F8A58" },
  toolBtnOff: { opacity: 0.35 },
  toolIcon: { color: "#EAF4EE", fontSize: 20, lineHeight: 24 },
  admin: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#1E5F3A",
    paddingTop: 12,
  },
  label: { color: "#8DBFA1", fontSize: 13, fontWeight: "700", marginBottom: 6 },
  input: {
    backgroundColor: "#13271D",
    color: "#EAF4EE",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#245238",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  error: { color: "#E57373", marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", marginTop: 10, gap: 8 },
  thumb: { width: 56, height: 42, borderRadius: 6, backgroundColor: "#13271D" },
  rowButtons: { flexDirection: "row", alignItems: "center", gap: 10 },
  icon: { color: "#BFE0CB", fontSize: 18, paddingHorizontal: 2 },
  iconOff: { opacity: 0.25 },
});
