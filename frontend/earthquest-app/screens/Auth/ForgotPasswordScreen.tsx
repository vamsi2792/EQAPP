import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
} from "react-native";
import { useState } from "react";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// const API_URL = "http://169.226.219.190:5000";

export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSendOtp = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) return setError(data.message);

      navigation.navigate("ResetPassword", { email });
    } catch {
      setError("Network error");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgot Password</Text>

      <TextInput
        placeholder="Enter your email"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={handleSendOtp}>
        <Text style={styles.buttonText}>Send OTP</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 22, fontWeight: "700", textAlign: "center" },
  input: {
    borderWidth: 1,
    padding: 14,
    borderRadius: 12,
    marginVertical: 12,
  },
  button: {
    backgroundColor: "#74B08A",
    padding: 14,
    borderRadius: 12,
  },
  buttonText: { textAlign: "center", fontWeight: "700" },
  error: { color: "red", textAlign: "center" },
});
