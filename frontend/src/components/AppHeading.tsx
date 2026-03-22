import { StyleSheet, Text } from 'react-native';

import { colors, typography } from '../theme';

type AppHeadingProps = {
  title?: string;
};

export function AppHeading({ title = 'Speakeasy' }: AppHeadingProps) {
  return <Text style={styles.title}>{title}</Text>;
}

const styles = StyleSheet.create({
  title: {
    ...typography.title,
    fontSize: 30,
    letterSpacing: 0.3,
    color: colors.text,
    marginBottom: 14,
  },
});
