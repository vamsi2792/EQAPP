import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SUBadge from "../components/SUBadge";
import {
  calculateSUCategoryScores,
  calculateSUTotal,
  createDefaultAnswers,
  SU_CATEGORIES,
  SU_SCALE_LABELS,
  SUAnswers,
  SUScoreValue,
} from "../utils/suScore";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function SUScoreQuestionnaireScreen({ navigation }: any) {
  const [answers, setAnswers] = useState<SUAnswers>(createDefaultAnswers());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadSavedAnswers = async () => {
      try {
        const token =
          (await AsyncStorage.getItem("authToken")) ||
          (await AsyncStorage.getItem("token"));

        if (!token || !API_URL) return;

        const response = await fetch(`${API_URL}/api/profile/full`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "ngrok-skip-browser-warning": "true",
          },
        });

        const data = await response.json();
        const savedAnswers = data?.user?.suScore?.answers;

        if (savedAnswers) {
          setAnswers({ ...createDefaultAnswers(), ...savedAnswers });
        }
      } catch (error) {
        console.log("Failed to load saved SUscore", error);
      }
    };

    loadSavedAnswers();
  }, []);

  const categoryScores = useMemo(
    () => calculateSUCategoryScores(answers),
    [answers],
  );
  const totalScore = useMemo(
    () => calculateSUTotal(categoryScores),
    [categoryScores],
  );

  const setAnswer = (questionId: string, value: SUScoreValue) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  const saveScore = async () => {
    try {
      setSaving(true);
      const token =
        (await AsyncStorage.getItem("authToken")) ||
        (await AsyncStorage.getItem("token"));

      if (!token || !API_URL) {
        Alert.alert("Unable to save", "Login token or API URL is missing.");
        return;
      }

      const response = await fetch(`${API_URL}/api/profile/su-score`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ answers }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Unable to save", data.message || "Please try again.");
        return;
      }

      Alert.alert("SUBadge saved", `Your SUscore is ${data.suScore.totalScore}/48.`);
    } catch (error) {
      Alert.alert("Unable to save", "Check the backend and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Personal SUscore</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summary}>
          <SUBadge scores={categoryScores} size={170} showLabels />
          <Text style={styles.scoreText}>{totalScore}/48</Text>
          <Text style={styles.scoreSubtext}>
            Each wedge is the rounded average of its three answers.
          </Text>
        </View>

        <View style={styles.scaleCard}>
          <Text style={styles.scaleTitle}>Scale</Text>
          {SU_SCALE_LABELS.map((label, index) => (
            <Text key={label} style={styles.scaleText}>
              {index} = {label}
            </Text>
          ))}
        </View>

        {SU_CATEGORIES.map((category, categoryIndex) => (
          <View key={category.id} style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryTitle}>
                {categoryIndex + 1}. {category.label}
              </Text>
              <Text style={styles.categoryScore}>
                {categoryScores[category.id] ?? 0}/4
              </Text>
            </View>

            {category.questions.map((question) => (
              <View key={question.id} style={styles.questionBlock}>
                <Text style={styles.questionText}>{question.text}</Text>
                <View style={styles.optionRow}>
                  {[0, 1, 2, 3, 4].map((value) => {
                    const selected = answers[question.id] === value;
                    return (
                      <Pressable
                        key={value}
                        onPress={() => setAnswer(question.id, value as SUScoreValue)}
                        style={[styles.optionButton, selected && styles.optionSelected]}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            selected && styles.optionTextSelected,
                          ]}
                        >
                          {value}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        ))}

        <TouchableOpacity
          style={[styles.saveButton, saving && { opacity: 0.65 }]}
          onPress={saveScore}
          disabled={saving}
        >
          <Text style={styles.saveText}>
            {saving ? "Saving..." : "Save SUBadge Score"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0E1A14",
    flex: 1,
  },
  header: {
    alignItems: "center",
    borderBottomColor: "#1E5F3A",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 48,
    paddingBottom: 16,
  },
  backText: {
    color: "#74B08A",
    fontSize: 15,
    fontWeight: "700",
  },
  headerTitle: {
    color: "#E8F5E9",
    fontSize: 20,
    fontWeight: "800",
  },
  content: {
    padding: 18,
    paddingBottom: 40,
  },
  summary: {
    alignItems: "center",
    marginBottom: 18,
  },
  scoreText: {
    color: "#E8F5E9",
    fontSize: 30,
    fontWeight: "900",
    marginTop: 14,
  },
  scoreSubtext: {
    color: "#8DBFA1",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    textAlign: "center",
  },
  scaleCard: {
    backgroundColor: "#123524",
    borderColor: "#1E5F3A",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    padding: 14,
  },
  scaleTitle: {
    color: "#EAF4EE",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
  },
  scaleText: {
    color: "#C8E6C9",
    fontSize: 12,
    marginBottom: 4,
  },
  categoryCard: {
    backgroundColor: "#1E5F3A",
    borderColor: "#74B08A",
    borderRadius: 8,
    borderWidth: 1.5,
    marginBottom: 16,
    padding: 14,
  },
  categoryHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  categoryTitle: {
    color: "#EAF4EE",
    flex: 1,
    fontSize: 17,
    fontWeight: "800",
    paddingRight: 10,
  },
  categoryScore: {
    color: "#FFD166",
    fontSize: 17,
    fontWeight: "900",
  },
  questionBlock: {
    borderTopColor: "rgba(232,245,233,0.18)",
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 12,
  },
  questionText: {
    color: "#EAF4EE",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  optionButton: {
    alignItems: "center",
    backgroundColor: "#123524",
    borderColor: "#74B08A",
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: "18%",
  },
  optionSelected: {
    backgroundColor: "#EAF4EE",
  },
  optionText: {
    color: "#EAF4EE",
    fontSize: 16,
    fontWeight: "800",
  },
  optionTextSelected: {
    color: "#0E1A14",
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: "#74B08A",
    borderRadius: 8,
    marginTop: 6,
    padding: 18,
  },
  saveText: {
    color: "#0E1A14",
    fontSize: 16,
    fontWeight: "900",
  },
});
