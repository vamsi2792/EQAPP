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

export default function ResetPasswordScreen({ route, navigation }: any) {
  const { email } = route.params;

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");

  const handleReset = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) return setError(data.message);

      navigation.replace("Login");
    } catch {
      setError("Network error");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>

      <TextInput
        placeholder="Enter OTP"
        style={styles.input}
        keyboardType="numeric"
        value={otp}
        onChangeText={setOtp}
      />

      <TextInput
        placeholder="New Password"
        style={styles.input}
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={handleReset}>
        <Text style={styles.buttonText}>Reset Password</Text>
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
