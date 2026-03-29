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
  FlatList,
  SafeAreaView,
  Linking,
  TextInput,
} from "react-native";
import * as ImagePicker from 'expo-image-picker';
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
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Modal States
  const [clubModalOpen, setClubModalOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [vanguardianModalOpen, setVanguardianModalOpen] = useState(false);
  
  const [expandedMemberId, setExpandedMemberId] = useState<number | null>(null);
  const [isEditingClub, setIsEditingClub] = useState(false);

  // 🛡️ NEW: Roster Tab State (Active vs Blocked)
  const [rosterTab, setRosterTab] = useState<'active' | 'blocked'>('active');

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

  const [clubData, setClubData] = useState({
    name: "EarthQuest Alpha Club",
    bio: "The very first Vanguardians. We explore, conquer, and rebuild the world one quest at a time.",
    image: "https://images.unsplash.com/photo-1511497584788-876760111969?q=80&w=600&auto=format&fit=crop",
    discord: "https://discord.com"
  });
  const [editClubForm, setEditClubForm] = useState({ ...clubData });
  
  const [clubMembers, setClubMembers] = useState([
    { id: 1, name: "John Doe", username: "johndoe", role: "gm", avatar: "https://cdn-icons-png.flaticon.com/512/149/149071.png", score: 85 }, 
    { id: 2, name: "Jane Smith", username: "janesmith", role: "member", avatar: "https://cdn-icons-png.flaticon.com/512/149/149071.png", score: 45 }, 
    { id: 3, name: "Mike Johnson", username: "mikej", role: "registered", avatar: "https://cdn-icons-png.flaticon.com/512/149/149071.png", score: 20 }, 
  ]);

  // 🛡️ NEW: Blocked Members State
  const [blockedMembers, setBlockedMembers] = useState([
    { id: 99, name: "Rule Breaker", username: "troll_123", role: "registered", avatar: "https://cdn-icons-png.flaticon.com/512/149/149071.png", score: 5 }, 
  ]);

  const handleLogout = () => { setMenuOpen(false); logout(); };
  
  // 🚫 Handle Blocking
  const handleBlockMember = (memberId: number) => {
    const memberToBlock = clubMembers.find(m => m.id === memberId);
    if (memberToBlock) {
      setBlockedMembers([...blockedMembers, memberToBlock]);
      setClubMembers(prev => prev.filter(m => m.id !== memberId));
    }
    setExpandedMemberId(null);
  };

  // ✅ Handle Unblocking
  const handleUnblockMember = (memberId: number) => {
    const memberToUnblock = blockedMembers.find(m => m.id === memberId);
    if (memberToUnblock) {
      setClubMembers([...clubMembers, memberToUnblock]);
      setBlockedMembers(prev => prev.filter(m => m.id !== memberId));
    }
    setExpandedMemberId(null);
  };
  
  const saveClubDetails = () => { setClubData(editClubForm); setIsEditingClub(false); };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9], 
      quality: 1,
    });

    if (!result.canceled) {
      setEditClubForm({ ...editClubForm, image: result.assets[0].uri });
    }
  };

  const viewMemberProfile = (username: string) => {
    setClubModalOpen(false);
    setExpandedMemberId(null);
    navigation.navigate("UserProfileScreen", { userId: username });
  };

  // 📝 CLUB ROSTER HEADER
  const renderClubHeader = () => (
    <View style={styles.clubInfoSection}>
      <Image source={{ uri: clubData.image }} style={styles.clubBanner} />
      {currentUserRole === "gm" && (
        <TouchableOpacity style={styles.editClubBtn} onPress={() => { setEditClubForm(clubData); setIsEditingClub(true); }}>
          <Text style={styles.editClubBtnText}>✏️ Edit Club Info</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.clubTitleText}>{clubData.name}</Text>
      <Text style={styles.clubBio}>{clubData.bio}</Text>
      <TouchableOpacity style={styles.discordBtn} onPress={() => Linking.openURL(clubData.discord)}>
        <Text style={styles.discordBtnText}>💬 Join our Discord</Text>
      </TouchableOpacity>
      
      <View style={styles.rosterHeader}>
        <Text style={styles.rosterTitle}>Club Roster ({rosterTab === 'active' ? clubMembers.length : blockedMembers.length})</Text>
        {currentUserRole === "gm" && rosterTab === 'active' && (
          <TouchableOpacity style={styles.addMemberBtn}>
            <Text style={styles.addMemberBtnText}>+ Add Member</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 🛡️ NEW: GM Tabs for Active vs Blocked Members */}
      {currentUserRole === "gm" && (
        <View style={styles.rosterTabsContainer}>
          <TouchableOpacity 
            style={[styles.rosterTabBtn, rosterTab === 'active' && styles.rosterTabBtnActive]} 
            onPress={() => setRosterTab('active')}
          >
            <Text style={[styles.rosterTabBtnText, rosterTab === 'active' && styles.rosterTabBtnTextActive]}>Active</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.rosterTabBtn, rosterTab === 'blocked' && styles.rosterTabBtnActive]} 
            onPress={() => setRosterTab('blocked')}
          >
            <Text style={[styles.rosterTabBtnText, rosterTab === 'blocked' && styles.rosterTabBtnTextActive]}>Blocked</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // Determine which list to show based on the tab
  const displayedMembers = rosterTab === 'active' ? clubMembers : blockedMembers;

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
          <TouchableOpacity style={styles.actionBtn} onPress={() => setClubModalOpen(true)}>
            <Text style={styles.actionBtnText}>Club</Text>
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

      {/* ======================= */}
      {/* 🔹 CLUB MODAL */}
      {/* ======================= */}
      <Modal visible={clubModalOpen} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { 
                if (isEditingClub) setIsEditingClub(false); 
                else setClubModalOpen(false); 
              }}>
              <Text style={styles.navIconText}>{isEditingClub ? "←" : "✕"}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{isEditingClub ? "Edit Club" : "Club Details"}</Text>
            <View style={{ width: 40 }} />
          </View>

          {isEditingClub ? (
            <ScrollView contentContainerStyle={styles.formContainer}>
              <FormInput label="Club Name" value={editClubForm.name} onChange={(t:string) => setEditClubForm({...editClubForm, name: t})} />
              <FormInput label="Club Bio" value={editClubForm.bio} onChange={(t:string) => setEditClubForm({...editClubForm, bio: t})} multiline />
              
              <Text style={styles.inputLabel}>Club Banner Image</Text>
              {editClubForm.image ? (
                <Image source={{ uri: editClubForm.image }} style={styles.imagePreview} />
              ) : null}
              <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
                <Text style={styles.uploadBtnText}>📸 Pick from Gallery</Text>
              </TouchableOpacity>

              <FormInput label="Discord Link" value={editClubForm.discord} onChange={(t:string) => setEditClubForm({...editClubForm, discord: t})} />

              <TouchableOpacity style={styles.saveBtn} onPress={saveClubDetails}>
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <FlatList
              ListHeaderComponent={renderClubHeader}
              data={displayedMembers}
              keyExtractor={m => m.id.toString()}
              contentContainerStyle={{ paddingBottom: 40 }}
              renderItem={({ item }) => (
                <View style={[styles.memberItemContainer, rosterTab === 'blocked' && { opacity: 0.6 }]}>
                  <View style={styles.memberRow}>
                    <View style={styles.listAvatarWrapper}>
                      <Image source={{ uri: item.avatar }} style={styles.listAvatar} />
                      <View style={styles.listRoleBadgePos}>
                         <RoleBadge role={item.role} size={20} />
                      </View>
                      <View style={styles.listBadgePos}>
                        <VanguardianBadge score={item.score} outOf={100} size={28} totalSlices={16} />
                      </View>
                    </View>
                    
                    <View style={{ flex: 1, marginLeft: 15 }}>
                      <Text style={[styles.memberName, rosterTab === 'blocked' && { textDecorationLine: 'line-through', color: '#8DBFA1' }]}>{item.name}</Text>
                      <Text style={styles.memberSub}>@{item.username}</Text>
                    </View>

                    <TouchableOpacity style={styles.editBtn} onPress={() => setExpandedMemberId(expandedMemberId === item.id ? null : item.id)}>
                      <Text style={{ color: '#74B08A' }}>{currentUserRole === 'gm' ? '⋮' : '👁'}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* EXPANDED MEMBER ACTION MENU */}
                  {expandedMemberId === item.id && (
                    <View style={styles.expandMenu}>
                      {/* View Profile is visible to everyone */}
                      <TouchableOpacity style={styles.expandBtn} onPress={() => viewMemberProfile(item.username)}>
                         <Text style={styles.expandBtnText}>👁 View Profile</Text>
                      </TouchableOpacity>

                      {/* GM Specific Actions */}
                      {currentUserRole === "gm" && rosterTab === 'active' && (
                        <>
                          <TouchableOpacity style={styles.expandBtn}>
                            <Text style={styles.expandBtnText}>✏️ Update Role</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.expandBtn, { borderBottomWidth: 0 }]} onPress={() => handleBlockMember(item.id)}>
                            <Text style={[styles.expandBtnText, { color: '#FF6B6B' }]}>🚫 Block Member</Text>
                          </TouchableOpacity>
                        </>
                      )}

                      {/* GM Specific Unblock Action */}
                      {currentUserRole === "gm" && rosterTab === 'blocked' && (
                        <TouchableOpacity style={[styles.expandBtn, { borderBottomWidth: 0 }]} onPress={() => handleUnblockMember(item.id)}>
                          <Text style={[styles.expandBtnText, { color: '#74B08A' }]}>✅ Unblock Member</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              )}
              ListEmptyComponent={() => (
                <View style={{ alignItems: 'center', marginTop: 30 }}>
                  <Text style={{ color: '#8DBFA1' }}>No {rosterTab} members found.</Text>
                </View>
              )}
            />
          )}
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

  /* CLUB SPECIFIC STYLES */
  clubInfoSection: { padding: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1E5F3A', marginBottom: 15 },
  clubBanner: { width: '100%', height: 150, borderRadius: 12, borderWidth: 1, borderColor: '#74B08A', marginBottom: 15 },
  editClubBtn: { position: 'absolute', top: 30, right: 30, backgroundColor: 'rgba(14, 26, 20, 0.8)', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#74B08A' },
  editClubBtnText: { color: '#EAF4EE', fontSize: 12, fontWeight: 'bold' },
  clubTitleText: { fontSize: 24, fontWeight: 'bold', color: '#E8F5E9', textAlign: 'center', marginBottom: 10 },
  clubBio: { fontSize: 14, color: '#8DBFA1', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  discordBtn: { backgroundColor: '#5865F2', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 8, flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  discordBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  
  rosterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: 10, marginBottom: 10 },
  rosterTitle: { fontSize: 18, fontWeight: 'bold', color: '#E8F5E9' },
  addMemberBtn: { backgroundColor: '#74B08A', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  addMemberBtnText: { color: '#0E1A14', fontWeight: 'bold', fontSize: 14 },

  /* ROSTER TABS */
  rosterTabsContainer: { flexDirection: 'row', width: '100%', backgroundColor: '#123524', borderRadius: 8, padding: 4, marginTop: 10 },
  rosterTabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  rosterTabBtnActive: { backgroundColor: '#1E5F3A' },
  rosterTabBtnText: { color: '#8DBFA1', fontSize: 14, fontWeight: 'bold' },
  rosterTabBtnTextActive: { color: '#EAF4EE' },

  memberItemContainer: { marginHorizontal: 20, marginBottom: 15 },
  memberRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E5F3A', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#74B08A' },
  listAvatarWrapper: { position: 'relative' },
  listAvatar: { width: 50, height: 50, borderRadius: 25 },
  listRoleBadgePos: { position: 'absolute', top: -5, right: -5 },
  listBadgePos: { position: 'absolute', bottom: -5, right: -5 },
  memberName: { color: '#E8F5E9', fontWeight: 'bold', fontSize: 16 },
  memberSub: { color: '#8DBFA1', fontSize: 12 },
  editBtn: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#123524', borderRadius: 5, borderWidth: 1, borderColor: '#74B08A' },
  
  expandMenu: { backgroundColor: '#123524', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, borderWidth: 1, borderTopWidth: 0, borderColor: '#74B08A' },
  expandBtn: { padding: 15, borderBottomWidth: 0.5, borderBottomColor: '#1E5F3A' },
  expandBtnText: { color: '#EAF4EE', fontSize: 14 },

  /* IMAGE UPLOAD UI */
  uploadBtn: { backgroundColor: '#123524', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#74B08A', alignItems: 'center', marginBottom: 15 },
  uploadBtnText: { color: '#EAF4EE', fontWeight: 'bold' },
  imagePreview: { width: '100%', height: 150, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#74B08A' },
});