import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  Modal,
  Pressable,
  ScrollView,
  Image,
} from "react-native";
import { WebView } from "react-native-webview";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function MapScreen({ route, navigation }: any) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [arcgisToken, setArcgisToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAdventure, setSelectedAdventure] = useState(null);

  const adventure = route.params?.adventure;

  const MAP_URL =
    "https://fructuously-predegenerate-florance.ngrok-free.dev/earthquestMap.html";

  // 🔥 Fetch ArcGIS token from backend
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const userJWT = await AsyncStorage.getItem("token");
        // const userJWT = await AsyncStorage.getItem("token");
        console.log("JWT FROM STORAGE:", userJWT);

        if (!userJWT) {
          console.log("No JWT found");
          setLoading(false);
          return;
        }

        const res = await fetch(
          // "http://http://192.168.1.32:5000/api/arcgis-token",
          "https://fructuously-predegenerate-florance.ngrok-free.dev/api/arcgis-token", // 🔴 CHANGE THIS
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${userJWT}`,
            },
          },
        );

        const data = await res.json();

        if (data.token) {
          setArcgisToken(data.token);
        } else {
          console.log("ArcGIS token error:", data);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
  }, []);

  // ⏳ Loading screen
  if (loading || !arcgisToken) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#74B08A" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 🌍 WebView */}
      <WebView
        source={{
          uri: MAP_URL,
          headers: {
            "ngrok-skip-browser-warning": "true",
          },
        }}
        style={styles.webview}
        // ✅ REQUIRED SETTINGS
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={["*"]}
        mixedContentMode="always"
        // 🔥 THIS IS THE LINE YOU ASKED ABOUT
        androidHardwareAccelerationDisabled={false}
        // 🔥 IMPORTANT FOR 3D
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        // 🔧 Stability
        scrollEnabled={false}
        overScrollMode="never"
        
        onMessage={(event) => {
          try {
            const message = JSON.parse(event.nativeEvent.data);
            console.log(message.data);
            if (message.type === "PIN_CLICK") {
              console.log("Pin clicked:", message.data);

              setSelectedAdventure(message.data);
            }
          } catch (err) {
            console.log("Message parse error:", err);
          }
        }}
        injectedJavaScriptBeforeContentLoaded={`
    window.ARC_TOKEN = "${arcgisToken}";
    true;
  `}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#74B08A" />
          </View>
        )}
      />

      {/* 🍔 Hamburger Button */}
      <TouchableOpacity
        style={styles.hamburger}
        onPress={() => setMenuVisible(true)}
      >
        <Text style={styles.hamburgerText}>☰</Text>
      </TouchableOpacity>

      {selectedAdventure && (
        <View style={styles.overlayCard}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {selectedAdventure.images?.map((img, index) => (
              <Image
                key={index}
                source={{ uri: img }}
                style={styles.overlayImage}
              />
            ))}
          </ScrollView>

          <Text style={styles.overlayTitle}>
            {selectedAdventure.title || "EarthQuest"}
          </Text>

          <Text style={styles.overlaySubtitle}>
            EQ1 Adventure Mission Brief
          </Text>

          <TouchableOpacity
            style={styles.overlayButton}
            onPress={() => {
              navigation.navigate("MissionBrief", {
                adventure: selectedAdventure,
              });
            }}
          >
            <Text style={styles.overlayButtonText}>Open Mission</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedAdventure(null)}
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 📂 Side Menu */}
      <Modal visible={menuVisible} transparent animationType="slide">
        <View style={styles.overlay}>
          <Pressable
            style={styles.backdrop}
            onPress={() => setMenuVisible(false)}
          />

          <SafeAreaView style={styles.menu}>
            <Text style={styles.menuTitle}>
              {adventure?.title || "EarthQuest"}
            </Text>

            <Text style={styles.menuSubtitle}>
              {adventure?.subtitle || "Select a mission"}
            </Text>

            {/* 📜 Mission Brief */}
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate("MissionBrief", { adventure });
              }}
            >
              <Text style={styles.menuButtonText}>
                Vanguardian Mission Brief
              </Text>
            </TouchableOpacity>

            {/* 🔮 Future Features */}
            <TouchableOpacity style={styles.menuButton}>
              <Text style={styles.menuButtonText}>Vanguardian Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuButton}>
              <Text style={styles.menuButtonText}>
                EarthQuest Adventure 1 Booklet
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuButton}>
              <Text style={styles.menuButtonText}>Become a Member</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0E1A14",
  },

  webview: {
    flex: 1,
  },

  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0E1A14",
  },

  hamburger: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 10,
    borderRadius: 10,
  },

  hamburgerText: {
    color: "#E8F5E9",
    fontSize: 24,
    fontWeight: "bold",
  },

  overlay: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },

  backdrop: {
    flex: 1,
  },

  overlayCard: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: "#0E1A14",
    borderRadius: 16,
    padding: 15,
    borderWidth: 1.5,
    borderColor: "#74B08A",
  },

  overlayImage: {
    width: 250,
    height: 140,
    marginRight: 10,
    borderRadius: 10,
  },

  overlayTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#E8F5E9",
    marginTop: 10,
  },

  overlaySubtitle: {
    fontSize: 14,
    color: "#8DBFA1",
    marginBottom: 10,
  },

  overlayButton: {
    marginTop: 10,
    backgroundColor: "#1E5F3A",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },

  overlayButtonText: {
    color: "#EAF4EE",
    fontWeight: "700",
  },

  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  closeText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  menu: {
    width: "75%",
    height: "100%",
    backgroundColor: "#0E1A14",
    paddingHorizontal: 20,
    paddingTop: 10,
    borderLeftWidth: 2,
    borderColor: "#74B08A",
  },

  menuTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#E8F5E9",
    marginBottom: 5,
  },

  menuSubtitle: {
    fontSize: 14,
    color: "#8DBFA1",
    marginBottom: 20,
  },

  menuButton: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#1E5F3A",
  },

  menuButtonText: {
    color: "#EAF4EE",
    fontSize: 16,
    fontWeight: "600",
  },
});
