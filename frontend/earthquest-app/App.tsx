import { useEffect } from "react";
import { Text, View } from "react-native";

export default function App() {
  useEffect(() => {
    fetch("http://localhost:5000")
      .then(res => res.text())
      .then(data => console.log(data));
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>EarthQuest App</Text>
    </View>
  );
}
