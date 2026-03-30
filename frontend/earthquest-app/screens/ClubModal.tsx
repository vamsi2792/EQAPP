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
} from "react-native";
import * as ImagePicker from 'expo-image-picker';

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

export default function ClubModal({ navigation }: any) {
  // --- STATE ---
  const currentUserRole = "gm"; // Hardcoded for now
  const [isEditingClub, setIsEditingClub] = useState(false);
  const [expandedMemberId, setExpandedMemberId] = useState<number | null>(null);
  const [rosterTab, setRosterTab] = useState<'active' | 'blocked'>('active');

  const [clubData, setClubData] = useState({
    name: "EarthQuest Alpha Club",
    bio: "The very first Vanguardians. We explore, conquer, and rebuild the world one quest at a time.",
    image: "https://images.unsplash.com/photo-1511497584788-876760111969?q=80&w=600&auto=format&fit=crop",
    discord: "https://discord.com"
  });
  const [editClubForm, setEditClubForm] = useState({ ...clubData });

  const [clubMembers, setClubMembers] = useState([
    { id: 1, name: "John Doe", username: "johndoe", role: "gm", avatar: "https://cdn-icons-png.flaticon.com/512/149/149071.png" }, 
    { id: 2, name: "Jane Smith", username: "janesmith", role: "member", avatar: "https://cdn-icons-png.flaticon.com/512/149/149071.png" }, 
    { id: 3, name: "Mike Johnson", username: "mikej", role: "registered", avatar: "https://cdn-icons-png.flaticon.com/512/149/149071.png" }, 
  ]);

  const [blockedMembers, setBlockedMembers] = useState([
    { id: 99, name: "Rule Breaker", username: "troll_123", role: "registered", avatar: "https://cdn-icons-png.flaticon.com/512/149/149071.png" }, 
  ]);

  // --- LOGIC ---
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
    setExpandedMemberId(null);
    navigation.navigate("UserProfileScreen", { userId: username });
  };

  // --- UI COMPONENTS ---
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

  const displayedMembers = rosterTab === 'active' ? clubMembers : blockedMembers;

  return (
    <SafeAreaView style={styles.modalContainer}>
      <View style={styles.modalHeader}>
        <TouchableOpacity onPress={() => { 
            if (isEditingClub) setIsEditingClub(false); 
            else navigation.goBack(); // <-- Go back to the previous screen
          }}>
          <Text style={styles.navIconText}>←</Text> 
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
                
                {/* Avatar & Role Badge Only */}
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

                <TouchableOpacity style={styles.editBtn} onPress={() => setExpandedMemberId(expandedMemberId === item.id ? null : item.id)}>
                  <Text style={{ color: '#74B08A' }}>{currentUserRole === 'gm' ? '⋮' : '👁'}</Text>
                </TouchableOpacity>
              </View>

              {/* EXPANDED MEMBER ACTION MENU */}
              {expandedMemberId === item.id && (
                <View style={styles.expandMenu}>
                  <TouchableOpacity style={styles.expandBtn} onPress={() => viewMemberProfile(item.username)}>
                     <Text style={styles.expandBtnText}>👁 View Profile</Text>
                  </TouchableOpacity>

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
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: "#0E1A14" },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1E5F3A', paddingTop: 40 }, // Added paddingTop for better top spacing
  modalTitle: { color: '#E8F5E9', fontSize: 20, fontWeight: 'bold' },
  navIconText: { fontSize: 28, color: "#E8F5E9", fontWeight: "bold" },
  
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
  clubTitleText: { fontSize: 24, fontWeight: 'bold', color: '#E8F5E9', textAlign: 'center', marginBottom: 10 },
  clubBio: { fontSize: 14, color: '#8DBFA1', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  discordBtn: { backgroundColor: '#5865F2', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 8, flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  discordBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
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