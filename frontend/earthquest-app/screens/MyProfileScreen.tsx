import { View, Text, StyleSheet, Pressable, Image, Modal, TouchableOpacity, ScrollView, FlatList } from "react-native";
import { useContext, useState } from "react";
import { AuthContext } from "../App";

export default function MyProfileScreen({ navigation }: any) {
  const { logout } = useContext(AuthContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const [clubModalOpen, setClubModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [expandedMemberId, setExpandedMemberId] = useState<number | null>(null);

  // Sample club members data
  const [clubMembers, setClubMembers] = useState([
    { id: 1, name: "John Doe", username: "johndoe", avatar: "https://cdn-icons-png.flaticon.com/512/149/149071.png" },
    { id: 2, name: "Jane Smith", username: "janesmith", avatar: "https://cdn-icons-png.flaticon.com/512/149/149071.png" },
    { id: 3, name: "Mike Johnson", username: "mikej", avatar: "https://cdn-icons-png.flaticon.com/512/149/149071.png" },
    { id: 4, name: "Sarah Wilson", username: "sarahw", avatar: "https://cdn-icons-png.flaticon.com/512/149/149071.png" },
  ]);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
  };

  const handleGoHome = () => {
    setMenuOpen(false);
    navigation.navigate("Landing");
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleKickOut = (memberId: number) => {
    setClubMembers(clubMembers.filter(member => member.id !== memberId));
    setSelectedMember(null);
    setExpandedMemberId(null);
  };

  const handleViewProfile = (member: any) => {
    setSelectedMember(member);
  };

  const handleCloseProfile = () => {
    setSelectedMember(null);
  };

  return (
    <View style={styles.container}>
      
      {/* Back Button - Left Side */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleGoBack}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>

      {/* ☰ Hamburger Icon */}
      <TouchableOpacity
        style={styles.hamburger}
        onPress={() => setMenuOpen(true)}
      >
        <Text style={styles.hamburgerText}>☰</Text>
      </TouchableOpacity>

      {/* Dropdown Menu Modal */}
      <Modal
        visible={menuOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMenuOpen(false)}
        >
          <View style={styles.dropdown}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleGoHome}
            >
              <Text style={styles.menuText}>Home</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItem, styles.logoutItem]}
              onPress={handleLogout}
            >
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Profile Banner */}
      <View style={styles.banner} />

      {/* Profile Avatar */}
      <View style={styles.avatarContainer}>
        <Image
          source={{
            uri: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
          }}
          style={styles.avatar}
        />
      </View>

      {/* Name */}
      <Text style={styles.name}>First Name Last Name</Text>
      <Text style={styles.username}>username</Text>

      {/* Achievements */}
      <View style={styles.achievementCard}>
        <Text style={styles.achievementTitle}>Achievements</Text>

        <View style={styles.achievementRow}>
          <Achievement text="Explorer" />
          <Achievement text="Adventurer" />
          <Achievement text="Collector" />
          <Achievement text="Champion" />
        </View>
      </View>

      {/* Menu Buttons */}
      <View style={styles.menuSection}>
        <MenuButton text="Vanguardian Profile" />
        <MenuButton 
          text="Club" 
          onPress={() => setClubModalOpen(true)}
        />
      </View>

      {/* Club Members Modal */}
      <Modal
        visible={clubModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setClubModalOpen(false)}
      >
        <View style={styles.clubModalContainer}>
          {!selectedMember ? (
            <>
              <View style={styles.clubHeader}>
                <TouchableOpacity onPress={() => setClubModalOpen(false)}>
                  <Text style={styles.clubCloseButton}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.clubTitle}>Club Members</Text>
                <View style={{ width: 30 }} />
              </View>

              <FlatList
                data={clubMembers}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <View style={styles.memberCardContainer}>
                    <View style={styles.memberCard}>
                      <Image
                        source={{ uri: item.avatar }}
                        style={styles.memberAvatar}
                      />
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>{item.name}</Text>
                        <Text style={styles.memberUsername}>@{item.username}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => setExpandedMemberId(expandedMemberId === item.id ? null : item.id)}
                      >
                        <Text style={styles.editIcon}>✎</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Expanded Action Menu */}
                    {expandedMemberId === item.id && (
                      <View style={styles.actionMenu}>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => {
                            handleViewProfile(item);
                            setExpandedMemberId(null);
                          }}
                        >
                          <Text style={styles.actionIcon}>👁</Text>
                          <Text style={styles.actionText}>View Profile</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionButton, styles.kickoutActionButton]}
                          onPress={() => {
                            handleKickOut(item.id);
                            setExpandedMemberId(null);
                          }}
                        >
                          <Text style={styles.actionIcon}>🚫</Text>
                          <Text style={styles.kickoutActionText}>Kick Member</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
                scrollEnabled={true}
                contentContainerStyle={styles.memberListContent}
              />
            </>
          ) : (
            <>
              {/* Member Profile View */}
              <View style={styles.memberProfileHeader}>
                <TouchableOpacity onPress={handleCloseProfile}>
                  <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={styles.memberProfileTitle}>Member Profile</Text>
                <View style={{ width: 30 }} />
              </View>

              <ScrollView style={styles.memberProfileContent}>
                <View style={styles.memberProfileBanner} />

                <View style={styles.memberProfileAvatarContainer}>
                  <Image
                    source={{ uri: selectedMember.avatar }}
                    style={styles.memberProfileAvatar}
                  />
                </View>

                <Text style={styles.memberProfileName}>{selectedMember.name}</Text>
                <Text style={styles.memberProfileUsername}>@{selectedMember.username}</Text>

                <View style={styles.memberStatsContainer}>
                  <View style={styles.statBox}>
                    <Text style={styles.statNumber}>42</Text>
                    <Text style={styles.statLabel}>Score</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statNumber}>15</Text>
                    <Text style={styles.statLabel}>Quests</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statNumber}>8</Text>
                    <Text style={styles.statLabel}>Badges</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.kickOutButton}
                  onPress={() => {
                    handleKickOut(selectedMember.id);
                    setClubModalOpen(false);
                  }}
                >
                  <Text style={styles.kickOutButtonText}>Kick Out Member</Text>
                </TouchableOpacity>
              </ScrollView>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

