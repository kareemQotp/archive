// Authentication utility functions
// Requires firebase-init.js to be loaded first

function requireAuth(redirectTo = 'login.html') {
    auth.onAuthStateChanged((user) => {
        if (!user) {
            window.location.href = redirectTo;
        }
    });
}

function logout() {
    auth.signOut().then(() => {
        window.location.href = 'login.html';
    });
}

// Example usage:
// requireAuth(); // Call at the top of any protected page
// document.getElementById('logoutBtn').onclick = logout;
