import { Stack } from 'expo-router';
import { I18nManager, StyleSheet, Text, View } from 'react-native';
import * as Sentry from '@sentry/react-native';

// واجهة عربية RTL من البداية
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({ dsn, tracesSampleRate: 0.2 });
}

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#111',
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: '#f6f6f8' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'الجمعية' }} />
      <Stack.Screen name="(auth)/login" options={{ title: 'تسجيل الدخول', headerBackTitle: 'رجوع' }} />
      <Stack.Screen name="(auth)/verify" options={{ title: 'رمز التحقق', headerBackTitle: 'رجوع' }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export function LoadingScreen({ message = 'جارٍ التحميل…' }: { message?: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 16, color: '#555' },
});
