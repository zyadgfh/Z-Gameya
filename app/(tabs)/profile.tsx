import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { signOut } from '../../src/lib/auth';

export default function Profile() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setPhone(data.user?.phone ?? '');
      if (data.user) {
        const { data: p } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
        setRole((p as any)?.role ?? '');
      }
    });
  }, []);

  async function onSignOut() {
    await signOut();
    router.replace('/(auth)/login');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>حسابي</Text>
      <Text style={styles.meta}>الموبايل: {phone}</Text>
      <Text style={styles.meta}>الدور: {role}</Text>
      <Pressable style={styles.button} onPress={onSignOut}>
        <Text style={styles.buttonText}>تسجيل الخروج</Text>
      </Pressable>
      <Text style={styles.note}>الجمعية — تطبيق تتبع وتنظيم. لا يحتفظ بأموال ولا يحوّلها.</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 10 },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'right' },
  meta: { fontSize: 15, textAlign: 'right' },
  button: { backgroundColor: '#ff3b30', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  note: { fontSize: 12, color: '#888', textAlign: 'right', marginTop: 12 },
});
