// --- State & Config ---
const API_URL = 'http://localhost:5000/api';
let state = {
    token: localStorage.getItem('token') || null,
    user: JSON.parse(localStorage.getItem('user')) || null,
};

// --- API Helpers ---
async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (state.token) headers['Authorization'] = `Bearer ${state.token}`;

    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);

    const res = await fetch(`${API_URL}${endpoint}`, config);
    const data = await res.json();
    if (!res.ok) throw new Error(data.msg || 'API Error');
    return data;
}

// --- Router ---
const routes = {
    '/': renderHome,
    '/login': renderLogin,
    '/signup': renderSignup,
    '/events': renderEvents,
    '/dashboard': renderDashboard,
    '/create-event': renderCreateEvent,
    '/admin': renderAdminDashboard,
};

function router() {
    updateNav();
    const path = window.location.hash.slice(1) || '/';
    const appDiv = document.getElementById('app');
    appDiv.innerHTML = '<div class="loader"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>';

    const renderFn = routes[path];
    if (renderFn) {
        renderFn(appDiv);
    } else {
        appDiv.innerHTML = '<div class="container section text-center"><h2>404 - Page Not Found</h2></div>';
    }
}

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', router);

// --- Navigation Management ---
function updateNav() {
    const navLinks = document.getElementById('nav-links');
    if (state.token) {
        let extraLinks = '';
        if (state.user.role === 'admin') extraLinks += '<li><a href="#/admin" class="nav-link">Admin Dashboard</a></li>';
        if (state.user.role === 'admin' || state.user.role === 'organizer') extraLinks += '<li><a href="#/create-event" class="nav-link">Create Event</a></li>';

        navLinks.innerHTML = `
            <li><a href="#/" class="nav-link">Home</a></li>
            <li><a href="#/events" class="nav-link">Events</a></li>
            ${extraLinks}
            <li><a href="#/dashboard" class="nav-link">Dashboard</a></li>
            <li><a href="#" onclick="logout(event)" class="nav-link">Logout</a></li>
        `;
    } else {
        navLinks.innerHTML = `
            <li><a href="#/" class="nav-link">Home</a></li>
            <li><a href="#/events" class="nav-link">Events</a></li>
            <li><a href="#/login" class="nav-link btn btn-secondary" style="color:var(--primary-color);">Login</a></li>
            <li><a href="#/signup" class="nav-link btn btn-primary">Sign Up</a></li>
        `;
    }
}

window.logout = function (e) {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    state.token = null;
    state.user = null;
    window.location.hash = '#/';
}

// --- Render Pages ---
async function renderHome(appDiv) {
    appDiv.innerHTML = `
        <section class="hero text-center">
            <div class="container">
                <h1>CLOUD BASED SMART EVENT MANAGEMENT</h1>
                <p>A scalable cloud platform for organizing events efficiently.</p>
                <div style="margin-top:2rem;">
                    ${!state.token ? '<a href="#/signup" class="btn btn-primary">Get Started</a>' : ''}
                    <a href="#/events" class="btn btn-secondary">Browse All Events</a>
                </div>
            </div>
        </section>
    `;
}

async function renderLogin(appDiv) {
    appDiv.innerHTML = `
        <div class="container section">
            <h2 class="text-center" style="margin-bottom:2rem;">Log In to EventCloud</h2>
            <form id="loginForm" class="form-container">
                <input type="email" id="email" placeholder="Email Address" required class="form-control">
                <input type="password" id="password" placeholder="Password" required class="form-control">
                <button type="submit" class="btn btn-primary btn-block">Sign In</button>
                <p class="text-center" style="margin-top:1rem;font-size:0.9rem;">
                    Don't have an account? <a href="#/signup">Sign Up</a>
                </p>
            </form>
        </div>
    `;
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const data = await apiCall('/auth/login', 'POST', {
                email: e.target.email.value,
                password: e.target.password.value
            });
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            state.token = data.token; state.user = data.user;
            window.location.hash = '#/dashboard';
        } catch (err) { alert(err.message); }
    });
}

async function renderSignup(appDiv) {
    appDiv.innerHTML = `
        <div class="container section">
            <h2 class="text-center" style="margin-bottom:2rem;">Create an Account</h2>
            <form id="signupForm" class="form-container">
                <input type="text" id="name" placeholder="Full Name" required class="form-control">
                <input type="email" id="email" placeholder="Email Address" required class="form-control">
                <input type="password" id="password" placeholder="Password" required class="form-control">
                <select id="role" class="form-control">
                    <option value="participant">Participant (Attendee)</option>
                    <option value="organizer">Organizer (Host Events)</option>
                    <option value="admin">Admin (System Manager)</option>
                </select>
                <button type="submit" class="btn btn-primary btn-block">Register Account</button>
            </form>
        </div>
    `;
    document.getElementById('signupForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const data = await apiCall('/auth/register', 'POST', {
                name: e.target.name.value,
                email: e.target.email.value,
                password: e.target.password.value,
                role: e.target.role.value
            });
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            state.token = data.token; state.user = data.user;
            window.location.hash = '#/dashboard';
        } catch (err) { alert(err.message); }
    });
}

