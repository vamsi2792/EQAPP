import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import SearchableDropdown from "../components/SearchableDropdown";

const API_URL = process.env.EXPO_PUBLIC_API_URL;


// const API_URL = "http://169.226.219.190:5000";

export default function SignupScreen({ navigation }: any) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [ethnicity, setEthnicity] = useState("");
  const [language, setLanguage] = useState("");
  const [location, setLocation] = useState("");

  const ageOptions = Array.from({ length: 88 }, (_, i) =>
    (i + 10).toString()
  );

  const genderOptions = [
    "Female",
    "Male",
    "Non-binary",
    "Transgender",
    "Other",
  ];

  const raceOptions = [
    "Asian",
    "Black",
    "Hispanic",
    "White",
    "Mixed",
    "Other",
  ];

  const languageOptions = [
    "English",
    "Spanish",
    "Hindi",
    "Mandarin",
    "French",
    "Arabic",
  ];

  const countryOptions = [
    "United States",
    "India",
    "Canada",
    "United Kingdom",
    "Australia",
    "Germany",
    "France",
    "Japan",
    "Brazil",
  ];

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleNext = () => {
    setError("");

    if (!firstName || !lastName || !email || !password || !confirmPassword)
      return setError("All fields required.");

    if (!isValidEmail(email))
      return setError("Invalid email.");

    if (password.length < 8)
      return setError("Password must be 8+ chars.");

    if (password !== confirmPassword)
      return setError("Passwords do not match.");

    setStep(2);
  };

  const handleSignup = async () => {
  setLoading(true);
  setError("");

  try {
    const response = await fetch(`${API_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        password,
        profile: { age, gender, ethnicity, language, location },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.message || "Signup failed.");
      return;
    }

    navigation.navigate("VerifyEmail", { email });

  } catch (err) {
    console.log("Signup error:", err);
    setError("Server unreachable. Check backend.");
  } finally {
    setLoading(false);
  }
};

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.progress}>Step {step} of 2</Text>

          {step === 1 && (
            <>
              <Text style={styles.title}>Create Account</Text>

              <Input placeholder="First Name" value={firstName} onChangeText={setFirstName} />
              <Input placeholder="Last Name" value={lastName} onChangeText={setLastName} />
              <Input placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />

              <PasswordInput
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                showPassword={showPassword}
                toggle={() => setShowPassword(!showPassword)}
              />

              <PasswordInput
                placeholder="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                showPassword={showPassword}
              />

              {error && <Text style={styles.error}>{error}</Text>}

              <PrimaryButton text="Next" onPress={handleNext} />
            </>
          )}

          {step === 2 && (
            <>
              <Text style={styles.title}>Player Identity</Text>

              <SearchableDropdown
                placeholder="Age"
                data={ageOptions}
                value={age}
                onSelect={setAge}
                keyboardType="numeric"
              />

              <SearchableDropdown placeholder="Gender" data={genderOptions} value={gender} onSelect={setGender} />
              <SearchableDropdown placeholder="Race" data={raceOptions} value={ethnicity} onSelect={setEthnicity} />
              <SearchableDropdown placeholder="Language" data={languageOptions} value={language} onSelect={setLanguage} />
              <SearchableDropdown placeholder="Country" data={countryOptions} value={location} onSelect={setLocation} />

              {error && <Text style={styles.error}>{error}</Text>}

              <PrimaryButton
                text={loading ? "Creating..." : "Create Account"}
                onPress={handleSignup}
                disabled={loading}
              />

              {loading && <ActivityIndicator style={{ marginTop: 10 }} />}
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const Input = ({ ...props }: any) => (
  <TextInput
    style={styles.input}
    placeholderTextColor="#999"
    autoCorrect={false}
    autoCapitalize="none"
    importantForAutofill="no"
    {...props}
  />
);

const PasswordInput = ({ showPassword, toggle, ...props }: any) => (
  <View style={styles.passwordRow}>
    <TextInput
      secureTextEntry={!showPassword}
      style={styles.passwordInput}
      placeholderTextColor="#999"
      autoComplete="off"
      textContentType="none"
      {...props}
    />
    {toggle && (
      <Pressable onPress={toggle}>
        <Text style={{ fontSize: 18 }}>{showPassword ? "🙈" : "👁️"}</Text>
      </Pressable>
    )}
  </View>
);

const PrimaryButton = ({ text, onPress, disabled }: any) => (
  <Pressable
    style={[styles.primaryButton, disabled && { opacity: 0.6 }]}
    onPress={onPress}
    disabled={disabled}
  >
    <Text style={styles.primaryText}>{text}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#1E2A24",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 28,
  },
  progress: {
    textAlign: "center",
    color: "#5F7D6C",
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D5E3DB",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    backgroundColor: "#FFF",
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D5E3DB",
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 16,
    backgroundColor: "#FFF",
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
  },
  primaryButton: {
    backgroundColor: "#74B08A",
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 12,
  },
  primaryText: {
    textAlign: "center",
    fontWeight: "700",
    color: "#0E1A14",
  },
  error: {
    color: "#C0392B",
    textAlign: "center",
    marginBottom: 10,
  },
});
