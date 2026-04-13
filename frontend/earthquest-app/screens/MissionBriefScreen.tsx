import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MissionBriefScreen({ route, navigation }: any) {
  const adventure = route.params?.adventure;

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* 🖼️ IMAGE CAROUSEL */}
        {adventure?.images && adventure.images.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.carousel}
          >
            {adventure.images.map((img: string, index: number) => (
              <Image
                key={index}
                source={{ uri: img }}
                style={styles.carouselImage}
              />
            ))}
          </ScrollView>
        )}

        {/* 🧭 HEADER */}
        <Text style={styles.title}>
          {adventure?.title || "EarthQuest"}
        </Text>

        <Text style={styles.subtitle}>
          EQ1 Vanguardian Mission Brief
        </Text>

        {/* 📂 DIRECTORY */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Directory of Sections</Text>
          <Text style={styles.bullet}>• Mission Overview</Text>
          <Text style={styles.bullet}>• Community History</Text>
          <Text style={styles.bullet}>• Climate Disruption</Text>
          <Text style={styles.bullet}>• Community Background</Text>
          <Text style={styles.bullet}>• Culture, Religion, Governance</Text>
          <Text style={styles.bullet}>• Economy & Settlements</Text>
        </View>

        {/* 📜 MISSION OVERVIEW */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Mission Overview</Text>
          <Text style={styles.text}>
            You are deployed as a Vanguardian to investigate climate disruption
            along the Hudson River corridor. Your mission is to assess ecological
            instability and guide sustainable intervention strategies.
          </Text>
        </View>

        {/* 🗺️ MISSION */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Mission</Text>
          <Text style={styles.bullet}>• Analyze watershed vulnerability</Text>
          <Text style={styles.bullet}>• Identify climate risk zones</Text>
          <Text style={styles.bullet}>• Engage with communities</Text>
        </View>

        {/* 🌊 ECOLOGY */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Watershed Ecology & Climate Disruption
          </Text>
          <Text style={styles.text}>
            The Hudson River watershed is undergoing transformation due to
            climate-driven environmental stress.
          </Text>
        </View>

        {/* ⚠️ IMPACT */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Climate Disruption Impacts</Text>
          <Text style={styles.bullet}>• Flooding</Text>
          <Text style={styles.bullet}>• Ecosystem imbalance</Text>
          <Text style={styles.bullet}>• Infrastructure risks</Text>
        </View>

        {/* 🏘️ COMMUNITY */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Community Background</Text>
          <Text style={styles.text}>
            Diverse communities shaped by history, migration, and economic change.
          </Text>
        </View>

        {/* 🌍 CULTURE */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Cultures & Languages</Text>
          <Text style={styles.text}>
            Cultural diversity influences resilience and adaptation strategies.
          </Text>
        </View>

        {/* ⛪ RELIGION */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Religion</Text>
          <Text style={styles.text}>
            Religious institutions contribute to social stability.
          </Text>
        </View>

        {/* 📊 SCORES */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Community Scores</Text>
          <Text style={styles.score}>Reputation: 5/12</Text>
          <Text style={styles.score}>Resources: 8/12</Text>
          <Text style={styles.score}>Technology: 7/12</Text>
          <Text style={styles.score}>Sustainability: 2/4</Text>
        </View>

        {/* 🎓 EDUCATION */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Education</Text>
          <Text style={styles.text}>
            Education drives awareness and long-term adaptation.
          </Text>
        </View>

        {/* 🏛️ GOVERNANCE */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Governance</Text>
          <Text style={styles.text}>
            Governance influences environmental policy and resilience.
          </Text>
        </View>

        {/* 💰 ECONOMY */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Economy</Text>
          <Text style={styles.text}>
            Economic systems depend on environmental stability.
          </Text>
        </View>

        {/* 🏙️ SETTLEMENTS */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Settlements</Text>
          <Text style={styles.text}>
            Settlements face varying levels of climate risk.
          </Text>
        </View>

        {/* ▶️ START BUTTON */}
        <Pressable
          style={styles.startButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.startText}>Start Mission</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#0E1A14",
  },

  container: {
    flex: 1,
    paddingHorizontal: 20,
  },

  /* 🖼️ Carousel */
  carousel: {
    marginTop: 10,
    marginBottom: 15,
  },

  carouselImage: {
    width: 300,
    height: 180,
    marginRight: 12,
    borderRadius: 14,
  },

  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#E8F5E9",
    marginTop: 5,
  },

  subtitle: {
    fontSize: 16,
    color: "#8DBFA1",
    marginBottom: 20,
  },

  card: {
    backgroundColor: "#1E5F3A",
    padding: 18,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#74B08A",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#EAF4EE",
    marginBottom: 8,
  },

  text: {
    fontSize: 15,
    color: "#D7F3E3",
    lineHeight: 22,
  },

  bullet: {
    fontSize: 15,
    color: "#C8E6C9",
    marginBottom: 4,
  },

  score: {
    fontSize: 15,
    color: "#FFD166",
    fontWeight: "600",
    marginBottom: 4,
  },

  startButton: {
    marginTop: 10,
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: "#0F3D2E",
    borderWidth: 2,
    borderColor: "#74B08A",
    alignItems: "center",
  },

  startText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#E8F5E9",
  },
});