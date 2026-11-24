import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { supabase } from '../../src/lib/supabase';

interface N { id: string; title: string; body: string | null; read_at: string | null; created_at: string }

export default function Notifications() {
  const [rows, setRows] = useState<N[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50);
    setRows((data ?? []) as N[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function markRead(id: string) {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    load();
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={rows}
        keyExtractor={(i) => i.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={<Text style={styles.empty}>لا إشعارات</Text>}
        renderItem={({ item }) => (
          <Pressable onPress={() => markRead(item.id)} style={[styles.card, !item.read_at && styles.unread]}>
            <Text style={styles.title}>{item.title}</Text>
            {item.body ? <Text style={styles.body}>{item.body}</Text> : null}
            <Text style={styles.time}>{new Date(item.created_at).toLocaleString('ar-EG')}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10 },
  unread: { borderRightWidth: 4, borderRightColor: '#0a84ff' },
  title: { fontSize: 15, fontWeight: '700', textAlign: 'right' },
  body: { fontSize: 14, color: '#555', textAlign: 'right', marginTop: 4 },
  time: { fontSize: 12, color: '#999', textAlign: 'right', marginTop: 6 },
  empty: { textAlign: 'center', color: '#888', marginTop: 40 },
});
