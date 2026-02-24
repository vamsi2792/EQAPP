import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  FlatList,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";

interface Props {
  placeholder: string;
  data: string[];
  value: string;
  onSelect: (value: string) => void;
  keyboardType?: any;
}

export default function SearchableDropdown({
  placeholder,
  data,
  value,
  onSelect,
  keyboardType = "default",
}: Props) {
  const [inputValue, setInputValue] = useState(value || "");
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  const filteredData = data.filter((item) =>
    item.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <TextInput
        placeholder={placeholder}
        value={inputValue}
        keyboardType={keyboardType}
        autoCorrect={false}
        autoCapitalize="none"
        importantForAutofill="no"
        onFocus={() => setShowList(true)}
        onChangeText={(text) => {
          setInputValue(text);
          setShowList(true);
        }}
        onBlur={() => {
          // when leaving input, commit whatever user typed
          onSelect(inputValue);
        }}
        style={styles.input}
        placeholderTextColor="#999"
      />

      {showList && filteredData.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            keyboardShouldPersistTaps="always"
            data={filteredData}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  setInputValue(item);
                //   onSelect(item);
                  setShowList(false);
                }}
                style={styles.item}
              >
                <Text style={styles.itemText}>{item}</Text>
              </Pressable>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D5E3DB",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#FFF",
  },
  dropdown: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#D5E3DB",
    borderRadius: 14,
    maxHeight: 160,
    marginTop: 6,
  },
  item: {
    padding: 14,
  },
  itemText: {
    fontSize: 14,
  },
});
