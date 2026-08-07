import { supabase } from './supabase.js';

// ===== DOM REFS =====
const avatarEl = document.getElementById('avatar');
const displayNameEl = document.getElementById('displayName');
const bioEl = document.getElementById('bio');
const linksContainer = document.getElementById('linksContainer');

// ===== THEME TOGGLE =====
const themeToggle = document.getElementById('themeToggle');
const htmlEl = document.documentElement;

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'dark';
htmlEl.setAttribute('data-theme', savedTheme);

themeToggle.addEventListener('click', () => {
    const currentTheme = htmlEl.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    htmlEl.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});

// ===== LOAD DATA =====
async function loadPublicData() {
    try {
        // 1. Ambil profil (asumsi hanya 1 row untuk single-user)
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .limit(1)
            .single();

        if (profileError && profileError.code !== 'PGRST116') {
            console.error('Error loading profile:', profileError);
        }

        if (profile) {
            displayNameEl.textContent = profile.display_name || 'Mks.Spinbooth';
            bioEl.textContent = profile.bio || 'Jasa dokumentasi profesional untuk acara spesial Anda.';
            if (profile.avatar_url) {
                avatarEl.src = profile.avatar_url;
            }
        }

        // 2. Ambil daftar link (aktif, urut berdasarkan position)
        const { data: links, error: linksError } = await supabase
            .from('links')
            .select('*')
            .eq('is_active', true)
            .order('position', { ascending: true });

        if (linksError) {
            console.error('Error loading links:', linksError);
            return;
        }

        renderLinks(links || []);

    } catch (error) {
        console.error('Error:', error);
    }
}

// ===== RENDER LINKS (DENGAN THUMBNAIL) =====
function renderLinks(links) {
    if (!links || links.length === 0) {
        linksContainer.innerHTML = `
            <div class="link-card" style="justify-content:center; opacity:0.5; cursor:default;">
                <span>Belum ada link</span>
            </div>
        `;
        return;
    }

    linksContainer.innerHTML = links.map(link => {
        // Cek apakah link punya gambar thumbnail
        const hasImage = link.image_url && link.image_url.trim() !== '';
        
        return `
            <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="link-card ${hasImage ? 'link-with-image' : ''}">
                ${hasImage ? `
                    <div class="link-thumbnail">
                        <img src="${link.image_url}" alt="${link.title}" loading="lazy" />
                    </div>
                ` : `
                    <span class="link-icon">${link.icon || '🔗'}</span>
                `}
                <span class="link-title">${link.title}</span>
                <span class="link-arrow">→</span>
            </a>
        `;
    }).join('');
}

// ===== INIT =====
loadPublicData();