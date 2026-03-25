/**
 * auth.js — Helpers de autenticación para el panel admin
 * La protección real está en el <head> de admin.html usando netlifyIdentity.on('init') + refresh()
 */

/**
 * Devuelve el token JWT actual para llamadas autenticadas a las Netlify Functions
 */
function getAuthToken() {
    // Primero intentar obtener el token del widget si está disponible
    if (window.netlifyIdentity) {
        const user = netlifyIdentity.currentUser();
        if (user && user.token && user.token.access_token) {
            return user.token.access_token;
        }
    }
    // Fallback: leer de localStorage
    try {
        const userStr = localStorage.getItem('gotrue.user');
        if (!userStr) return null;
        const user = JSON.parse(userStr);
        return user && user.token && user.token.access_token;
    } catch (e) {
        return null;
    }
}

/**
 * Cierra la sesión del usuario
 */
function logout() {
    if (window.netlifyIdentity) {
        netlifyIdentity.logout();
    }
    localStorage.removeItem('gotrue.user');
    window.location.replace('/login.html');
}
