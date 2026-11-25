import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { LoadingScreen } from './_layout';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/(tabs)');
      else router.replace('/(auth)/login');
    });
  }, []);

  return <LoadingScreen message="الجمعية — جارٍ التحميل…" />;
}
