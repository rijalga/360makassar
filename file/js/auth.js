import { supabase, getSession } from './supabase.js';

// ===== DOM ELEMENTS =====
const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');
const registerLink = document.getElementById('registerLink');
const registerModal = document.getElementById('registerModal');
const closeModal = document.getElementById('closeModal');
const registerForm = document.getElementById('registerForm');
const registerMessage = document.getElementById('registerMessage');

// ===== LOGIN =====
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginMessage.textContent = '';
    loginMessage.className = 'auth-message';

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;

        loginMessage.textContent = 'Login berhasil! Mengalihkan...';
        loginMessage.className = 'auth-message success';
        setTimeout(() => {
            window.location.href = './dashboard.html';
        }, 1000);
    } catch (error) {
        loginMessage.textContent = error.message || 'Login gagal. Periksa email dan password.';
        loginMessage.className = 'auth-message error';
    }
});

// ===== SHOW REGISTER MODAL =====
registerLink.addEventListener('click', (e) => {
    e.preventDefault();
    registerModal.classList.remove('hidden');
});

closeModal.addEventListener('click', () => {
    registerModal.classList.add('hidden');
});

registerModal.addEventListener('click', (e) => {
    if (e.target === registerModal) {
        registerModal.classList.add('hidden');
    }
});

// ===== REGISTER =====
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    registerMessage.textContent = '';
    registerMessage.className = 'auth-message';

    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;

    if (password.length < 6) {
        registerMessage.textContent = 'Password minimal 6 karakter.';
        registerMessage.className = 'auth-message error';
        return;
    }

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    display_name: 'Mks.Spinbooth - Spinbooth360 & Photobooth',
                },
            },
        });

        if (error) throw error;

        registerMessage.textContent = '✅ Registrasi berhasil! Silakan cek email untuk verifikasi.';
        registerMessage.className = 'auth-message success';

        setTimeout(() => {
            registerForm.reset();
            registerModal.classList.add('hidden');
            document.getElementById('email').value = email;
            document.getElementById('password').focus();
        }, 3000);
    } catch (error) {
        registerMessage.textContent = '❌ ' + (error.message || 'Registrasi gagal. Coba lagi.');
        registerMessage.className = 'auth-message error';
    }
});

// ===== CEK SESSION (TAPI JANGAN AUTO-REDIRECT) =====
// Kode ini DICOMMENT agar tidak auto-redirect ke dashboard
/*
(async () => {
    const session = await getSession();
    if (session) {
        window.location.href = './dashboard.html';
    }
})();
*/

console.log('✅ auth.js loaded - Silakan login atau register');