function Achievement({ text }: { text: string }) {
  return (
    <View style={styles.achievement}>
      <Text style={styles.achievementText}>{text}</Text>
    </View>
  );
}

function MenuButton({ text, onPress }: { text: string; onPress?: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.menuButton,
        pressed && styles.menuButtonPressed,
      ]}
      onPress={onPress}
    >
      <Text style={styles.menuButtonText}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0E1A14",
  },

  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 10,
  },

  backButtonText: {
    fontSize: 28,
    color: "#E8F5E9",
    fontWeight: "bold",
  },

  hamburger: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },

  hamburgerText: {
    fontSize: 28,
    color: "#E8F5E9",
    fontWeight: "bold",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
  },

  dropdown: {
    backgroundColor: "#0E1A14",
    borderRadius: 12,
    width: "60%",
    marginTop: 100,
    marginRight: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#74B08A",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },

  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1E5F3A",
  },

  logoutItem: {
    borderBottomWidth: 0,
  },

  menuText: {
    fontSize: 16,
    color: "#EAF4EE",
    fontWeight: "600",
  },

  logoutText: {
    fontSize: 16,
    color: "#FF6B6B",
    fontWeight: "600",
  },

  banner: {
    height: 150,
    backgroundColor: "#1E5F3A",
    borderBottomWidth: 2,
    borderBottomColor: "#74B08A",
  },

  avatarContainer: {
    alignItems: "center",
    marginTop: -50,
    marginBottom: 20,
  },

  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#74B08A",
  },

  name: {
    fontSize: 24,
    fontWeight: "700",
    color: "#E8F5E9",
    textAlign: "center",
  },

  username: {
    fontSize: 14,
    color: "#8DBFA1",
    textAlign: "center",
    marginBottom: 30,
  },

  achievementCard: {
    marginHorizontal: 20,
    padding: 20,
    backgroundColor: "#1E5F3A",
    borderRadius: 12,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "#74B08A",
  },

  achievementTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#E8F5E9",
    marginBottom: 15,
  },

  achievementRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },

  achievement: {
    width: "48%",
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: "#123524",
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#74B08A",
    alignItems: "center",
  },

  achievementText: {
    fontSize: 12,
    color: "#EAF4EE",
    fontWeight: "600",
  },

  menuSection: {
    marginHorizontal: 20,
    marginBottom: 30,
  },

  menuButton: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: "#1E5F3A",
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#74B08A",
  },

  menuButtonPressed: {
    backgroundColor: "#123524",
    transform: [{ scale: 0.96 }],
  },

  menuButtonText: {
    fontSize: 16,
    color: "#EAF4EE",
    fontWeight: "600",
    textAlign: "center",
  },

  // Club Modal Styles
  clubModalContainer: {
    flex: 1,
    backgroundColor: "#0E1A14",
    paddingTop: 40,
  },

  clubHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#1E5F3A",
  },

  clubTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#E8F5E9",
  },

  clubCloseButton: {
    fontSize: 24,
    color: "#E8F5E8",
    fontWeight: "bold",
  },

  memberListContent: {
    paddingHorizontal: 15,
    paddingVertical: 15,
  },

  memberCardContainer: {
    marginBottom: 12,
  },

  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E5F3A",
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: "#74B08A",
  },

  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    borderWidth: 2,
    borderColor: "#74B08A",
  },

  memberInfo: {
    flex: 1,
  },

  memberName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#E8F5E9",
  },

  memberUsername: {
    fontSize: 12,
    color: "#8DBFA1",
  },

  editButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#123524",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#74B08A",
  },

  editIcon: {
    fontSize: 16,
    color: "#74B08A",
    fontWeight: "600",
  },

  // Action Menu Styles
  actionMenu: {
    backgroundColor: "#123524",
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#74B08A",
    overflow: "hidden",
  },

  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#1E5F3A",
  },

  kickoutActionButton: {
    borderBottomWidth: 0,
  },

  actionIcon: {
    fontSize: 18,
    marginRight: 10,
  },

  actionText: {
    fontSize: 14,
    color: "#EAF4EE",
    fontWeight: "600",
  },

  kickoutActionText: {
    fontSize: 14,
    color: "#FF6B6B",
    fontWeight: "600",
  },

  // Member Profile Styles
  memberProfileHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#1E5F3A",
  },

  memberProfileTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#E8F5E9",
  },

  backArrow: {
    fontSize: 24,
    color: "#E8F5E9",
    fontWeight: "bold",
  },

  memberProfileContent: {
    flex: 1,
    paddingHorizontal: 20,
  },

  memberProfileBanner: {
    height: 120,
    backgroundColor: "#1E5F3A",
    borderRadius: 12,
    marginTop: 20,
    marginBottom: -40,
    borderWidth: 1,
    borderColor: "#74B08A",
  },

  memberProfileAvatarContainer: {
    alignItems: "center",
    marginBottom: 15,
  },

  memberProfileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "#74B08A",
  },

  memberProfileName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#E8F5E9",
    textAlign: "center",
  },

  memberProfileUsername: {
    fontSize: 14,
    color: "#8DBFA1",
    textAlign: "center",
    marginBottom: 25,
  },

  memberStatsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },

  statBox: {
    flex: 1,
    backgroundColor: "#1E5F3A",
    paddingVertical: 15,
    marginHorizontal: 5,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#74B08A",
  },

  statNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: "#74B08A",
  },

  statLabel: {
    fontSize: 12,
    color: "#8DBFA1",
    marginTop: 5,
  },

  kickOutButton: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: "#FF6B6B",
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "#C41E3A",
  },

  kickOutButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
});