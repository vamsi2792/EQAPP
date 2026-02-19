import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";

const API_URL = process.env.EXPO_PUBLIC_API_URL;


// const API_URL = "http://169.226.219.190:5000";

export default function VerifyEmailScreen({ route, navigation }: any) {
  const { email } = route.params;
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async () => {
    if (!otp) return setError("Enter OTP");

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message);
        return;
      }

      navigation.replace("Login");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    await fetch(`${API_URL}/api/auth/resend-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify Email</Text>
      <Text style={styles.subtitle}>Enter OTP sent to {email}</Text>

      <TextInput
        placeholder="Enter OTP"
        style={styles.input}
        keyboardType="numeric"
        value={otp}
        onChangeText={setOtp}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={handleVerify}>
        <Text style={styles.buttonText}>
          {loading ? "Verifying..." : "Verify"}
        </Text>
      </Pressable>

      <Pressable onPress={handleResend}>
        <Text style={styles.link}>Resend OTP</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 22, fontWeight: "700", textAlign: "center" },
  subtitle: { textAlign: "center", marginVertical: 10 },
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
  link: { textAlign: "center", marginTop: 12, color: "#3C8D65" },
  error: { color: "red", textAlign: "center" },
});
