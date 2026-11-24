import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { calcPayout, formatEGP } from '../../src/lib/finance';

interface GameyaRow {
  id: string;
  name: string;
  installment: number;
  member_count: number;
  cycle_type: string;
  status: string;
  start_date: string;
}

export default function MyGameyas() {
  const [rows, setRows] = useState<GameyaRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('gameyas')
      .select('id,name,installment,member_count,cycle_type,status,start_date')
      .or(`organizer_id.eq.${user.id},id.in.(select gameya_id from gameya_members where user_id = '${user.id}')`)
      .order('created_at', { ascending: false });
    setRows((data ?? []) as GameyaRow[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <View style={styles.container}>
      <FlatList
        data={rows}
        keyExtractor={(i) => i.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={<Text style={styles.empty}>لا توجد جمعيات بعد — أنشئ أول جمعية من تبويب «إنشاء جمعية»</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>القسط: {formatEGP(Number(item.installment))} × {item.member_count} عضو</Text>
            <Text style={styles.meta}>مبلغ القبض: {formatEGP(calcPayout(Number(item.installment), item.member_count))}</Text>
            <Text style={styles.meta}>الحالة: {item.status} • البداية: {item.start_date}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  name: { fontSize: 18, fontWeight: '800', textAlign: 'right', marginBottom: 6 },
  meta: { fontSize: 14, color: '#555', textAlign: 'right', marginBottom: 2 },
  empty: { textAlign: 'center', color: '#888', marginTop: 40, fontSize: 15 },
});
