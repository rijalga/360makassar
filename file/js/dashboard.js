import { supabase, requireAuth, logout } from './supabase.js';

// ===== AUTH GUARD =====
const session = await requireAuth();
if (!session) {
    throw new Error('Unauthorized');
}

// ===== DOM REFS =====
const linksList = document.getElementById('linksList');
const linkCount = document.getElementById('linkCount');
const addLinkForm = document.getElementById('addLinkForm');
const addMessage = document.getElementById('addMessage');
const profileForm = document.getElementById('profileForm');
const profileName = document.getElementById('profileName');
const profileBio = document.getElementById('profileBio');
const profileAvatar = document.getElementById('profileAvatar');
const profileMessage = document.getElementById('profileMessage');
const logoutBtn = document.getElementById('logoutBtn');
const previewContainer = document.getElementById('previewContainer');

// ===== THEME TOGGLE =====
const themeToggle = document.getElementById('themeToggle');
const htmlEl = document.documentElement;

const savedTheme = localStorage.getItem('theme') || 'dark';
htmlEl.setAttribute('data-theme', savedTheme);

themeToggle.addEventListener('click', () => {
    const currentTheme = htmlEl.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    htmlEl.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});

// ===== SIDEBAR TABS =====
const sidebarBtns = document.querySelectorAll('.sidebar-btn');
const tabContents = {
    links: document.getElementById('tabLinks'),
    profile: document.getElementById('tabProfile'),
};

sidebarBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        sidebarBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const tab = btn.dataset.tab;
        Object.keys(tabContents).forEach(key => {
            tabContents[key].classList.toggle('active', key === tab);
        });
    });
});

// ===== LOAD DATA =====
let currentLinks = [];

async function loadData() {
    await loadProfile();
    await loadLinks();
}

// ===== LOAD PROFILE =====
async function loadProfile() {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error loading profile:', error);
            return;
        }

        if (data) {
            profileName.value = data.display_name || '';
            profileBio.value = data.bio || '';
            profileAvatar.value = data.avatar_url || '';
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// ===== LOAD LINKS =====
async function loadLinks() {
    try {
        const { data, error } = await supabase
            .from('links')
            .select('*')
            .order('position', { ascending: true });

        if (error) {
            console.error('Error loading links:', error);
            return;
        }

        currentLinks = data || [];
        renderLinks(currentLinks);
        updatePreview(currentLinks);
        linkCount.textContent = currentLinks.length;
    } catch (error) {
        console.error('Error:', error);
    }
}

// ===== RENDER LINKS =====
function renderLinks(links) {
    if (!links || links.length === 0) {
        linksList.innerHTML = `
            <div class="link-item" style="justify-content:center; opacity:0.5; cursor:default;">
                <span>Belum ada link. Tambahkan link baru di atas!</span>
            </div>
        `;
        return;
    }

    linksList.innerHTML = links.map(link => `
        <div class="link-item" data-id="${link.id}">
            <span class="drag-handle">⠿</span>
            ${link.image_url ? `
                <img src="${link.image_url}" alt="${link.title}" class="link-thumbnail-small" />
            ` : `
                <span class="item-icon">${link.icon || '🔗'}</span>
            `}
            <span class="item-title">${link.title}</span>
            <span class="item-url">${link.url}</span>
            <div class="item-actions">
                <button class="btn-edit" data-id="${link.id}">Edit</button>
                <button class="btn-delete" data-id="${link.id}">Hapus</button>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => openEditModal(btn.dataset.id));
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => deleteLink(btn.dataset.id));
    });

    if (window.Sortable) {
        new Sortable(linksList, {
            handle: '.drag-handle',
            animation: 200,
            onEnd: async (evt) => {
                const items = Array.from(linksList.children);
                const updates = items.map((item, index) => ({
                    id: item.dataset.id,
                    position: index,
                }));

                for (const update of updates) {
                    await supabase
                        .from('links')
                        .update({ position: update.position })
                        .eq('id', update.id);
                }
                await loadLinks();
            },
        });
    }
}

// ===== ADD LINK (DENGAN UPLOAD GAMBAR) =====
addLinkForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    addMessage.textContent = '';
    addMessage.className = 'form-message';

    const title = document.getElementById('linkTitle').value.trim();
    const url = document.getElementById('linkUrl').value.trim();
    const icon = document.getElementById('linkIcon').value;
    const fileInput = document.getElementById('linkImage');
    const file = fileInput.files[0];

    if (!title || !url) {
        addMessage.textContent = 'Judul dan URL harus diisi.';
        addMessage.className = 'form-message error';
        return;
    }

    try {
        let imageUrl = null;

        // Upload gambar jika ada
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                addMessage.textContent = 'Ukuran gambar maksimal 5MB.';
                addMessage.className = 'form-message error';
                return;
            }

            const fileExt = file.name.split('.').pop();
            const fileName = `link-${Date.now()}.${fileExt}`;
            const filePath = `links/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('gallery')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage
                .from('gallery')
                .getPublicUrl(filePath);

            imageUrl = publicUrlData.publicUrl;
        }

        const position = currentLinks.length;

        const { data, error } = await supabase
            .from('links')
            .insert([{ title, url, icon, position, image_url: imageUrl }])
            .select();

        if (error) throw error;

        addMessage.textContent = '✅ Link berhasil ditambahkan!';
        addMessage.className = 'form-message success';
        addLinkForm.reset();
        await loadLinks();
    } catch (error) {
        console.error('Error:', error);
        addMessage.textContent = '❌ Gagal: ' + error.message;
        addMessage.className = 'form-message error';
    }
});

