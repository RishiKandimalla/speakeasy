import { StyleSheet, Text } from 'react-native';

type AppHeadingProps = {
  title?: string;
};

export function AppHeading({ title = 'Speakeasy' }: AppHeadingProps) {
  return <Text style={styles.title}>{title}</Text>;
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
});
