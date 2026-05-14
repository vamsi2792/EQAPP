import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { SU_CATEGORIES, SUCategoryScores } from "../utils/suScore";

const SCORE_COLORS = ["#EAF4EE", "#CFE9D6", "#8ECF9D", "#37A455", "#087A24"];

type Props = {
  scores: SUCategoryScores;
  size?: number;
  showLabels?: boolean;
};

export default function SUBadge({ scores, size = 160, showLabels = false }: Props) {
  const radius = size / 2;
  const sliceAngle = 360 / SU_CATEGORIES.length;
  const sliceAngleRad = (sliceAngle * Math.PI) / 180;
  const triangleBase = 2 * radius * Math.tan(sliceAngleRad / 2) * 1.08;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.badge, { width: size, height: size, borderRadius: radius }]}>
        {SU_CATEGORIES.map((category, index) => {
          const score = scores[category.id] ?? 0;
          return (
            <View
              key={category.id}
              style={[
                styles.sliceContainer,
                {
                  width: size,
                  height: size,
                  transform: [{ rotate: `${index * sliceAngle}deg` }],
                },
              ]}
            >
              <View
                style={{
                  width: 0,
                  height: 0,
                  borderTopWidth: radius,
                  borderTopColor: SCORE_COLORS[score],
                  borderLeftWidth: triangleBase / 2,
                  borderRightWidth: triangleBase / 2,
                  borderLeftColor: "transparent",
                  borderRightColor: "transparent",
                  position: "absolute",
                  top: 0,
                }}
              />
            </View>
          );
        })}

        {SU_CATEGORIES.map((category, index) => (
          <View
            key={`${category.id}-divider`}
            style={[
              styles.divider,
              {
                height: size,
                left: radius - 1,
                transform: [{ rotate: `${index * sliceAngle + sliceAngle / 2}deg` }],
              },
            ]}
          />
        ))}

        <View
          style={[
            styles.inner,
            {
              width: size * 0.5,
              height: size * 0.5,
              borderRadius: size * 0.25,
            },
          ]}
        >
          <Image
            source={{ uri: "https://cdn-icons-png.flaticon.com/512/1892/1892751.png" }}
            style={{ width: size * 0.34, height: size * 0.34, tintColor: "#EAF4EE" }}
            resizeMode="contain"
          />
        </View>
      </View>

      {showLabels && (
        <View style={styles.legend}>
          {SU_CATEGORIES.map((category, index) => (
            <Text key={category.id} style={styles.legendText}>
              {index + 1}. {category.shortLabel}: {scores[category.id] ?? 0}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
  },
  badge: {
    alignItems: "center",
    backgroundColor: "#0E1A14",
    borderColor: "#74B08A",
    borderWidth: 2,
    justifyContent: "center",
    overflow: "hidden",
  },
  sliceContainer: {
    alignItems: "center",
    position: "absolute",
  },
  divider: {
    backgroundColor: "#0E1A14",
    position: "absolute",
    width: 2,
    zIndex: 5,
  },
  inner: {
    alignItems: "center",
    backgroundColor: "#0E1A14",
    borderColor: "#1E5F3A",
    borderWidth: 1.5,
    justifyContent: "center",
    zIndex: 10,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 12,
  },
  legendText: {
    color: "#C8E6C9",
    fontSize: 11,
    marginHorizontal: 5,
    marginVertical: 2,
  },
});

