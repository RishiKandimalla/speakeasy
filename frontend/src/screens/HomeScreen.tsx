import { StyleSheet, Text, View } from 'react-native';

import { AppHeading } from '../components/AppHeading';

export function HomeScreen() {
  return (
    <View style={styles.container}>
      <AppHeading />
      <Text style={styles.subtitle}>React Native + Expo + TypeScript</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
  },
});
