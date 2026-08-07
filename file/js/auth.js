// Di bagian login (kurang lebih baris 30)
setTimeout(() => {
    window.location.href = './dashboard.html';  // ← PERBAIKI: pakai ./
}, 1000);

// Di bagian cek session (baris paling bawah)
(async () => {
    const session = await getSession();
    if (session) {
        window.location.href = './dashboard.html';  // ← PERBAIKI: pakai ./
    }
})();
