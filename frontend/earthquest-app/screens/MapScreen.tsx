import React from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";

export default function MapScreen() {
  const MAP_URL =
    "https://fructuously-predegenerate-florance.ngrok-free.dev/earthquestMap.html";

  return (
    <View style={styles.container}>
      <WebView
        source={{
          uri: MAP_URL,
          headers: {
            "ngrok-skip-browser-warning": "true",
          },
        }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#74B08A" />
          </View>
        )}
      />
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
});