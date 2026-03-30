import React, { useContext, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
} from "react-native";
import { AuthContext } from "../App";


/**
 * ⭐ Role Badge Component
 */
function RoleBadge({ role, size = 28 }: { role: string; size?: number }) {
  let color = "#EAF4EE"; // White (Registered)
  if (role === "member") color = "#FFD700"; // Yellow (Member)
  if (role === "gm") color = "#74B08A"; // Green (GM)

  return (
    <View style={[styles.roleBadgeContainer, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={{ color, fontSize: size * 0.6, marginTop: -2 }}>★</Text>
    </View>
  );
}

/**
 * 🍕 Vanguardian "Pizza Slice" Tree Badge Component
 */
function VanguardianBadge({ score, outOf, size = 80, totalSlices = 16 }: { score: number; outOf: number; size?: number; totalSlices?: number }) {
  const filledSlices = Math.round((score / outOf) * totalSlices);
  const slices = [];
  const cuts = [];

  const radius = size / 2;
  const sliceAngle = 360 / totalSlices;
  const sliceAngleRad = (sliceAngle * Math.PI) / 180;
  const triangleBase = (2 * radius * Math.tan(sliceAngleRad / 2)) * 1.15; 

  for (let i = 0; i < totalSlices; i++) {
    const isFilled = i < filledSlices;
    const rotation = i * sliceAngle;
    slices.push(
      <View key={`slice-${i}`} style={[styles.sliceContainer, { width: size, height: size, transform: [{ rotate: `${rotation}deg` }] }]}>
        <View style={{
            width: 0, height: 0, borderTopWidth: radius, 
            borderTopColor: isFilled ? '#74B08A' : '#174D2E', 
            borderLeftWidth: triangleBase / 2, borderRightWidth: triangleBase / 2,
            borderLeftColor: 'transparent', borderRightColor: 'transparent',
            position: 'absolute', top: 0,
        }} />
      </View>
    );
  }

  for (let i = 0; i < totalSlices / 2; i++) {
    const rotation = (i * sliceAngle) + (sliceAngle / 2);
    cuts.push(
      <View key={`cut-${i}`} style={{
          position: 'absolute', width: 2, height: size,
          backgroundColor: '#0E1A14', left: size / 2 - 1,
          transform: [{ rotate: `${rotation}deg` }], zIndex: 5,
      }} />
    );
  }

  const innerSize = size * 0.6;

  return (
    <View style={[styles.badgeBase, { width: size, height: size, borderRadius: radius }]}>
      {slices}
      {cuts}
      <View style={[styles.badgeInnerCore, { width: innerSize, height: innerSize, borderRadius: innerSize / 2 }]}>
        <Image 
          source={{ uri: "https://cdn-icons-png.flaticon.com/512/1892/1892751.png" }} 
          style={{ width: innerSize * 0.7, height: innerSize * 0.7, tintColor: "#EAF4EE" }} 
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

/**
 * 📝 Reusable Input Field Component
 */
function FormInput({ label, value, onChange, multiline = false, editable = true }: any) {
  return (
    <View style={{ marginBottom: 15 }}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.inputField, multiline && { height: 100, textAlignVertical: 'top' }, !editable && { opacity: 0.6 }]}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        editable={editable}
      />
    </View>
  );
}

export default function MyProfileScreen({ navigation }: any) {
  const { logout } = useContext(AuthContext);
  
  // Modals & Menu State
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [vanguardianModalOpen, setVanguardianModalOpen] = useState(false);
  

  // User States
  const currentUserRole = "gm"; 
  
  const [accountData, setAccountData] = useState({
    firstName: "Alex",
    lastName: "Chen",
    userId: "EQ-8493-X",
    username: "alexc_eq",
    discord: "alexc#9921",
    email: "alex.chen@email.com",
    accountType: "Game Master",
    demographic: "North America, 20-29",
    aboutMe: "Veteran explorer mapping out new territories.",
  });

  const [vanguardianData, setVanguardianData] = useState({
    name: "Thalor Mossweaver",
    branchLevel: "Ranger / Level 42",
    homeEcoregion: "Temperate Deciduous Forest",
    education: "Botanical Tactics, Northern Academy",
    reputation: "Exalted (3,450 Rep)",
    resources: "450 Gold, 120 Wood, 15 Crystals",
    symbol: "https://cdn-icons-png.flaticon.com/512/2913/2913520.png",
    academy: "The Emerald Wardens",
    alliance: "Pact of the Deep Woods",
    personalDesc: "A swift tracker with a keen eye for finding rare medicinal herbs in the dense undergrowth.",
    staffDesc: "Carries the Oakwood Staff of Mending, wrapped in living vines."
  });

  const handleLogout = () => { setMenuOpen(false); logout(); };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER BUTTONS */}
      <TouchableOpacity style={styles.headerBtnLeft} onPress={() => navigation.goBack()}>
        <Text style={styles.navIconText}>←</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.headerBtnRight} onPress={() => setMenuOpen(true)}>
        <Text style={styles.navIconText}>☰</Text>
      </TouchableOpacity>

      {/* MENU MODAL */}
      <Modal visible={menuOpen} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setMenuOpen(false)}>
          <View style={styles.dropdown}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuOpen(false); navigation.navigate("Landing"); }}>
              <Text style={styles.menuText}>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={handleLogout}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* MAIN PROFILE SCREEN */}
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} bounces={false}>
        <View style={styles.banner} />
        
        {/* AVATAR & ROLE STAR */}
        <View style={styles.avatarWrapper}>
          <Image source={{ uri: "https://cdn-icons-png.flaticon.com/512/149/149071.png" }} style={styles.mainAvatar} />
          <View style={styles.mainRoleBadgePos}>
             <RoleBadge role={currentUserRole} size={32} />
          </View>
        </View>

        <Text style={styles.nameText}>{accountData.firstName} {accountData.lastName}</Text>
        <Text style={styles.userText}>@{accountData.username}</Text>

        {/* 🍕 TREE PIZZA BADGE */}
        <View style={styles.centeredBadgeContainer}>
           <VanguardianBadge score={70} outOf={100} size={80} totalSlices={16} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Achievements</Text>
          <View style={styles.chipRow}>
            {["Explorer", "Adventurer", "Collector", "Champion"].map(a => (
              <View key={a} style={styles.chip}><Text style={styles.chipText}>{a}</Text></View>
            ))}
          </View>
        </View>

        {/* DETAILED INFO BUTTONS */}
        <View style={{ paddingHorizontal: 20 }}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setAccountModalOpen(true)}>
            <Text style={styles.actionBtnText}>Account Details</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setVanguardianModalOpen(true)}>
            <Text style={styles.actionBtnText}>Vanguardian Profile</Text>
          </TouchableOpacity>
          
        </View>
      </ScrollView>

      

      {/* ======================= */}
      {/* 🔹 ACCOUNT DETAILS MODAL */}
      {/* ======================= */}
      <Modal visible={accountModalOpen} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setAccountModalOpen(false)}>
              <Text style={styles.navIconText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Account Details</Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView contentContainerStyle={styles.formContainer}>
            <FormInput label="First Name" value={accountData.firstName} onChange={(t:string) => setAccountData({...accountData, firstName: t})} />
            <FormInput label="Last Name" value={accountData.lastName} onChange={(t:string) => setAccountData({...accountData, lastName: t})} />
            <FormInput label="Username" value={accountData.username} onChange={(t:string) => setAccountData({...accountData, username: t})} />
            <FormInput label="User ID" value={accountData.userId} editable={false} />
            <FormInput label="Email ID" value={accountData.email} onChange={(t:string) => setAccountData({...accountData, email: t})} />
            <FormInput label="Discord Account" value={accountData.discord} onChange={(t:string) => setAccountData({...accountData, discord: t})} />
            <FormInput label="Account Type" value={accountData.accountType} editable={false} />
            <FormInput label="Membership Status" value={currentUserRole.toUpperCase()} editable={false} />
            <FormInput label="Demographics" value={accountData.demographic} onChange={(t:string) => setAccountData({...accountData, demographic: t})} />
            <FormInput label="About Me" value={accountData.aboutMe} onChange={(t:string) => setAccountData({...accountData, aboutMe: t})} multiline />
            
            <TouchableOpacity style={styles.saveBtn} onPress={() => setAccountModalOpen(false)}>
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ========================== */}
      {/* 🔹 VANGUARDIAN DETAILS MODAL */}
      {/* ========================== */}
      <Modal visible={vanguardianModalOpen} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setVanguardianModalOpen(false)}>
              <Text style={styles.navIconText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Vanguardian Profile</Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView contentContainerStyle={styles.formContainer}>
            <FormInput label="Vanguardian Name" value={vanguardianData.name} onChange={(t:string) => setVanguardianData({...vanguardianData, name: t})} />
            <FormInput label="Branch / Level" value={vanguardianData.branchLevel} editable={false} />
            <FormInput label="Home Ecoregion" value={vanguardianData.homeEcoregion} onChange={(t:string) => setVanguardianData({...vanguardianData, homeEcoregion: t})} />
            <FormInput label="Educational Background" value={vanguardianData.education} onChange={(t:string) => setVanguardianData({...vanguardianData, education: t})} />
            <FormInput label="Reputation" value={vanguardianData.reputation} editable={false} />
            <FormInput label="Resources" value={vanguardianData.resources} editable={false} />
            
            <FormInput label="Symbol Image URL" value={vanguardianData.symbol} onChange={(t:string) => setVanguardianData({...vanguardianData, symbol: t})} />
            
            <FormInput label="Academy Affiliation" value={vanguardianData.academy} onChange={(t:string) => setVanguardianData({...vanguardianData, academy: t})} />
            <FormInput label="Alliance Affiliation" value={vanguardianData.alliance} onChange={(t:string) => setVanguardianData({...vanguardianData, alliance: t})} />
            <FormInput label="Personal Description" value={vanguardianData.personalDesc} onChange={(t:string) => setVanguardianData({...vanguardianData, personalDesc: t})} multiline />
            <FormInput label="Staff Description" value={vanguardianData.staffDesc} onChange={(t:string) => setVanguardianData({...vanguardianData, staffDesc: t})} multiline />
            
            <TouchableOpacity style={styles.saveBtn} onPress={() => setVanguardianModalOpen(false)}>
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0E1A14" },
  headerBtnLeft: { position: "absolute", top: 50, left: 20, zIndex: 10 },
  headerBtnRight: { position: "absolute", top: 50, right: 20, zIndex: 10 },
  navIconText: { fontSize: 28, color: "#E8F5E9", fontWeight: "bold" },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'flex-end' },
  dropdown: { backgroundColor: "#0E1A14", width: 160, marginTop: 100, marginRight: 20, borderRadius: 10, borderWidth: 1, borderColor: "#74B08A" },
  menuItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: "#1E5F3A" },
  menuText: { color: "#EAF4EE", fontWeight: "600" },
  logoutText: { color: "#FF6B6B", fontWeight: "600" },
  
  banner: { height: 140, backgroundColor: "#1E5F3A" },
  
  avatarWrapper: { alignItems: "center", marginTop: -50, marginBottom: 15 },
  mainAvatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: "#74B08A" },
  mainRoleBadgePos: { position: "absolute", top: 0, right: '35%' }, 
  roleBadgeContainer: { backgroundColor: '#0E1A14', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#1E5F3A' },

  nameText: { fontSize: 26, fontWeight: "bold", color: "#E8F5E9", textAlign: "center" },
  userText: { fontSize: 14, color: "#8DBFA1", textAlign: "center", marginBottom: 15 },
  
  centeredBadgeContainer: { alignItems: 'center', marginBottom: 25 },
  
  card: { backgroundColor: "#1E5F3A", marginHorizontal: 20, marginBottom: 20, padding: 20, borderRadius: 15, borderWidth: 1, borderColor: "#74B08A" },
  cardTitle: { color: "#E8F5E9", fontSize: 18, fontWeight: "bold", marginBottom: 15 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  chip: { width: "48%", backgroundColor: "#123524", padding: 12, borderRadius: 8, marginBottom: 10, alignItems: "center", borderWidth: 1, borderColor: "#74B08A" },
  chipText: { color: "#EAF4EE", fontSize: 12, fontWeight: "600" },
  
  actionBtn: { backgroundColor: "#1E5F3A", padding: 18, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: "#74B08A", alignItems: "center" },
  actionBtnText: { color: "#EAF4EE", fontWeight: "bold", fontSize: 16 },
  
  /* PIZZA BADGE STYLES */
  sliceContainer: { position: 'absolute', alignItems: 'center' },
  badgeBase: { overflow: 'hidden', backgroundColor: '#0E1A14', borderWidth: 2, borderColor: '#1E5F3A', justifyContent: 'center', alignItems: 'center' },
  badgeInnerCore: { backgroundColor: '#0E1A14', justifyContent: 'center', alignItems: 'center', zIndex: 10, borderWidth: 1.5, borderColor: '#1E5F3A' },

  /* GENERAL MODAL STYLES */
  modalContainer: { flex: 1, backgroundColor: "#0E1A14" },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1E5F3A' },
  modalTitle: { color: '#E8F5E9', fontSize: 20, fontWeight: 'bold' },
  formContainer: { padding: 20 },
  inputLabel: { color: '#8DBFA1', fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  inputField: { backgroundColor: '#1E5F3A', color: '#EAF4EE', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#74B08A', fontSize: 16 },
  saveBtn: { backgroundColor: '#74B08A', padding: 18, borderRadius: 12, marginTop: 20, alignItems: 'center' },
  saveBtnText: { color: '#0E1A14', fontWeight: 'bold', fontSize: 16 },
});