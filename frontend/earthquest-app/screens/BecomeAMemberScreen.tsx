import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const BecomeAMemberScreen = ({ navigation }: any) => {

  const features = [
    { label: "Access to EQ using adventure code", reg: true, mem: true },
    { label: "Player's handbook and Game sheets", reg: true, mem: true },
    { label: "Account Creation", reg: false, mem: true },
    { label: "Vanguardian Profile", reg: false, mem: true },
    { label: "Customizable Avatar", reg: false, mem: true },
    { label: "Access to Player's Forum", reg: false, mem: true },
    { label: "Become a GM", reg: false, mem: true },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* ⬅️ Top Left Back Button */}
      <TouchableOpacity 
        style={styles.backArrow} 
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={28} color="#E8F5E9" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Become an EarthQuest Member</Text>

        {/* 📊 Table Header */}
        <View style={styles.tableHeader}>
          <Text style={styles.featureHeaderColumn}>WHAT'S INCLUDED</Text>
          <Text style={styles.statusHeaderColumn}>REGISTERED</Text>
          <Text style={styles.statusHeaderColumn}>MEMBER</Text>
        </View>

        {/* 📋 Table Rows */}
        {features.map((item, index) => (
          <View key={index} style={styles.row}>
            <Text style={styles.featureText}>{item.label}</Text>
            
            <View style={styles.checkCell}>
              {item.reg ? 
                <Ionicons name="checkmark" size={20} color="#74B08A" /> : 
                <Text style={styles.dash}>—</Text>
              }
            </View>

            <View style={styles.checkCell}>
              {item.mem ? 
                <Ionicons name="checkmark-circle" size={22} color="#EAF4EE" /> : 
                <Text style={styles.dash}>—</Text>
              }
            </View>
          </View>
        ))}

        {/* 🚀 Subscription Card */}
        <View style={styles.upgradeSection}>
          <Text style={styles.upgradeTitle}>Upgrade on Our Website</Text>
          
          <TouchableOpacity 
            style={styles.priceCard}
            onPress={() => Linking.openURL('https://earthquest.com/membership')}
          >
            <View style={styles.cardLeft}>
               <View style={styles.iconCircle}>
                  <Ionicons name="star" size={24} color="#EAF4EE" />
               </View>
               <View>
                  <Text style={styles.membershipLabel}>Membership</Text>
                  <Text style={styles.priceText}>$10 <Text style={styles.perYear}>Annually</Text></Text>
               </View>
            </View>
            <Ionicons name="open-outline" size={24} color="#74B08A" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.footerLink} onPress={() => navigation.goBack()}>
          <Text style={styles.footerLinkText}>Return to Main Menu</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0E1A14", 
  },
  backArrow: {
    position: 'absolute',
    top: 50, // Adjusted to match your Hamburger menu height
    left: 20,
    zIndex: 10,
    padding: 10,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 110, // Extra padding so header doesn't hit the back arrow
    paddingBottom: 50,
  },
  header: {
    fontSize: 32,
    fontWeight: "900",
    color: "#E8F5E9",
    textAlign: 'center',
    marginBottom: 40,
    letterSpacing: 0.5,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1E5F3A',
    paddingBottom: 12,
    marginBottom: 8,
  },
  featureHeaderColumn: {
    flex: 2.5,
    color: '#8DBFA1',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statusHeaderColumn: {
    flex: 1,
    color: '#8DBFA1',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1E5F3A',
  },
  featureText: {
    flex: 2.5,
    color: '#EAF4EE',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    paddingRight: 8,
  },
  checkCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dash: {
    color: '#1E5F3A',
    fontSize: 20,
    fontWeight: 'bold',
  },
  upgradeSection: {
    marginTop: 60,
    alignItems: 'center',
  },
  upgradeTitle: {
    color: '#EAF4EE',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
  priceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E5F3A',
    width: '100%',
    padding: 22,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#74B08A',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  membershipLabel: {
    color: '#8DBFA1',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  priceText: {
    color: '#EAF4EE',
    fontSize: 24,
    fontWeight: '900',
  },
  perYear: {
    fontSize: 13,
    fontWeight: '400',
    color: '#8DBFA1',
  },
  footerLink: {
    marginTop: 40,
    alignSelf: 'center',
    padding: 10,
  },
  footerLinkText: {
    color: '#74B08A',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
    opacity: 0.8,
  }
});

export default BecomeAMemberScreen;