// ===== DELETE LINK =====
async function deleteLink(id) {
    if (!confirm('Yakin ingin menghapus link ini?')) return;

    try {
        // Ambil data link dulu (untuk hapus gambar di storage)
        const { data: linkData, error: fetchError } = await supabase
            .from('links')
            .select('image_url')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        const { error } = await supabase
            .from('links')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // Hapus gambar dari storage jika ada
        if (linkData?.image_url) {
            const path = linkData.image_url.split('/').pop();
            await supabase.storage
                .from('gallery')
                .remove([`links/${path}`]);
        }

        await loadLinks();
    } catch (error) {
        alert('Gagal menghapus link: ' + error.message);
    }
}

// ===== EDIT LINK (DENGAN UPLOAD GAMBAR) =====
let editLinkId = null;

function openEditModal(id) {
    const link = currentLinks.find(l => l.id === id);
    if (!link) return;

    editLinkId = id;

    const modal = document.createElement('div');
    modal.className = 'modal edit-modal';
    modal.innerHTML = `
        <div class="modal-content auth-card">
            <span class="modal-close">&times;</span>
            <h2>Edit Link</h2>
            <form id="editLinkForm" class="auth-form">
                <div class="form-group">
                    <label>Judul</label>
                    <input type="text" id="editTitle" value="${link.title}" required />
                </div>
                <div class="form-group">
                    <label>URL</label>
                    <input type="url" id="editUrl" value="${link.url}" required />
                </div>
                <div class="form-group">
                    <label>Icon</label>
                    <select id="editIcon">
                        ${['📸','🔄','💰','📱','📷','🎥','🔗','⭐','🎯','💡'].map(ico =>
                            `<option value="${ico}" ${ico === link.icon ? 'selected' : ''}>${ico}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Gambar Thumbnail</label>
                    ${link.image_url ? `<img src="${link.image_url}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;margin-bottom:8px;" />` : ''}
                    <input type="file" id="editLinkImage" accept="image/*" />
                    <small>Upload gambar baru (kosongkan jika tidak ingin mengubah)</small>
                </div>
                <button type="submit" class="btn-primary btn-full">Simpan Perubahan</button>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    modal.querySelector('#editLinkForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('editTitle').value.trim();
        const url = document.getElementById('editUrl').value.trim();
        const icon = document.getElementById('editIcon').value;
        const fileInput = document.getElementById('editLinkImage');
        const file = fileInput.files[0];

        if (!title || !url) {
            alert('Judul dan URL harus diisi.');
            return;
        }

        try {
            let imageUrl = link.image_url;

            // Upload gambar baru jika ada
            if (file) {
                if (file.size > 5 * 1024 * 1024) {
                    alert('Ukuran gambar maksimal 5MB.');
                    return;
                }

                const fileExt = file.name.split('.').pop();
                const fileName = `link-${Date.now()}.${fileExt}`;
                const filePath = `links/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('gallery')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage
                    .from('gallery')
                    .getPublicUrl(filePath);

                imageUrl = publicUrlData.publicUrl;

                // Hapus gambar lama jika ada
                if (link.image_url) {
                    const oldPath = link.image_url.split('/').pop();
                    await supabase.storage
                        .from('gallery')
                        .remove([`links/${oldPath}`]);
                }
            }

            const { error } = await supabase
                .from('links')
                .update({ title, url, icon, image_url: imageUrl })
                .eq('id', editLinkId);

            if (error) throw error;

            modal.remove();
            await loadLinks();
        } catch (error) {
            alert('Gagal mengupdate link: ' + error.message);
        }
    });
}

// ===== UPDATE PROFILE =====
profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    profileMessage.textContent = '';
    profileMessage.className = 'form-message';

    const display_name = profileName.value.trim();
    const bio = profileBio.value.trim();
    const avatar_url = profileAvatar.value.trim();

    try {
        const { data: existing } = await supabase
            .from('profiles')
            .select('id')
            .limit(1)
            .single();

        let error;

        if (existing) {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ display_name, bio, avatar_url, updated_at: new Date() })
                .eq('id', existing.id);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('profiles')
                .insert([{ display_name, bio, avatar_url }]);
            error = insertError;
        }

        if (error) throw error;

        profileMessage.textContent = 'Profil berhasil disimpan!';
        profileMessage.className = 'form-message success';
    } catch (error) {
        profileMessage.textContent = error.message || 'Gagal menyimpan profil.';
        profileMessage.className = 'form-message error';
    }
});

// ===== PREVIEW =====
function updatePreview(links) {
    if (!links || links.length === 0) {
        previewContainer.innerHTML = `<div class="preview-empty">Belum ada link untuk preview</div>`;
        return;
    }

    const previewLinks = links.slice(0, 5);
    previewContainer.innerHTML = previewLinks.map(link => `
        <div class="preview-item">
            ${link.image_url ? `<img src="${link.image_url}" style="width:30px;height:30px;object-fit:cover;border-radius:4px;" />` : `<span>${link.icon || '🔗'}</span>`}
            <span>${link.title}</span>
        </div>
    `).join('');

    if (links.length > 5) {
        previewContainer.innerHTML += `<div class="preview-item" style="opacity:0.5;font-size:13px;">+ ${links.length - 5} link lainnya</div>`;
    }
}

// ===== LOGOUT =====
logoutBtn.addEventListener('click', async () => {
    if (await logout()) {
        window.location.href = '/login.html';
    } else {
        alert('Gagal logout. Coba lagi.');
    }
});

// ===== INIT =====
loadData();