import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

import { HomeScreen } from './src/screens/HomeScreen';

export default function App() {
  return (
    <View style={styles.root}>
      <HomeScreen />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
