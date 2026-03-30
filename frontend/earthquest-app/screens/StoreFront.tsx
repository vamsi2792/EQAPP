import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Alert,
  Linking,
} from "react-native";

// 🛍️ Mock Product Data
const STORE_PRODUCTS = [
  {
    id: "1",
    title: "EarthQuest Player's Handbook",
    description: "Product Description here. Lorem ipsum dolor sit amet, consectetur adipiscing elit",
    imagePlaceholder: "🖼️",
  },
  {
    id: "2",
    title: "EarthQuest Gamesheets Pack",
    description: "Product Description here. Lorem ipsum dolor sit amet, consectetur adipiscing elit",
    imagePlaceholder: "🖼️",
  },
  {
    id: "3",
    title: "EarthQuest Game Mentor's Rulebook",
    description: "Product Description here. Lorem ipsum dolor sit amet, consectetur adipiscing elit",
    imagePlaceholder: "🖼️",
  },
  {
    id: "4",
    title: "EarthQuest Game Mentor's Screen",
    description: "Product Description here. Lorem ipsum dolor sit amet, consectetur adipiscing elit",
    imagePlaceholder: "🖼️",
  },
];

// 📜 Membership Features Data
const MEMBERSHIP_FEATURES = [
  { label: "Access to EQ using adventure code", free: true, mem: true },
  { label: "Player's handbook and Game sheets", free: true, mem: true },
  { label: "Account Creation", free: false, mem: true },
  { label: "Vanguardian Profile", free: false, mem: true },
  { label: "Customizable Avatar", free: false, mem: true },
  { label: "Access to Player's Forum", free: false, mem: true },
  { label: "Become a GM", free: false, mem: true },
];

