import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { verifyOtp, ensureProfile } from '../../src/lib/auth';

export default function Verify() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function onVerify() {
    if (code.trim().length < 4) {
      Alert.alert('رمز ناقص', 'أدخل رمز التحقق المرسل إليك');
      return;
    }
    setLoading(true);
    try {
      const data = await verifyOtp(phone ?? '', code.trim());
      if (data.user) await ensureProfile(data.user.id, phone ?? '');
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('رمز غير صحيح', e?.message ?? 'حاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>رمز التحقق</Text>
      <Text style={styles.subtitle}>أرسلنا رمزاً إلى {phone}</Text>
      <TextInput
        style={styles.input}
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        placeholder="123456"
        textAlign="center"
        maxLength={8}
      />
      <Pressable style={[styles.button, loading && styles.disabled]} onPress={onVerify} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'جارٍ التحقق…' : 'تأكيد'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 14 },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'right' },
  subtitle: { fontSize: 15, color: '#555', textAlign: 'right' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 14, fontSize: 20, backgroundColor: '#fff', letterSpacing: 4 },
  button: { backgroundColor: '#0a84ff', borderRadius: 12, padding: 16, alignItems: 'center' },
  disabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
