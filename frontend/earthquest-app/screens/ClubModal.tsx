import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  FlatList,
  SafeAreaView,
  Linking,
  TextInput,
  Alert,
} from "react-native";
import * as ImagePicker from 'expo-image-picker';

/**
 * 📝 Reusable Input Field Component
 */
function FormInput({ label, value, onChange, multiline = false, editable = true, placeholder = "" }: any) {
  return (
    <View style={{ marginBottom: 15 }}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.inputField, multiline && { height: 100, textAlignVertical: 'top' }, !editable && { opacity: 0.6 }]}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        editable={editable}
        placeholder={placeholder}
        placeholderTextColor="#8DBFA1"
      />
    </View>
  );
}

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

// 📚 INITIAL MOCK DATA
const INITIAL_CLUBS = [
  {
    id: 'EQ-1001',
    name: "EarthQuest Alpha Club",
    bio: "The very first Vanguardians. We explore, conquer, and rebuild the world one quest at a time.",
    image: "https://images.unsplash.com/photo-1511497584788-876760111969?q=80&w=600&auto=format&fit=crop",
    discord: "https://discord.com",
    role: "gm" // Green Background
  },
  {
    id: 'EQ-2042',
    name: "Wilderness Pathfinders",
    bio: "Dedicated to mapping the deepest forests and uncharted territories.",
    image: "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=600&auto=format&fit=crop",
    discord: "https://discord.com",
    role: "member" // Yellow Background
  },
  {
    id: 'EQ-8899',
    name: "The Iron Watch",
    bio: "We guard the northern borders from rogue elements.",
    image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=600&auto=format&fit=crop",
    discord: "https://discord.com",
    role: "none" // White Background
  }
];

