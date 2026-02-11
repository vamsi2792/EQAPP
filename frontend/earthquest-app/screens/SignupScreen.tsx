import { View, Text, TextInput, StyleSheet, Pressable } from "react-native";
import { useState } from "react";
import { Picker } from "@react-native-picker/picker";

const API_URL = "http://192.168.1.32:5000"; // 🔴 CHANGE if using physical phone

export default function SignupScreen({ navigation }: any) {
  const [step, setStep] = useState(1);

  // STEP 1
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  // STEP 2
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [ethnicity, setEthnicity] = useState("");
  const [language, setLanguage] = useState("");
  const [location, setLocation] = useState("");

  // STEP 3
  const [code, setCode] = useState(["", "", "", "", ""]);
  const [success, setSuccess] = useState(false);

  // OPTIONS
  const genderOptions = [
    "Prefer not to say",
    "Female",
    "Male",
    "Non-binary",
    "Transgender",
    "Genderqueer",
    "Other",
  ];

  const raceOptions = [
    "Prefer not to say",
    "Asian",
    "Black or African American",
    "Hispanic or Latino",
    "White",
    "Native American or Indigenous",
    "Middle Eastern or North African",
    "Pacific Islander",
    "Mixed",
    "Other",
  ];

  const countryOptions = [
    "Prefer not to say",
    "United States",
    "India",
    "Canada",
    "United Kingdom",
    "Australia",
    "Other",
  ];

  const languageOptions = [
    "Prefer not to say",
    "English",
    "Spanish",
    "Hindi",
    "Mandarin",
    "French",
    "Other",
  ];

  const isValidEmail = (email: string) => /\S+@\S+\.\S+/.test(email);

  const handleNextFromStep1 = () => {
    setError("");

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      setError("Please fill in all required fields.");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setStep(2);
  };

  const handleSignupComplete = async () => {
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
          clubCode: code.join(""),
        }),
      });

      if (!response.ok) throw new Error();

      setSuccess(true);

      setTimeout(() => {
        navigation.replace("Login");
      }, 1500);
    } catch {
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {!success && <Text style={styles.progress}>Step {step} of 3</Text>}

        {/* STEP 1 */}
        {step === 1 && !success && (
          <>
            <Text style={styles.title}>Create Account</Text>

            <TextInput placeholder="First Name" style={styles.input} value={firstName} onChangeText={setFirstName} />
            <TextInput placeholder="Last Name" style={styles.input} value={lastName} onChangeText={setLastName} />
            <TextInput placeholder="Email" style={styles.input} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />

            <View style={styles.passwordRow}>
              <TextInput
                placeholder="Password"
                style={styles.passwordInput}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.eye}>{showPassword ? "🙈" : "👁️"}</Text>
              </Pressable>
            </View>

            <View style={styles.passwordRow}>
              <TextInput
                placeholder="Confirm Password"
                style={styles.passwordInput}
                secureTextEntry={!showPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable style={styles.primaryButton} onPress={handleNextFromStep1}>
              <Text style={styles.primaryText}>Next</Text>
            </Pressable>
          </>
        )}

        {/* STEP 2 */}
        {step === 2 && !success && (
          <>
            <Text style={styles.title}>Player Identity</Text>
            <Text style={styles.subtitle}>Optional — you can edit this later</Text>

            <TextInput placeholder="Age" style={styles.input} keyboardType="numeric" value={age} onChangeText={setAge} />

            <View style={styles.pickerWrapper}>
              <Picker selectedValue={gender} onValueChange={setGender}>
                <Picker.Item label="Select gender identity" value="" />
                {genderOptions.map((g) => <Picker.Item key={g} label={g} value={g} />)}
              </Picker>
            </View>

            <View style={styles.pickerWrapper}>
              <Picker selectedValue={ethnicity} onValueChange={setEthnicity}>
                <Picker.Item label="Select race / ethnicity" value="" />
                {raceOptions.map((r) => <Picker.Item key={r} label={r} value={r} />)}
              </Picker>
            </View>

            <View style={styles.pickerWrapper}>
              <Picker selectedValue={language} onValueChange={setLanguage}>
                <Picker.Item label="Preferred language" value="" />
                {languageOptions.map((l) => <Picker.Item key={l} label={l} value={l} />)}
              </Picker>
            </View>

            <View style={styles.pickerWrapper}>
              <Picker selectedValue={location} onValueChange={setLocation}>
                <Picker.Item label="Select country" value="" />
                {countryOptions.map((c) => <Picker.Item key={c} label={c} value={c} />)}
              </Picker>
            </View>

            <View style={styles.row}>
              <Pressable onPress={() => setStep(1)}>
                <Text style={styles.link}>Back</Text>
              </Pressable>
              <Pressable onPress={() => setStep(3)}>
                <Text style={styles.link}>Next</Text>
              </Pressable>
            </View>
          </>
        )}

        {/* STEP 3 */}
        {step === 3 && !success && (
          <>
            <Text style={styles.title}>Join Your Club</Text>
            <Text style={styles.subtitle}>Enter the Adventure Code from your GM</Text>

            <View style={styles.codeRow}>
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  style={styles.codeBox}
                  maxLength={1}
                  keyboardType="numeric"
                  value={digit}
                  onChangeText={(val) => {
                    const newCode = [...code];
                    newCode[index] = val;
                    setCode(newCode);
                  }}
                />
              ))}
            </View>

            <Pressable style={styles.primaryButton} onPress={handleSignupComplete}>
              <Text style={styles.primaryText}>Verify Code</Text>
            </Pressable>

            <Pressable onPress={handleSignupComplete}>
              <Text style={styles.skip}>Skip for now</Text>
            </Pressable>
          </>
        )}

        {success && (
          <View style={styles.successBox}>
            <Text style={styles.successTitle}>Account Created 🎉</Text>
            <Text style={styles.successText}>Redirecting to login…</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1E2A24", justifyContent: "center", alignItems: "center", padding: 20 },
  card: { width: "100%", maxWidth: 380, backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 18, padding: 24 },
  progress: { textAlign: "center", color: "#5F7D6C", fontSize: 12, marginBottom: 10 },
  title: { fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 12 },
  subtitle: { fontSize: 13, textAlign: "center", color: "#6B8A79", marginBottom: 18 },
  input: { borderWidth: 1, borderColor: "#C8D8CF", borderRadius: 10, padding: 12, marginBottom: 12, backgroundColor: "#FFF" },
  pickerWrapper: { borderWidth: 1, borderColor: "#C8D8CF", borderRadius: 10, marginBottom: 12, backgroundColor: "#FFF" },
  passwordRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#C8D8CF", borderRadius: 10, paddingHorizontal: 12, marginBottom: 12, backgroundColor: "#FFF" },
  passwordInput: { flex: 1, paddingVertical: 12 },
  eye: { fontSize: 18 },
  errorText: { color: "#C0392B", fontSize: 12, textAlign: "center", marginBottom: 10 },
  primaryButton: { backgroundColor: "#74B08A", paddingVertical: 14, borderRadius: 12, marginTop: 10 },
  primaryText: { textAlign: "center", fontWeight: "600", color: "#0E1A14" },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  link: { color: "#3C8D65", fontWeight: "600" },
  codeRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 20 },
  codeBox: { width: 45, height: 50, borderWidth: 1, borderRadius: 8, textAlign: "center", fontSize: 18 },
  skip: { textAlign: "center", marginTop: 14, color: "#3C8D65", textDecorationLine: "underline" },
  successBox: { alignItems: "center", paddingVertical: 40 },
  successTitle: { fontSize: 20, fontWeight: "700", marginBottom: 10, color: "#1E2A24" },
  successText: { fontSize: 14, color: "#5F7D6C", textAlign: "center" },
});
