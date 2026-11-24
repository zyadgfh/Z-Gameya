import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView } from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { calcPayout, formatEGP, type CycleType } from '../../src/lib/finance';

export default function CreateGameya() {
  const [name, setName] = useState('');
  const [installment, setInstallment] = useState('500');
  const [memberCount, setMemberCount] = useState('12');
  const [cycleType, setCycleType] = useState<CycleType>('monthly');
  const [customDays, setCustomDays] = useState('15');
  const [saving, setSaving] = useState(false);

  const payout = (() => {
    const i = Number(installment), m = Number(memberCount);
    if (!i || !m || m < 2) return null;
    try { return calcPayout(i, m); } catch { return null; }
  })();

  async function onCreate() {
    if (!name.trim()) return Alert.alert('اسم الجمعية مطلوب');
    const i = Number(installment), m = Number(memberCount);
    if (!i || i <= 0) return Alert.alert('القسط غير صحيح');
    if (!Number.isInteger(m) || m < 2) return Alert.alert('عدد الأعضاء 2 على الأقل');
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('سجل الدخول أولاً');
      const { data, error } = await supabase.from('gameyas').insert({
        name: name.trim(),
        organizer_id: user.id,
        installment: i,
        member_count: m,
        cycle_type: cycleType,
        custom_days: cycleType === 'custom' ? Number(customDays) : null,
        start_date: new Date().toISOString().slice(0, 10),
        status: 'draft',
      }).select().single();
      if (error) throw error;
      // إضافة المنظم كعضو في الدور الأول
      await supabase.from('gameya_members').insert({
        gameya_id: data.id, user_id: user.id, phone: user.phone ?? '', display_name: 'المنظم', cycle_index: 1, is_organizer: true,
      });
      Alert.alert('تم الإنشاء', `جمعية «${name}» جاهزة. كود الدعوة: ${data.invite_code}`);
      setName('');
    } catch (e: any) {
      Alert.alert('خطأ', e?.message ?? 'حاول مرة أخرى');
    } finally { setSaving(false); }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>إنشاء جمعية جديدة</Text>
      <Text style={styles.label}>اسم الجمعية</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="مثال: جمعية الأصدقاء" textAlign="right" />
      <Text style={styles.label}>القسط الثابت (جنيه)</Text>
      <TextInput style={styles.input} value={installment} onChangeText={setInstallment} keyboardType="numeric" textAlign="right" />
      <Text style={styles.label}>عدد الأعضاء (= عدد الدورات)</Text>
      <TextInput style={styles.input} value={memberCount} onChangeText={setMemberCount} keyboardType="numeric" textAlign="right" />
      <Text style={styles.label}>مدة الدورة</Text>
      <View style={styles.row}>
        {([['weekly', 'أسبوعية'], ['monthly', 'شهرية'], ['custom', 'مخصصة']] as [CycleType, string][]).map(([v, label]) => (
          <Pressable key={v} onPress={() => setCycleType(v)} style={[styles.chip, cycleType === v && styles.chipActive]}>
            <Text style={[styles.chipText, cycleType === v && styles.chipTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      {cycleType === 'custom' && (
        <>
          <Text style={styles.label}>كل كم يوم؟</Text>
          <TextInput style={styles.input} value={customDays} onChangeText={setCustomDays} keyboardType="numeric" textAlign="right" />
        </>
      )}
      {payout !== null && <Text style={styles.payout}>مبلغ القبض المتوقع: {formatEGP(payout)}</Text>}
      <Pressable style={[styles.button, saving && styles.disabled]} onPress={onCreate} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? 'جارٍ الإنشاء…' : 'إنشاء الجمعية'}</Text>
      </Pressable>
      <Text style={styles.note}>الدفع خارج التطبيق (كاش / فودافون كاش / إنستا باي) — التطبيق للتتبع فقط.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 10 },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'right', marginBottom: 6 },
  label: { fontSize: 14, fontWeight: '600', textAlign: 'right', marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 14, fontSize: 16, backgroundColor: '#fff' },
  row: { flexDirection: 'row', gap: 8 },
  chip: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, alignItems: 'center', backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#0a84ff', borderColor: '#0a84ff' },
  chipText: { fontSize: 14, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  payout: { fontSize: 16, fontWeight: '700', color: '#0a84ff', textAlign: 'right', marginTop: 10 },
  button: { backgroundColor: '#0a84ff', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 14 },
  disabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  note: { fontSize: 12, color: '#888', textAlign: 'right', marginTop: 10 },
});
