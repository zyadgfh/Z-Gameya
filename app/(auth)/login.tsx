import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { sendOtp } from '../../src/lib/auth';

export default function Login() {
  const router = useRouter();
  const [phone, setPhone] = useState('+20');
  const [loading, setLoading] = useState(false);

  async function onSend() {
    if (!/^\+[1-9]\d{7,14}$/.test(phone.trim())) {
      Alert.alert('رقم غير صحيح', 'أدخل رقم الموبايل بصيغة دولية مثل +201012345678');
      return;
    }
    setLoading(true);
    try {
      await sendOtp(phone.trim());
      router.push({ pathname: '/(auth)/verify', params: { phone: phone.trim() } });
    } catch (e: any) {
      Alert.alert('تعذر الإرسال', e?.message ?? 'حاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>أهلاً بك في الجمعية</Text>
      <Text style={styles.subtitle}>سجّل دخولك برقم الموبايل لمتابعة جمعياتك</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="+2010xxxxxxxx"
        textAlign="right"
      />
      <Pressable style={[styles.button, loading && styles.disabled]} onPress={onSend} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'جارٍ الإرسال…' : 'إرسال رمز التحقق'}</Text>
      </Pressable>
      <Text style={styles.note}>التطبيق للتتبع والتنظيم فقط — لا يمر مال عبره إطلاقاً.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 14 },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'right' },
  subtitle: { fontSize: 15, color: '#555', textAlign: 'right' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 14, fontSize: 16, backgroundColor: '#fff' },
  button: { backgroundColor: '#0a84ff', borderRadius: 12, padding: 16, alignItems: 'center' },
  disabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  note: { fontSize: 12, color: '#888', textAlign: 'right', marginTop: 8 },
});