export default function StorefrontScreen({ navigation }: any) {
  // MOCK STATE: Change this to 'member' or 'gm' to test access
  const [currentUserRole, setCurrentUserRole] = useState<"registered" | "member" | "gm">("registered");

  const handleAddToCart = (product: any) => {
    // 🛑 Check if user is logged in & is a member
    if (currentUserRole !== "member" && currentUserRole !== "gm") {
      Alert.alert(
        "Membership Required",
        "You must be an active EarthQuest Member to access the storefront.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Scroll down to Upgrade", style: "default" }
        ]
      );
      return;
    }
    // ✅ Proceed if they are a member
    Alert.alert("Added to Cart", `${product.title} has been added to your inventory.`);
  };

  // 📦 RENDER: Store Product Card
  const renderProductCard = ({ item }: { item: any }) => (
    <View style={styles.cardContainer}>
      <View style={styles.imageBox}>
        <Text style={styles.imageIcon}>{item.imagePlaceholder}</Text>
      </View>
      <Text style={styles.productTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.productDesc} numberOfLines={4}>{item.description}</Text>
      
      <TouchableOpacity style={styles.addButton} onPress={() => handleAddToCart(item)}>
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );

  // 💎 RENDER: Membership Footer
  const renderMembershipFooter = () => (
    <View style={styles.footerContainer}>
      <Text style={styles.footerHeaderTitle}>Become an EarthQuest Member</Text>

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={styles.featureHeaderColumn}>WHAT'S INCLUDED</Text>
        <Text style={styles.statusHeaderColumn}>FREE</Text>
        <Text style={styles.statusHeaderColumn}>MEMBERSHIP</Text>
      </View>

      {/* Table Rows */}
      {MEMBERSHIP_FEATURES.map((item, index) => (
        <View key={index} style={styles.tableRow}>
          <Text style={styles.featureText}>{item.label}</Text>
          
          {/* Free Column */}
          <View style={styles.checkCell}>
            {item.free ? 
              <Text style={styles.checkMark}>✓</Text> : 
              <Text style={styles.dashMark}>—</Text>
            }
          </View>

          {/* Membership Column */}
          <View style={styles.checkCell}>
            {item.mem ? 
              <Text style={styles.checkMark}>✓</Text> : 
              <Text style={styles.dashMark}>—</Text>
            }
          </View>
        </View>
      ))}

      {/* Upgrade Call to Action */}
      <View style={styles.upgradeSection}>
        <Text style={styles.upgradeTitle}>Upgrade on Our Website</Text>
        <TouchableOpacity 
          style={styles.priceCard}
          onPress={() => Linking.openURL('https://earthquest.com/membership')}
        >
          <View style={styles.cardLeft}>
             <View style={styles.iconCircle}>
                <Text style={{fontSize: 20}}>⭐</Text>
             </View>
             <View>
                <Text style={styles.membershipLabel}>Membership</Text>
                <Text style={styles.priceText}>$10 <Text style={styles.perYear}>Annually</Text></Text>
             </View>
          </View>
          <Text style={{color: '#74B08A', fontSize: 18, fontWeight: 'bold'}}>↗</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* TOP HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>EarthQuest Storefront</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* SCROLLABLE GRID & FOOTER */}
      <FlatList
        data={STORE_PRODUCTS}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.rowWrapper}
        renderItem={renderProductCard}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={renderMembershipFooter} // 👈 Appends the membership table directly to the bottom
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0E1A14",
  },
  
  /* HEADER STYLES */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#1E5F3A",
  },
  backButton: { padding: 5 },
  backButtonText: { fontSize: 28, color: "#E8F5E9", fontWeight: "bold" },
  headerTitle: { fontSize: 24, fontWeight: "900", color: "#E8F5E9", letterSpacing: 0.5 },

  /* GRID STYLES */
  listContent: { padding: 15, paddingBottom: 40 },
  rowWrapper: { justifyContent: "space-between", marginBottom: 15 },

  /* CARD STYLES */
  cardContainer: {
    width: "48%", 
    backgroundColor: "#1E5F3A",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#74B08A",
    position: "relative", 
  },
  imageBox: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#123524",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#74B08A",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  imageIcon: { fontSize: 32 },
  productTitle: { fontSize: 13, fontWeight: "900", color: "#E8F5E9", marginBottom: 6, lineHeight: 18 },
  productDesc: { fontSize: 11, color: "#8DBFA1", lineHeight: 15, marginBottom: 25 },
  
  addButton: {
    position: "absolute",
    bottom: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EAF4EE",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#0E1A14",
  },
  addButtonText: { fontSize: 20, fontWeight: "600", color: "#0E1A14", marginTop: -2 },

  /* MEMBERSHIP FOOTER STYLES */
  footerContainer: {
    marginTop: 40,
    paddingTop: 30,
    paddingHorizontal: 10,
  },
  footerHeaderTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#E8F5E9",
    marginBottom: 25,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1E5F3A',
    paddingBottom: 12,
    marginBottom: 8,
  },
  featureHeaderColumn: { flex: 2, color: '#8DBFA1', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  statusHeaderColumn: { flex: 1, color: '#8DBFA1', fontSize: 11, fontWeight: '800', textAlign: 'center', letterSpacing: 0.5 },
  
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1E5F3A',
  },
  featureText: { flex: 2, color: '#EAF4EE', fontSize: 13, fontWeight: '500', lineHeight: 18, paddingRight: 10 },
  checkCell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  checkMark: { color: "#EAF4EE", fontSize: 16, fontWeight: '600' },
  dashMark: { color: '#1E5F3A', fontSize: 18, fontWeight: 'bold' },
  
  upgradeSection: { marginTop: 40, alignItems: 'center' },
  upgradeTitle: { color: '#EAF4EE', fontSize: 20, fontWeight: '700', marginBottom: 20 },
  priceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E5F3A',
    width: '100%',
    padding: 20,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#74B08A',
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  membershipLabel: { color: '#8DBFA1', fontSize: 13, fontWeight: '600', marginBottom: 2 },
  priceText: { color: '#EAF4EE', fontSize: 22, fontWeight: '900' },
  perYear: { fontSize: 12, fontWeight: '400', color: '#8DBFA1' },
});