export default function ClubScreen({ navigation }: any) {
  // --- GLOBAL SYSTEM STATE ---
  // Change this to "member" to test what happens when you aren't a GM globally!
  const GLOBAL_USER_ROLE = "gm"; 

  // --- COMPONENT STATE ---
  const [clubs, setClubs] = useState(INITIAL_CLUBS);
  const [selectedClub, setSelectedClub] = useState<any | null>(null);
  
  // Navigation Views: 'list' | 'details' | 'edit' | 'create'
  const [currentView, setCurrentView] = useState<'list' | 'details' | 'edit' | 'create'>('list');
  
  const [joinClubId, setJoinClubId] = useState("");
  const [editClubForm, setEditClubForm] = useState<any>({});
  
  const [expandedMemberId, setExpandedMemberId] = useState<number | null>(null);
  const [rosterTab, setRosterTab] = useState<'active' | 'blocked'>('active');

  // Roster State
  const [clubMembers, setClubMembers] = useState([
    { id: 1, name: "John Doe", username: "johndoe", role: "gm", avatar: "https://cdn-icons-png.flaticon.com/512/149/149071.png" }, 
    { id: 2, name: "Jane Smith", username: "janesmith", role: "member", avatar: "https://cdn-icons-png.flaticon.com/512/149/149071.png" }, 
    { id: 3, name: "Mike Johnson", username: "mikej", role: "registered", avatar: "https://cdn-icons-png.flaticon.com/512/149/149071.png" }, 
  ]);

  const [blockedMembers, setBlockedMembers] = useState([
    { id: 99, name: "Rule Breaker", username: "troll_123", role: "registered", avatar: "https://cdn-icons-png.flaticon.com/512/149/149071.png" }, 
  ]);

  // --- LOGIC: JOIN & CREATE ---
  const handleSendJoinRequest = (id?: string) => {
    const targetId = id || joinClubId;
    if (!targetId.trim()) return Alert.alert("Error", "Please enter a valid Club ID.");
    
    Alert.alert("Request Sent!", `Your request to join Club ID: ${targetId} has been sent to the GM.`);
    setJoinClubId("");
  };

  const handleCreateClub = () => {
    if (!editClubForm.name || !editClubForm.bio) return Alert.alert("Error", "Name and Bio are required.");
    
    const newClub = {
      ...editClubForm,
      id: `EQ-${Math.floor(1000 + Math.random() * 9000)}`, // Generate random ID
      role: 'gm', // Creator is automatically the GM
      image: editClubForm.image || "https://images.unsplash.com/photo-1511497584788-876760111969?q=80&w=600&auto=format&fit=crop"
    };

    setClubs([newClub, ...clubs]);
    setCurrentView('list');
    setEditClubForm({});
    Alert.alert("Success", `Club created! Your Club ID is ${newClub.id}`);
  };

  const saveClubDetails = () => { 
    // Update the specific club in our array
    setClubs(clubs.map(c => c.id === selectedClub.id ? { ...c, ...editClubForm } : c));
    setSelectedClub({ ...selectedClub, ...editClubForm }); 
    setCurrentView('details'); 
  };

  // --- LOGIC: ROSTER MANAGEMENT ---
  const handleAddMember = () => {
    Alert.alert("Add Member", "Open member search/invite dialog here.");
  };

  const handleBlockMember = (memberId: number) => {
    const memberToBlock = clubMembers.find(m => m.id === memberId);
    if (memberToBlock) {
      setBlockedMembers([...blockedMembers, memberToBlock]);
      setClubMembers(prev => prev.filter(m => m.id !== memberId));
    }
    setExpandedMemberId(null);
  };

  const handleUnblockMember = (memberId: number) => {
    const memberToUnblock = blockedMembers.find(m => m.id === memberId);
    if (memberToUnblock) {
      setClubMembers([...clubMembers, memberToUnblock]);
      setBlockedMembers(prev => prev.filter(m => m.id !== memberId));
    }
    setExpandedMemberId(null);
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9], 
      quality: 1,
    });
    if (!result.canceled) setEditClubForm({ ...editClubForm, image: result.assets[0].uri });
  };

  // --- DYNAMIC CARD COLORS ---
  const getCardStyle = (role: string) => {
    if (role === 'gm') return { bg: '#1E5F3A', border: '#74B08A', text: '#E8F5E9', subtext: '#8DBFA1' }; // Green
    if (role === 'member') return { bg: '#FFD700', border: '#B89B00', text: '#0E1A14', subtext: '#4A3E00' }; // Yellow
    return { bg: '#EAF4EE', border: '#B0C4B9', text: '#0E1A14', subtext: '#44554B' }; // White
  };

  // ==========================================
  // VIEW 1: CLUB LIST 
  // ==========================================
  const renderClubListHeader = () => (
    <View style={{ marginBottom: 20 }}>
      {/* Search / Join Request Bar */}
      <View style={styles.joinRow}>
        <TextInput 
          style={styles.joinInput} 
          placeholder="Enter Club ID to Join..." 
          placeholderTextColor="#8DBFA1"
          value={joinClubId}
          onChangeText={setJoinClubId}
        />
        <TouchableOpacity style={styles.joinBtn} onPress={() => handleSendJoinRequest()}>
          <Text style={styles.joinBtnText}>Send Request</Text>
        </TouchableOpacity>
      </View>

      {/* Global GM Create Button */}
      {GLOBAL_USER_ROLE === 'gm' && (
        <TouchableOpacity 
          style={styles.createClubBtn} 
          onPress={() => {
            setEditClubForm({ name: "", bio: "", discord: "", image: "" });
            setCurrentView('create');
          }}
        >
          <Text style={styles.createClubBtnText}>+ Create New Club</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderClubList = () => (
    <FlatList
      data={clubs}
      keyExtractor={item => item.id}
      contentContainerStyle={{ padding: 20 }}
      ListHeaderComponent={renderClubListHeader}
      renderItem={({ item }) => {
        const styleTheme = getCardStyle(item.role);
        
        return (
          <TouchableOpacity 
            style={[styles.clubCard, { backgroundColor: styleTheme.bg, borderColor: styleTheme.border }]}
            onPress={() => {
              setSelectedClub(item);
              setCurrentView('details');
            }}
          >
            <Image source={{ uri: item.image }} style={styles.clubCardImage} />
            <View style={styles.clubCardContent}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Text style={[styles.clubCardTitle, { color: styleTheme.text }]} numberOfLines={1}>{item.name}</Text>
                {item.role !== 'none' && (
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: styleTheme.text, opacity: 0.7, marginTop: 4 }}>
                    {item.role.toUpperCase()}
                  </Text>
                )}
              </View>
              <Text style={{ fontSize: 12, color: styleTheme.text, opacity: 0.8, marginBottom: 8, fontWeight: 'bold' }}>ID: {item.id}</Text>
              <Text style={[styles.clubCardBio, { color: styleTheme.subtext }]} numberOfLines={2}>{item.bio}</Text>
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );

  // ==========================================
  // VIEW 2: CLUB DETAILS (Header Component)
  // ==========================================
  const renderClubHeader = () => (
    <View style={styles.clubInfoSection}>
      <Image source={{ uri: selectedClub.image }} style={styles.clubBanner} />
      
      {/* Only GM of THIS club can edit */}
      {selectedClub.role === "gm" && (
        <TouchableOpacity style={styles.editClubBtn} onPress={() => {
            setEditClubForm(selectedClub);
            setCurrentView('edit');
        }}>
          <Text style={styles.editClubBtnText}>✏️ Edit Club Info</Text>
        </TouchableOpacity>
      )}
      
      <Text style={styles.clubTitleText}>{selectedClub.name}</Text>
      <Text style={{ color: '#8DBFA1', fontWeight: 'bold', marginBottom: 10 }}>Club ID: {selectedClub.id}</Text>
      <Text style={styles.clubBio}>{selectedClub.bio}</Text>
      
      {/* 🛡️ ROLE ISOLATION: Discord vs Join Request */}
      {selectedClub.role !== 'none' ? (
        <TouchableOpacity style={styles.discordBtn} onPress={() => Linking.openURL(selectedClub.discord)}>
          <Text style={styles.discordBtnText}>💬 Join our Discord</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.joinRequestBtn} onPress={() => handleSendJoinRequest(selectedClub.id)}>
          <Text style={styles.joinRequestBtnText}>✉️ Request to Join Club</Text>
        </TouchableOpacity>
      )}

      {/* 🛡️ ROLE ISOLATION: Hide roster actions from Viewers */}
      {selectedClub.role !== 'none' && (
        <>
          <View style={styles.rosterHeader}>
            <Text style={styles.rosterTitle}>Club Roster ({rosterTab === 'active' ? clubMembers.length : blockedMembers.length})</Text>
            {/* Only GM can add members */}
            {selectedClub.role === "gm" && rosterTab === 'active' && (
              <TouchableOpacity style={styles.addMemberBtn} onPress={handleAddMember}>
                <Text style={styles.addMemberBtnText}>+ Add Member</Text>
              </TouchableOpacity>
            )}
          </View>

          {selectedClub.role === "gm" && (
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
        </>
      )}
    </View>
  );

  const displayedMembers = rosterTab === 'active' ? clubMembers : blockedMembers;

  // ==========================================
  // MAIN NAVIGATION HEADER LOGIC
  // ==========================================
  const handleBackPress = () => {
    if (currentView === 'edit' || currentView === 'create') {
      setCurrentView(selectedClub ? 'details' : 'list');
    } else if (currentView === 'details') {
      setSelectedClub(null);
      setCurrentView('list');
    } else {
      navigation.goBack(); // Return to Landing Screen
    }
  };

  const getHeaderText = () => {
    if (currentView === 'create') return "Create New Club";
    if (currentView === 'edit') return "Edit Club";
    if (currentView === 'details') return "Club Details";
    return "My Clubs";
  };

  // ==========================================
  // MAIN RENDER
  // ==========================================
  return (
    <SafeAreaView style={styles.container}>
      
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress}>
          <Text style={styles.navIconText}>←</Text> 
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getHeaderText()}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* --- RENDER VIEWS --- */}
      {currentView === 'list' && renderClubList()}

      {(currentView === 'edit' || currentView === 'create') && (
        <ScrollView contentContainerStyle={styles.formContainer}>
          <FormInput label="Club Name" value={editClubForm.name} onChange={(t:string) => setEditClubForm({...editClubForm, name: t})} />
          <FormInput label="Club Bio" value={editClubForm.bio} onChange={(t:string) => setEditClubForm({...editClubForm, bio: t})} multiline />
          <FormInput label="Discord Link" value={editClubForm.discord} onChange={(t:string) => setEditClubForm({...editClubForm, discord: t})} />
          
          <Text style={styles.inputLabel}>Club Banner Image URL (or upload)</Text>
          {editClubForm.image ? (
            <Image source={{ uri: editClubForm.image }} style={styles.imagePreview} />
          ) : null}
          <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
            <Text style={styles.uploadBtnText}>📸 Pick from Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveBtn} onPress={currentView === 'create' ? handleCreateClub : saveClubDetails}>
            <Text style={styles.saveBtnText}>{currentView === 'create' ? "Launch Club" : "Save Changes"}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {currentView === 'details' && (
        <FlatList
          ListHeaderComponent={renderClubHeader}
          data={selectedClub.role === 'none' ? [] : displayedMembers} // Hide roster data if Viewer
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
                </View>
                
                <View style={{ flex: 1, marginLeft: 15 }}>
                  <Text style={[styles.memberName, rosterTab === 'blocked' && { textDecorationLine: 'line-through', color: '#8DBFA1' }]}>{item.name}</Text>
                  <Text style={styles.memberSub}>@{item.username}</Text>
                </View>

                {/* Only GMs see interaction menu */}
                {selectedClub.role === 'gm' && (
                  <TouchableOpacity style={styles.editBtn} onPress={() => setExpandedMemberId(expandedMemberId === item.id ? null : item.id)}>
                    <Text style={{ color: '#74B08A' }}>⋮</Text>
                  </TouchableOpacity>
                )}
                {/* Members can view profiles but not edit */}
                {selectedClub.role === 'member' && (
                  <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate("UserProfileScreen", { userId: item.username })}>
                    <Text style={{ color: '#74B08A' }}>👁</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* GM ACTION MENU */}
              {selectedClub.role === 'gm' && expandedMemberId === item.id && (
                <View style={styles.expandMenu}>
                  <TouchableOpacity style={styles.expandBtn} onPress={() => {
                      setExpandedMemberId(null);
                      navigation.navigate("UserProfileScreen", { userId: item.username });
                  }}>
                     <Text style={styles.expandBtnText}>👁 View Profile</Text>
                  </TouchableOpacity>

                  {rosterTab === 'active' && (
                    <>
                      <TouchableOpacity style={styles.expandBtn}>
                        <Text style={styles.expandBtnText}>✏️ Update Role</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.expandBtn, { borderBottomWidth: 0 }]} onPress={() => handleBlockMember(item.id)}>
                        <Text style={[styles.expandBtnText, { color: '#FF6B6B' }]}>🚫 Block Member</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {rosterTab === 'blocked' && (
                    <TouchableOpacity style={[styles.expandBtn, { borderBottomWidth: 0 }]} onPress={() => handleUnblockMember(item.id)}>
                      <Text style={[styles.expandBtnText, { color: '#74B08A' }]}>✅ Unblock Member</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}
          ListEmptyComponent={() => {
            if (selectedClub.role === 'none') {
              return (
                <View style={{ alignItems: 'center', marginTop: 30 }}>
                  <Text style={{ color: '#8DBFA1', fontSize: 16 }}>🔒 You must be a member to view the roster.</Text>
                </View>
              );
            }
            return (
              <View style={{ alignItems: 'center', marginTop: 30 }}>
                <Text style={{ color: '#8DBFA1' }}>No {rosterTab} members found.</Text>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0E1A14" },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1E5F3A', paddingTop: 40 },
  headerTitle: { color: '#E8F5E9', fontSize: 20, fontWeight: 'bold' },
  navIconText: { fontSize: 28, color: "#E8F5E9", fontWeight: "bold" },
  
  /* Search & Create Buttons */
  joinRow: { flexDirection: 'row', marginBottom: 15 },
  joinInput: { flex: 1, backgroundColor: '#1E5F3A', color: '#EAF4EE', padding: 12, borderTopLeftRadius: 10, borderBottomLeftRadius: 10, borderWidth: 1, borderColor: '#74B08A', borderRightWidth: 0 },
  joinBtn: { backgroundColor: '#74B08A', paddingHorizontal: 15, justifyContent: 'center', borderTopRightRadius: 10, borderBottomRightRadius: 10 },
  joinBtnText: { color: '#0E1A14', fontWeight: 'bold' },
  
  // 🔥 UPDATED: Made the background color #74B08A to match the app theme!
  createClubBtn: { backgroundColor: '#74B08A', padding: 15, borderRadius: 10, alignItems: 'center', elevation: 3 },
  createClubBtnText: { color: '#0E1A14', fontWeight: 'bold', fontSize: 16 },

  /* Club List Cards */
  clubCard: { borderWidth: 1.5, borderRadius: 15, marginBottom: 15, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
  clubCardImage: { width: '100%', height: 120 },
  clubCardContent: { padding: 15 },
  clubCardTitle: { fontSize: 18, fontWeight: 'bold', flex: 1, paddingRight: 10 },
  clubCardBio: { fontSize: 14, marginTop: 4, lineHeight: 20 },

  /* FormInput Styles */
  formContainer: { padding: 20 },
  inputLabel: { color: '#8DBFA1', fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  inputField: { backgroundColor: '#1E5F3A', color: '#EAF4EE', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#74B08A', fontSize: 16 },
  saveBtn: { backgroundColor: '#74B08A', padding: 18, borderRadius: 12, marginTop: 20, alignItems: 'center' },
  saveBtnText: { color: '#0E1A14', fontWeight: 'bold', fontSize: 16 },
  
  /* Role Badge Styles */
  roleBadgeContainer: { backgroundColor: '#0E1A14', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#1E5F3A' },

  clubInfoSection: { padding: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1E5F3A', marginBottom: 15 },
  clubBanner: { width: '100%', height: 150, borderRadius: 12, borderWidth: 1, borderColor: '#74B08A', marginBottom: 15 },
  editClubBtn: { position: 'absolute', top: 30, right: 30, backgroundColor: 'rgba(14, 26, 20, 0.8)', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#74B08A' },
  editClubBtnText: { color: '#EAF4EE', fontSize: 12, fontWeight: 'bold' },
  clubTitleText: { fontSize: 24, fontWeight: 'bold', color: '#E8F5E9', textAlign: 'center', marginBottom: 5 },
  clubBio: { fontSize: 14, color: '#8DBFA1', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  discordBtn: { backgroundColor: '#5865F2', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 8, flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  discordBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  
  joinRequestBtn: { backgroundColor: '#74B08A', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 8, flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  joinRequestBtnText: { color: '#0E1A14', fontWeight: 'bold', fontSize: 16 },

  rosterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: 10, marginBottom: 10 },
  rosterTitle: { fontSize: 18, fontWeight: 'bold', color: '#E8F5E9' },
  addMemberBtn: { backgroundColor: '#74B08A', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  addMemberBtnText: { color: '#0E1A14', fontWeight: 'bold', fontSize: 14 },
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
  memberName: { color: '#E8F5E9', fontWeight: 'bold', fontSize: 16 },
  memberSub: { color: '#8DBFA1', fontSize: 12 },
  editBtn: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#123524', borderRadius: 5, borderWidth: 1, borderColor: '#74B08A' },
  expandMenu: { backgroundColor: '#123524', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, borderWidth: 1, borderTopWidth: 0, borderColor: '#74B08A' },
  expandBtn: { padding: 15, borderBottomWidth: 0.5, borderBottomColor: '#1E5F3A' },
  expandBtnText: { color: '#EAF4EE', fontSize: 14 },
  uploadBtn: { backgroundColor: '#123524', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#74B08A', alignItems: 'center', marginBottom: 15 },
  uploadBtnText: { color: '#EAF4EE', fontWeight: 'bold' },
  imagePreview: { width: '100%', height: 150, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#74B08A' },
});