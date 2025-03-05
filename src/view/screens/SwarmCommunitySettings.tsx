import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSession } from '#/state/session';
import { SWARM_COMMUNITY_MEMBERS } from '#/lib/swarm-community';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommonNavigatorParams } from '#/lib/routes/types';

type Props = NativeStackScreenProps<CommonNavigatorParams, 'SwarmCommunitySettings'>;

export function SwarmCommunitySettingsScreen({ navigation }: Props) {
  const { currentSession } = useSession();
  const [isMember, setIsMember] = useState(false);
  const userDid = currentSession?.did || '';

  useEffect(() => {
    // Check if the current user is already a member
    setIsMember(SWARM_COMMUNITY_MEMBERS.includes(userDid));
  }, [userDid]);

  const handleJoinCommunity = () => {
    // In a real implementation, this would make an API call to add the user
    // For now, we'll just show a message
    alert('In a production app, this would add you to the Swarm community.');
    
    // For development purposes, you can manually add your DID to the 
    // SWARM_COMMUNITY_MEMBERS array in src/lib/swarm-community.ts
    console.log('Your DID:', userDid);
    
    // Simulate joining
    setIsMember(true);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Swarm Community Settings</Text>
      
      <View style={styles.infoBox}>
        <Text style={styles.label}>Your DID:</Text>
        <Text style={styles.didText}>{userDid}</Text>
        <Text style={styles.instructions}>
          To join the Swarm community during development, add your DID to the 
          SWARM_COMMUNITY_MEMBERS array in src/lib/swarm-community.ts
        </Text>
      </View>

      {!isMember && (
        <TouchableOpacity 
          style={styles.joinButton} 
          onPress={handleJoinCommunity}
        >
          <Text style={styles.joinButtonText}>Join Swarm Community</Text>
        </TouchableOpacity>
      )}

      {isMember && (
        <View style={styles.memberInfo}>
          <Text style={styles.memberText}>
            You are a member of the Swarm community!
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  infoBox: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  didText: {
    fontSize: 14,
    fontFamily: 'monospace',
    padding: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 16,
  },
  instructions: {
    fontSize: 14,
    lineHeight: 20,
  },
  joinButton: {
    backgroundColor: '#0070f3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  memberInfo: {
    backgroundColor: '#e6f7ff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#91d5ff',
  },
  memberText: {
    fontSize: 16,
    color: '#0050b3',
  },
}); 