import React, { useEffect, useRef } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Image,
  SafeAreaView,
  Dimensions,
  Animated,
  Pressable,
} from "react-native";

const screenWidth = Dimensions.get("window").width;

export default function AboutEarthQuest({ navigation }: any) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 900,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Back Button (same structure as hamburger icon) */}
      <Pressable
        style={({ pressed }) => [
          styles.backButton,
          pressed && styles.backPressed,
        ]}
        onPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate("LandingScreen");
          }
        }}
      >
        <Text style={styles.backText}>←</Text>
      </Pressable>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* HERO */}
        <Animated.View
          style={[
            styles.hero,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Text style={styles.title}>EarthQuest</Text>

          <Text style={styles.quote}>
            “The unraveling of the planet’s fundamental systems is no game—but
            solving this crisis into which we’ve stumbled is a great adventure,
            as EarthQuest captures beautifully. It’s a step into the real
            world.”
          </Text>

          <Text style={styles.quoteAuthor}>
            – Bill McKibben, Author, Activist and Founder of 350.org
          </Text>

          <Image
            source={require("../assets/EQ-PHB-Cover-Vanguardians-Group.png")}
            style={styles.heroImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* WHAT IS EARTHQUEST */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What is EarthQuest?</Text>

          <Text style={styles.paragraph}>
            EarthQuest is an augmented reality ecogame for engaging teams of
            youth and young adults in game-based learning about climate change,
            their local environment and civics. It blends tabletop simulation,
            storytelling, group role-playing and a mobile app to create a
            collaborative learning experience.
          </Text>

          <View style={styles.card}>
            <Image
              source={require("../assets/Vanguardians_img.png")}
              style={styles.image}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.paragraph}>
            Players enter a realistic near-future world shaped by climate
            change, environmental pollution and resource challenges. Through
            teamwork and investigation they help communities transition toward
            sustainable living.
          </Text>
        </View>

        {/* GAME WORLD */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>The EarthQuest World</Text>

          <Text style={styles.paragraph}>
            EarthQuest scenarios take place in watershed regions across the
            United States in a near-future world impacted by climate change,
            environmental degradation and resource conflicts.
          </Text>

          <View style={styles.vanguardianRow}>
            <Image
              source={require("../assets/Vanguardian-10.png")}
              style={styles.vanguardianImage}
              resizeMode="contain"
            />
            <Image
              source={require("../assets/Vanguardian-12.png")}
              style={styles.vanguardianImage}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.paragraph}>
            Players become members of a team called the “Vanguardians” who
            investigate environmental mysteries such as flooding, pollution,
            wildlife habitat loss and shortages of food, water and energy.
          </Text>
        </View>

        {/* HOW THE GAME WORKS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How the Game Works</Text>

          <View style={styles.card}>
            <Image
              source={require("../assets/earthquest-gamekit.png")}
              style={styles.image}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.paragraph}>
            EarthQuest combines tabletop gameplay with digital tools. Players
            gather around watershed maps using rulebooks, dice, miniature
            figures and Vanguardian folders to investigate environmental
            challenges and record discoveries.
          </Text>

          <View style={styles.sideLayout}>
            <Image
              source={require("../assets/earthquest-dice.png")}
              style={styles.sideImage}
              resizeMode="contain"
            />

            <Text style={styles.sideText}>
              Dice and interactive storytelling help determine mission outcomes
              and guide the unfolding environmental investigations players face
              in the game.
            </Text>
          </View>

          <View style={styles.card}>
            <Image
              source={require("../assets/handbooks.png")}
              style={styles.image}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* VANGUARDIANS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>The Vanguardians</Text>

          <Text style={styles.paragraph}>
            Vanguardians are highly trained agents equipped with advanced
            technology, scientific knowledge and leadership skills. They promote
            environmental sustainability, peace, health and social justice.
          </Text>

          <View style={styles.card}>
            <Image
              source={require("../assets/SUBadge.png")}
              style={styles.badge}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.paragraph}>
            Players earn sustainability scores and badges by completing missions
            and adopting real-world sustainability behaviors.
          </Text>
        </View>

        {/* FEATURES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why EarthQuest is Unique</Text>

          <Text style={styles.bullet}>
            • Combines tabletop gameplay with mobile technology
          </Text>
          <Text style={styles.bullet}>
            • Encourages teamwork and creativity
          </Text>
          <Text style={styles.bullet}>
            • Focuses on real environmental challenges
          </Text>
          <Text style={styles.bullet}>
            • Rewards real-life sustainability actions
          </Text>
          <Text style={styles.bullet}>
            • Builds leadership and civic engagement
          </Text>

          <Text style={styles.paragraph}>
            EarthQuest empowers youth to become leaders in building resilient
            and sustainable communities while developing critical thinking,
            leadership and environmental stewardship skills.
          </Text>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0E1A14",
  },

  container: {
    flex: 1,
  },

  /* Same style pattern as hamburger */
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 10,
  },

  backPressed: {
    opacity: 0.7,
  },

  backText: {
    fontSize: 28,
    color: "#E8F5E9",
    fontWeight: "bold",
  },

  hero: {
    alignItems: "center",
    paddingTop: 90,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },

  title: {
    fontSize: 40,
    fontWeight: "800",
    color: "#E8F5E9",
    textAlign: "center",
    marginBottom: 12,
  },

  quote: {
    fontSize: 16,
    lineHeight: 24,
    color: "#CFE8D8",
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 10,
  },

  quoteAuthor: {
    fontSize: 14,
    color: "#8DBFA1",
    textAlign: "center",
    marginBottom: 20,
  },

  heroImage: {
    width: screenWidth * 0.9,
    height: 220,
  },

  section: {
    paddingHorizontal: 24,
    marginTop: 28,
  },

  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#8DBFA1",
    marginBottom: 12,
  },

  paragraph: {
    fontSize: 16,
    lineHeight: 26,
    letterSpacing: 0.3,
    color: "#DCEFE3",
    marginBottom: 16,
  },

  bullet: {
    fontSize: 16,
    lineHeight: 24,
    color: "#DCEFE3",
    marginBottom: 8,
  },

  card: {
    backgroundColor: "#14241C",
    padding: 16,
    borderRadius: 16,
    marginVertical: 14,
  },

  image: {
    width: "100%",
    height: 200,
  },

  badge: {
    width: "100%",
    height: 150,
  },

  vanguardianRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 18,
  },

  vanguardianImage: {
    width: "48%",
    height: 220,
  },

  sideLayout: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },

  sideImage: {
    width: "45%",
    height: 120,
  },

  sideText: {
    width: "55%",
    paddingLeft: 12,
    fontSize: 16,
    lineHeight: 24,
    color: "#DCEFE3",
  },
});
