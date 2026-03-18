import React, { useEffect, useRef } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Animated,
  Pressable,
} from "react-native";

export default function HowToPlayEarthQuest({ navigation }: any) {
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
      {/* Back Button (structured like hamburger icon) */}
      <Pressable
        style={({ pressed }) => [
          styles.backButton,
          pressed && styles.backPressed,
        ]}
        onPress={() => navigation.goBack()}
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
          <Text style={styles.title}>How to Play EarthQuest</Text>

          <Text style={styles.subtitle}>
            Gather your team, become Vanguardians, and work together to solve
            environmental mysteries in a near-future world.
          </Text>
        </Animated.View>

        {/* STEP 1 */}
        <View style={styles.card}>
          <Text style={styles.stepTitle}>1. Form Your EarthQuest Club</Text>

          <Text style={styles.paragraph}>
            You and your friends form a “club” to play EarthQuest. You meet in
            person around a table and choose one player to be the Game Mentor.
            Everyone downloads the EarthQuest App on their phones and prints
            the gamesheets and Vanguardian Folders.
          </Text>

          <Text style={styles.paragraph}>
            You also set out the two EarthQuest rulebooks, some 12-sided dice,
            pencils, and maybe a few miniature figures.
          </Text>
        </View>

        {/* STEP 2 */}
        <View style={styles.card}>
          <Text style={styles.stepTitle}>2. Create Your Vanguardian</Text>

          <Text style={styles.paragraph}>
            In the first session, each player uses the Vanguardian Folder to
            create their own custom Vanguardian character for this and future
            Adventures.
          </Text>

          <Text style={styles.paragraph}>
            Your Vanguardian information can be uploaded to the EarthQuest App
            later if you choose, allowing you to share your character with
            other players.
          </Text>
        </View>

        {/* STEP 3 */}
        <View style={styles.card}>
          <Text style={styles.stepTitle}>3. Begin Your EarthQuest Sessions</Text>

          <Text style={styles.paragraph}>
            Each EarthQuest session can be as long or as short as you like, and
            you can play as often as your group wants.
          </Text>

          <Text style={styles.paragraph}>
            Maybe every week on a Friday night for 2-3 hours… with some giant
            bowls of popcorn!
          </Text>

          <Text style={styles.paragraph}>
            During each session, the Game Mentor leads your team through
            different scenarios in the Adventure while players role-play their
            Vanguardians in EarthQuest’s near-future world.
          </Text>
        </View>

        {/* STEP 4 */}
        <View style={styles.card}>
          <Text style={styles.stepTitle}>4. Investigate Missions</Text>

          <Text style={styles.paragraph}>
            Your Vanguardians help local watershed communities become more
            resilient, adapt to climate change, and transition toward
            sustainable living in order to survive.
          </Text>

          <Text style={styles.paragraph}>
            Players use their Vanguardian Folder and gamesheets to collect
            clues and take notes.
          </Text>

          <Text style={styles.paragraph}>
            On their phones, the EarthQuest App allows players to explore a 3D
            map, watch scene videos, view pictures, look up information, and
            share notes with teammates.
          </Text>

          <Text style={styles.paragraph}>
            Dice are rolled to determine some outcomes while gamesheets help
            track discoveries during missions.
          </Text>
        </View>

        {/* STEP 5 */}
        <View style={styles.card}>
          <Text style={styles.stepTitle}>5. Meet Key People</Text>

          <Text style={styles.paragraph}>
            During missions, Vanguardians meet Key People who share their
            experiences with climate disruption impacts, pollution, and the
            challenges of transitioning to sustainable living.
          </Text>

          <Text style={styles.paragraph}>
            These Key People help players understand the causes and effects of
            environmental problems and introduce best-practice solutions such
            as tree planting, community gardening, and solar energy.
          </Text>
        </View>

        {/* STEP 6 */}
        <View style={styles.card}>
          <Text style={styles.stepTitle}>6. Solve Environmental Mysteries</Text>

          <Text style={styles.paragraph}>
            Along the way, Vanguardians might track down environmental
            criminals, rescue flood victims, free trafficked refugees, or
            disable spy drones.
          </Text>

          <Text style={styles.paragraph}>
            They might use medicinal herbs to help injured children, restore
            bioenergy power to a greenhouse, gather clues to solve an
            environmental mystery, or answer riddles that unlock hidden
            digital knowledge.
          </Text>

          <Text style={styles.paragraph}>
            Players who follow the Wisdom Path meet wise Elders who share
            stories that increase their Consciousness and guide their choices.
          </Text>
        </View>

        {/* STEP 7 */}
        <View style={styles.card}>
          <Text style={styles.stepTitle}>7. Earn Experience and Grow</Text>

          <Text style={styles.paragraph}>
            At the end of each Adventure, players share stories about what
            happened and what they learned.
          </Text>

          <Text style={styles.paragraph}>
            These experiences earn Experience Points that help advance each
            Vanguardian to the next Branch (level) for the next EarthQuest
            Adventure.
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

  /* Back Button styled similar to hamburger placement */
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
    paddingTop: 90,
    paddingHorizontal: 24,
    paddingBottom: 20,
    alignItems: "center",
  },

  title: {
    fontSize: 38,
    fontWeight: "800",
    color: "#E8F5E9",
    textAlign: "center",
  },

  subtitle: {
    fontSize: 16,
    color: "#8DBFA1",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 24,
  },

  card: {
    backgroundColor: "#14241C",
    marginHorizontal: 20,
    marginTop: 24,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#214D35",
  },

  stepTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#8DBFA1",
    marginBottom: 12,
  },

  paragraph: {
    fontSize: 16,
    lineHeight: 26,
    color: "#DCEFE3",
    marginBottom: 12,
  },
});