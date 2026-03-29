import { View, Text, StyleSheet, Pressable } from "react-native";

const adventures = [
  {
    id: 1,
    title: "EarthQuest Adventure 1",
    subtitle: "Hudson River Climate Adapt",
    unlocked: true,
  },
  {
    id: 2,
    title: "EarthQuest Adventure 2",
    subtitle: "Coming Soon",
    unlocked: false,
  },
  {
    id: 3,
    title: "EarthQuest Adventure 3",
    subtitle: "Coming Soon",
    unlocked: false,
  },
];

export default function AdventureSelectScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose Your Adventure</Text>

      {adventures.map((adv) => (
        <Pressable
          key={adv.id}
          disabled={!adv.unlocked}
          style={[
            styles.card,
            !adv.unlocked && styles.lockedCard,
          ]}
          onPress={() =>
            navigation.navigate("Map", { adventure: adv })
          }
        >
          <Text style={styles.cardTitle}>{adv.title}</Text>
          <Text style={styles.cardSubtitle}>{adv.subtitle}</Text>

          {!adv.unlocked && <Text style={styles.lock}>🔒 Locked</Text>}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0E1A14",
    padding: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 26,
    color: "#E8F5E9",
    marginBottom: 30,
    fontWeight: "800",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#1E5F3A",
    padding: 20,
    borderRadius: 14,
    marginBottom: 15,
    borderColor: "#74B08A",
    borderWidth: 2,
  },
  lockedCard: {
    opacity: 0.5,
  },
  cardTitle: {
    fontSize: 18,
    color: "#EAF4EE",
    fontWeight: "700",
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#A5D6A7",
    marginTop: 5,
  },
  lock: {
    marginTop: 10,
    color: "#FF6B6B",
  },
});