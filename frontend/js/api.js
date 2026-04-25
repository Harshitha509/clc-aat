// --- Global State & Configuration ---
const API_URL = 'https://smart-event-api.onrender.com/api'; 
const state = {
    token: localStorage.getItem('token') || null,
    user: JSON.parse(localStorage.getItem('user')) || null,
};

// --- WebSockets Initialization ---
const socket = io('https://smart-event-api.onrender.com');

socket.on('newEvent', (data) => {
    if(window.location.hash === '#/events') router();
});
socket.on('eventDeleted', (id) => {
    if(window.location.hash === '#/events' || window.location.hash === '#/calendar') router();
});
socket.on('attendanceUpdate', (data) => {
    if(window.location.hash === '#/admin') router();
});

// --- Global Toast Helper ---
window.showToast = function(msg, type = 'success') {
    Toastify({
        text: msg,
        duration: 4000,
        close: true,
        gravity: "bottom",
        position: "center",
        style: {
            background: type === 'error' ? "linear-gradient(to right, #ef4444, #f87171)" : "linear-gradient(to right, #10b981, #34d399)",
            borderRadius: "8px",
            fontFamily: "Outfit, sans-serif",
            fontWeight: "500",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
        }
    }).showToast();
}

// --- API Helper ---
window.apiCall = async function(endpoint, method = 'GET', body = null, isFormData = false) {
    const headers = {};
    if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
    if (!isFormData) headers['Content-Type'] = 'application/json';

    const config = { method, headers };
    if (body) config.body = isFormData ? body : JSON.stringify(body);

    const res = await fetch(`${API_URL}${endpoint}`, config);
    const data = await res.json();
    if (!res.ok) throw new Error(data.msg || 'API Error');
    return data;
}
