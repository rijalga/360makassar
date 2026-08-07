import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ===== GANTI DENGAN CREDENTIAL SUPABASE ANDA =====
const SUPABASE_URL = 'https://pcmwwwikoufmpumhldnh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_liKr_1BNKGm2TGfCwZu06w_9ThihiXN';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== FUNGSI CEK SESSION =====
export async function getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
        console.error('Error getting session:', error.message);
        return null;
    }
    return data.session;
}

// ===== FUNGSI CEK AUTH =====
export async function requireAuth() {
    const session = await getSession();
    if (!session) {
        window.location.href = '/login.html';
        return null;
    }
    return session;
}

// ===== FUNGSI LOGOUT =====
export async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Error logging out:', error.message);
        return false;
    }
    return true;
}