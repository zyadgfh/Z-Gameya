import { supabase } from './supabase';

/** إرسال كود OTP لرقم الموبايل (بصيغة E.164 مثل +2010xxxxxxxx) */
export async function sendOtp(phone: string) {
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) throw error;
}

/** التحقق من كود OTP */
export async function verifyOtp(phone: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
  if (error) throw error;
  return data;
}

/** إنشاء/تحديث الملف الشخصي بعد أول دخول */
export async function ensureProfile(userId: string, phone: string, displayName?: string) {
  const { data: existing } = await supabase.from('profiles').select('id').eq('id', userId).single();
  if (existing) return existing;
  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: userId, phone, display_name: displayName ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}
