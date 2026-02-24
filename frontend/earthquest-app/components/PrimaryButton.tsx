import { Pressable, Text, StyleSheet } from "react-native";

interface Props {
  label: string;
  onPress?: () => void;
}

export default function PrimaryButton({ label, onPress }: Props) {
  return (
    <Pressable style={styles.button} onPress={onPress}>
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#5E7C5E",
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 20,
  },
  text: {
    color: "#FFF",
    fontSize: 16,
    textAlign: "center",
    fontWeight: "600",
  },
});
