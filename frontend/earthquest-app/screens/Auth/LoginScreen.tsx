import { useContext, useState } from "react";
import { AuthContext } from "../../App";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { View, Text, TextInput, StyleSheet, Pressable } from "react-native";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function LoginScreen({ navigation }: any) {
  const { login } = useContext(AuthContext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Login failed");
        return;
      }

      // 🔐 Use context login
      // await login(data.token);

      // 🔐 Save token for MapScreen
      await AsyncStorage.setItem("token", data.token);

      // Optional: still keep context
      await login(data.token);

      // Optional
      // await AsyncStorage.setItem("user", JSON.stringify(data.user));
    } catch (err) {
      console.error("Login error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>
          Log in to continue your EarthQuest journey
        </Text>

        <TextInput
          placeholder="Email"
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          placeholder="Password"
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          style={[styles.primaryButton, loading && { opacity: 0.6 }]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.primaryText}>
            {loading ? "Logging in..." : "Login"}
          </Text>
        </Pressable>

        <Pressable onPress={() => navigation.navigate("ForgotPassword")}>
          <Text style={{ textAlign: "right", color: "#3C8D65" }}>
            Forgot Password?
          </Text>
        </Pressable>

        <Pressable onPress={() => navigation.navigate("Signup")}>
          <Text style={styles.link}>Create an account</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1E2A24",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 16,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1E2A24",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: "#5F7D6C",
    textAlign: "center",
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: "#C8D8CF",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#1E2A24",
    marginBottom: 14,
    backgroundColor: "#FFFFFF",
  },
  primaryButton: {
    backgroundColor: "#74B08A",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  primaryText: {
    color: "#0E1A14",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  link: {
    color: "#3C8D65",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 10,
    textAlign: "center",
  },
  errorText: {
    color: "#C0392B",
    fontSize: 12,
    marginBottom: 10,
    textAlign: "center",
  },
});
