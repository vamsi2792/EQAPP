import { Image, StyleSheet } from "react-native";

interface Props {
  source: any;
}

export default function ScreenFrame({ source }: Props) {
  return <Image source={source} style={styles.frame} resizeMode="contain" />;
}

const styles = StyleSheet.create({
  frame: {
    position: "absolute",
    width: "90%",
    height: "80%",
  },
});