async function renderEvents(appDiv) {
    appDiv.innerHTML = '<div class="container section"><h2>Upcoming Events</h2><div id="eventsList" class="grid-container"><div class="loader"><i class="fa-solid fa-spinner fa-spin"></i> Checking cloud...</div></div></div>';
    try {
        const events = await apiCall('/events');
        if (events.length === 0) {
            document.getElementById('eventsList').innerHTML = '<p>No events found. Check back later!</p>';
            return;
        }
        const evHtml = events.map(e => `
            <div class="card">
                <h3>${e.title}</h3>
                <p><i class="fa-regular fa-calendar"></i> ${new Date(e.date).toLocaleDateString()}</p>
                <p><i class="fa-solid fa-location-dot"></i> ${e.venue}</p>
                <p style="font-size:0.9rem; color:#64748b;">${e.description}</p>
                <button onclick="registerEvent('${e._id}')" class="btn btn-primary btn-block" style="margin-top:1rem;">Register Now</button>
            </div>
        `).join('');
        document.getElementById('eventsList').innerHTML = evHtml;
    } catch (err) {
        document.getElementById('eventsList').innerHTML = '<p style="color:red;">Failed to retrieve events from server. Ensure backend is running.</p>';
    }
}

window.registerEvent = async function (id) {
    if (!state.token) {
        alert('Please login to register for an event.');
        window.location.hash = '#/login';
        return;
    }
    try {
        const data = await apiCall(`/events/${id}/register`, 'POST');
        alert('Registered Successfully! Your Unique Ticket ID is: ' + data.ticket_id);
    } catch(err) { alert(err.message); }
}

async function renderDashboard(appDiv) {
    if(!state.token) return window.location.hash = '#/login';
    appDiv.innerHTML = `
        <div class="container section">
            <h2>Welcome back, ${state.user.name} 👋</h2>
            <p>Logged in as: <strong>${state.user.role.toUpperCase()}</strong></p>
            
            <div style="margin-top: 3rem; background: #fff; padding: 2rem; border-radius:8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h3>Quick Actions</h3>
                <div style="display:flex; gap: 1rem; margin-top: 1rem; flex-wrap:wrap;">
                    ${state.user.role !== 'participant' ? '<button onclick="simulateScan()" class="btn btn-primary"><i class="fa-solid fa-qrcode"></i> Scan QR Attendance</button>' : ''}
                    <a href="#/events" class="btn btn-secondary">View Event Catalog</a>
                </div>
            </div>
        </div>
    `;
}

window.simulateScan = async function() {
    const ticketId = prompt('Scanner Simulator: Enter the Ticket ID (e.g. TKT-XXXXXX):');
    if(!ticketId) return;
    try {
        const res = await apiCall('/events/scan', 'POST', { ticket_id: ticketId });
        alert('✅ SUCCESS: ' + res.msg);
    } catch(err) { alert('❌ ERROR: ' + err.message); }
}

async function renderCreateEvent(appDiv) {
   if(!state.token || state.user.role === 'participant') return window.location.hash = '#/';
   appDiv.innerHTML = `
        <div class="container section">
            <h2 class="text-center" style="margin-bottom:2rem;">Host a New Event</h2>
            <form id="createEventForm" class="form-container" style="max-width: 600px;">
                <label>Event Title</label>
                <input type="text" id="title" placeholder="E.g., Tech Conference 2026" required class="form-control">
                
                <label>Description</label>
                <textarea id="description" placeholder="What is this event about?" required class="form-control" rows="4"></textarea>
                
                <label>Date & Time</label>
                <input type="datetime-local" id="date" required class="form-control">
                
                <label>Venue / Location</label>
                <input type="text" id="venue" placeholder="Main Auditorium" required class="form-control">
                
                <button type="submit" class="btn btn-primary btn-block">Publish Event to Cloud</button>
            </form>
        </div>
   `;
   document.getElementById('createEventForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await apiCall('/events', 'POST', {
                title: e.target.title.value,
                description: e.target.description.value,
                date: e.target.date.value,
                venue: e.target.venue.value
            });
            alert('Event successfully created and stored in the database!');
            window.location.hash = '#/events';
        } catch(err) { alert(err.message); }
   });
}

async function renderAdminDashboard(appDiv) {
   if(!state.token || state.user.role !== 'admin') return window.location.hash = '#/';
   appDiv.innerHTML = '<div class="container section"><h2>Admin Analytics</h2><div id="adminStats"><div class="loader"><i class="fa-solid fa-spinner fa-spin"></i> Compiling statistics...</div></div></div>';
   try {
       const stats = await apiCall('/events/admin/stats');
       document.getElementById('adminStats').innerHTML = `
           <div class="grid-container">
               <div class="card bg-primary text-center">
                   <h3>${stats.totalEvents}</h3>
                   <p>Total Events</p>
               </div>
               <div class="card text-center">
                   <h3 style="font-size:2.5rem;">${stats.totalUsers}</h3>
                   <p>Active Participants</p>
               </div>
               <div class="card text-center">
                   <h3 style="font-size:2.5rem;">${stats.totalRegistrations}</h3>
                   <p>Total Registrations</p>
               </div>
               <div class="card text-center" style="border-left: 4px solid #10b981;">
                   <h3 style="font-size:2.5rem; color:#10b981;">${stats.checkedInCount}</h3>
                   <p>Successful QR Check-ins</p>
               </div>
           </div>
       `;
   } catch(err) {
       document.getElementById('adminStats').innerHTML = '<p style="color:red;">Failed to load statistics. Ensure backend endpoint is reachable.</p>';
   }
}

