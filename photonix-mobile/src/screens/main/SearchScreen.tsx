import React from 'react';
import {View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Platform, StatusBar} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const safeAreaEdges = ['top'] as const;
  const containerStyle = Platform.OS === 'android' 
    ? [styles.container, {paddingBottom: Math.max(insets.bottom, 16)}]
    : styles.container;

  return (
    <>
      {Platform.OS === 'android' && (
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#ffffff"
          translucent={false}
        />
      )}
      <SafeAreaView style={containerStyle} edges={safeAreaEdges}>
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search photos, people, places..."
          placeholderTextColor="#999999"
        />
        <TouchableOpacity>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Suggestions Section */}
      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Suggestions</Text>
        
        {/* People Chips */}
        <View style={styles.chipsContainer}>
          <Text style={styles.chipLabel}>People</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {['Jane Doe', 'John S.', 'Emily R.'].map((name, index) => (
              <TouchableOpacity key={index} style={styles.chip}>
                <Text style={styles.chipText}>{name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Places Chips */}
        <View style={styles.chipsContainer}>
          <Text style={styles.chipLabel}>Places</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {['San Francisco', 'New York', 'Paris'].map((place, index) => (
              <TouchableOpacity key={index} style={styles.chip}>
                <Text style={styles.chipText}>{place}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#000000',
  },
  cancelText: {
    fontSize: 16,
    color: '#666666',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 24,
    marginBottom: 16,
  },
  chipsContainer: {
    marginBottom: 24,
  },
  chipLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    marginRight: 8,
  },
  chipText: {
    fontSize: 14,
    color: '#000000',
  },
});

