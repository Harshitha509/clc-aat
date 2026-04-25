// --- State & Config ---
const API_URL = 'https://smart-event-api.onrender.com/api'; 
let state = {
    token: localStorage.getItem('token') || null,
    user: JSON.parse(localStorage.getItem('user')) || null,
};

// --- WebSockets Initialization ---
const socket = io('https://smart-event-api.onrender.com');

// Listen for Real-Time cloud events
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
function showToast(msg, type = 'success') {
    Toastify({
        text: msg,
        duration: 4000,
        close: true,
        gravity: "bottom",
        position: "center",
        style: {
            background: type === 'error' ? "linear-gradient(to right, #ef4444, #f87171)" : "linear-gradient(to right, #10b981, #34d399)",
            borderRadius: "8px",
            fontFamily: "Inter, sans-serif",
            fontWeight: "500",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
        }
    }).showToast();
}

// --- API Helpers ---
async function apiCall(endpoint, method = 'GET', body = null, isFormData = false) {
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

// --- Router ---
const routes = {
    '/': renderHome,
    '/login': renderLogin,
    '/signup': renderSignup,
    '/events': renderEvents,
    '/calendar': renderCalendar,
    '/dashboard': renderDashboard,
    '/create-event': renderCreateEvent,
    '/edit-event': renderEditEvent,
    '/admin': renderAdminDashboard,
};

function router() {
    updateNav();
    const hashParts = window.location.hash.split('?');
    const path = hashParts[0].slice(1) || '/';
    const appDiv = document.getElementById('app');
    appDiv.innerHTML = '<div class="loader"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>';

    const renderFn = routes[path];
    if (renderFn) renderFn(appDiv);
    else appDiv.innerHTML = '<div class="container section text-center"><h2>404 - Page Not Found</h2></div>';
}

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', router);

// --- Navigation Management ---
function updateNav() {
    const navLinks = document.getElementById('nav-links');
    if (state.token) {
        let extraLinks = '';
        if (state.user.role === 'admin') extraLinks += '<li><a href="#/admin" class="nav-link">Admin Analytics</a></li>';
        if (state.user.role === 'admin' || state.user.role === 'organizer') extraLinks += '<li><a href="#/create-event" class="nav-link">Create Event</a></li>';

        navLinks.innerHTML = `
            <li><a href="#/" class="nav-link">Home</a></li>
            <li><a href="#/events" class="nav-link">Events</a></li>
            <li><a href="#/calendar" class="nav-link">Calendar</a></li>
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
            showToast('Login successful! Welcome back.');
            window.location.hash = '#/dashboard';
        } catch (err) { showToast(err.message, 'error'); }
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
            showToast('Account created successfully!');
            window.location.hash = '#/dashboard';
        } catch (err) { showToast(err.message, 'error'); }
    });
}

async function renderEvents(appDiv) {
    appDiv.innerHTML = '<div class="container section"><h2>Upcoming Events (Real-Time)</h2><div id="eventsList" class="grid-container"><div class="loader"><i class="fa-solid fa-spinner fa-spin"></i> Checking cloud...</div></div></div>';
    try {
        const events = await apiCall('/events');
        if (events.length === 0) {
            document.getElementById('eventsList').innerHTML = '<p>No events found. Check back later!</p>';
            return;
        }
        const evHtml = events.map(e => {
            // Because we store Base64 now, we don't need the Render URL prefix
            const posterHtml = e.imageUrl ? `<img src="${e.imageUrl}" style="width:100%; height:150px; object-fit:cover; border-radius:8px; margin-bottom:1rem;" alt="Event Poster">` : '';
            const detailsHtml = e.detailsFileUrl ? `<a href="${e.detailsFileUrl}" download="${e.detailsFileName || 'event-details'}" class="btn btn-secondary btn-block" style="margin-top: 0.5rem;"><i class="fa-solid fa-file-arrow-down"></i> Download Details Document</a>` : '';
            
            let deleteBtn = '';
            if (state.token && state.user) {
                // Check if the current user is the owner of this specific event
                const isOwner = e.organizer_id && (e.organizer_id._id === state.user.id || e.organizer_id === state.user.id);
                
                // Only Admins or the exact Organizer who created it can see these buttons
                if (state.user.role === 'admin' || (state.user.role === 'organizer' && isOwner)) {
                    deleteBtn = `
                    <div style="display:flex; gap:0.5rem; margin-top:0.5rem;">
                        <button onclick="window.location.hash='#/edit-event?id=${e._id}'" class="btn btn-secondary" style="flex:1;"><i class="fa-solid fa-pen"></i> Edit</button>
                        <button onclick="deleteEvent('${e._id}')" class="btn btn-secondary" style="flex:1; color: #ef4444; border-color: #ef4444;"><i class="fa-solid fa-trash"></i> Delete</button>
                    </div>`;
                }
            }

            return `
            <div class="card">
                ${posterHtml}
                <h3>${e.title}</h3>
                <p><i class="fa-regular fa-calendar"></i> ${new Date(e.date).toLocaleDateString()}</p>
                <p><i class="fa-solid fa-location-dot"></i> ${e.venue}</p>
                <p style="font-size:0.9rem; color:#64748b;">${e.description}</p>
                <button onclick="registerEvent('${e._id}')" class="btn btn-primary btn-block" style="margin-top:1rem;">Register Now (QR Ticket)</button>
                ${detailsHtml}
                ${deleteBtn}
            </div>
        `}).join('');
        document.getElementById('eventsList').innerHTML = evHtml;
    } catch (err) {
        document.getElementById('eventsList').innerHTML = '<p style="color:red;">Failed to retrieve events. Ensure backend is running.</p>';
    }
}

window.registerEvent = async function (id) {
    if (!state.token) {
        showToast('Please login to register for an event.', 'error');
        window.location.hash = '#/login';
        return;
    }
    try {
        const data = await apiCall(`/events/${id}/register`, 'POST');
        showToast('Registered Successfully! Email has been sent.');
    } catch(err) { showToast(err.message, 'error'); }
}

window.deleteEvent = async function (id) {
    if (!confirm("Are you sure you want to permanently delete this event? All registrations will be removed.")) return;
    try {
        const res = await apiCall(`/events/${id}`, 'DELETE');
        showToast(res.msg || 'Event deleted successfully.');
        router();
    } catch(err) { showToast(err.message, 'error'); }
}

async function renderDashboard(appDiv) {
    if(!state.token) return window.location.hash = '#/login';

    // Auto-scan logic if accessed via QR Code Camera Link
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
    const scanTicket = urlParams.get('scan');
    
    if (scanTicket && (state.user.role === 'admin' || state.user.role === 'organizer')) {
        try {
            const res = await apiCall('/events/scan', 'POST', { ticket_id: scanTicket });
            showToast('✅ ' + res.msg);
            window.location.hash = '#/dashboard'; // clear the parameter
        } catch(err) { 
            showToast('❌ ' + err.message, 'error'); 
            window.location.hash = '#/dashboard'; 
        }
    }

    appDiv.innerHTML = `
        <div class="container section">
            <h2>Welcome back, ${state.user.name} 👋</h2>
            <p>Logged in as: <strong>${state.user.role.toUpperCase()}</strong></p>
            
            <div style="margin-top: 3rem; background: #fff; padding: 2rem; border-radius:8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h3>Quick Actions</h3>
                <div style="display:flex; gap: 1rem; margin-top: 1rem; flex-wrap:wrap;">
                    ${state.user.role !== 'participant' ? '<button onclick="simulateScan()" class="btn btn-primary"><i class="fa-solid fa-qrcode"></i> Manual QR Entry</button>' : ''}
                    <a href="#/events" class="btn btn-secondary">View Event Catalog</a>
                    <a href="#/calendar" class="btn btn-secondary">Interactive Calendar</a>
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
        showToast('✅ SUCCESS: ' + res.msg);
    } catch(err) { showToast('❌ ERROR: ' + err.message, 'error'); }
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
                
                <label>Upload Cloud Poster (Image)</label>
                <input type="file" id="poster" accept="image/*" class="form-control" required style="padding:0.5rem;">

                <label>Upload Details Document (Optional PDF/Word File)</label>
                <input type="file" id="detailsFile" accept=".pdf,.doc,.docx,.txt" class="form-control" style="padding:0.5rem;">

                <button type="submit" class="btn btn-primary btn-block" style="margin-top:1rem;">Publish Event to Cloud</button>
            </form>
        </div>
   `;
   document.getElementById('createEventForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('title', e.target.title.value);
            formData.append('description', e.target.description.value);
            formData.append('date', e.target.date.value);
            formData.append('venue', e.target.venue.value);
            formData.append('poster', e.target.poster.files[0]);
            if(e.target.detailsFile.files.length > 0) formData.append('detailsFile', e.target.detailsFile.files[0]);

            await apiCall('/events', 'POST', formData, true); // true = isFormData
            showToast('Event & Resources successfully uploaded to Cloud Database!');
            window.location.hash = '#/events';
        } catch(err) { showToast(err.message, 'error'); }
   });
}

// --- NEW MODULE: Edit Event ---
async function renderEditEvent(appDiv) {
   if(!state.token || state.user.role === 'participant') return window.location.hash = '#/';
   
   const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
   const eventId = urlParams.get('id');
   if(!eventId) return window.location.hash = '#/events';

   appDiv.innerHTML = '<div class="loader"><i class="fa-solid fa-spinner fa-spin"></i> Loading event data...</div>';
   try {
       const events = await apiCall('/events');
       const event = events.find(e => e._id === eventId);
       if(!event) throw new Error('Event not found');

       // Format date for datetime-local input
       const dateObj = new Date(event.date);
       const dateStr = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000).toISOString().slice(0,16);

       appDiv.innerHTML = `
            <div class="container section">
                <h2 class="text-center" style="margin-bottom:2rem;">Edit Event</h2>
                <form id="editEventForm" class="form-container" style="max-width: 600px;">
                    <label>Event Title</label>
                    <input type="text" id="title" value="${event.title}" required class="form-control">
                    
                    <label>Description</label>
                    <textarea id="description" required class="form-control" rows="4">${event.description}</textarea>
                    
                    <label>Date & Time</label>
                    <input type="datetime-local" id="date" value="${dateStr}" required class="form-control">
                    
                    <label>Venue / Location</label>
                    <input type="text" id="venue" value="${event.venue}" required class="form-control">
                    
                    <label>Upload New Poster (Optional)</label>
                    <input type="file" id="poster" accept="image/*" class="form-control" style="padding:0.5rem;">

                    <label>Upload Details Document (Optional PDF/Word File)</label>
                    <input type="file" id="detailsFile" accept=".pdf,.doc,.docx,.txt" class="form-control" style="padding:0.5rem;">

                    <button type="submit" class="btn btn-primary btn-block" style="margin-top:1rem;">Save Changes</button>
                    <button type="button" onclick="window.location.hash='#/events'" class="btn btn-secondary btn-block">Cancel</button>
                </form>
            </div>
       `;
       document.getElementById('editEventForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const formData = new FormData();
                formData.append('title', e.target.title.value);
                formData.append('description', e.target.description.value);
                formData.append('date', e.target.date.value);
                formData.append('venue', e.target.venue.value);
                if(e.target.poster.files.length > 0) formData.append('poster', e.target.poster.files[0]);
                if(e.target.detailsFile.files.length > 0) formData.append('detailsFile', e.target.detailsFile.files[0]);

                await apiCall('/events/' + eventId, 'PUT', formData, true);
                showToast('Event successfully updated!');
                window.location.hash = '#/events';
            } catch(err) { showToast(err.message, 'error'); }
       });
   } catch(err) {
       appDiv.innerHTML = `<div class="container section"><p style="color:red; text-align:center;">${err.message}</p></div>`;
   }
}

// --- NEW MODULE: Calendar View ---
async function renderCalendar(appDiv) {
    appDiv.innerHTML = '<div class="container section"><h2>Event Calendar Schedule</h2><div id="calList"><div class="loader"><i class="fa-solid fa-spinner fa-spin"></i> Fetching schedule...</div></div></div>';
    try {
        const events = await apiCall('/events');
        // Sort events chronologically
        events.sort((a,b) => new Date(a.date) - new Date(b.date));
        
        if (events.length === 0) {
            document.getElementById('calList').innerHTML = '<p>No scheduled events.</p>';
            return;
        }

        const tableHtml = `
            <table style="width:100%; text-align:left; border-collapse: collapse; margin-top:1rem; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <thead>
                    <tr style="background:#f1f5f9; border-bottom:2px solid #cbd5e1;">
                        <th style="padding:1rem;">Date</th>
                        <th style="padding:1rem;">Time</th>
                        <th style="padding:1rem;">Event Title</th>
                        <th style="padding:1rem;">Venue</th>
                    </tr>
                </thead>
                <tbody>
                    ${events.map(e => {
                        const d = new Date(e.date);
                        return `
                        <tr style="border-bottom:1px solid #e2e8f0; cursor:pointer;" onclick="window.location.hash='#/events'">
                            <td style="padding:1rem;"><strong>${d.toLocaleDateString()}</strong></td>
                            <td style="padding:1rem;">${d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                            <td style="padding:1rem; color:var(--primary-color);">${e.title}</td>
                            <td style="padding:1rem;">${e.venue}</td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
        document.getElementById('calList').innerHTML = tableHtml;
    } catch (err) {
        document.getElementById('calList').innerHTML = '<p style="color:red;">Failed to retrieve calendar.</p>';
    }
}

// --- UPGRADED MODULE: Admin Analytics Dashboard (Chart.js) ---
async function renderAdminDashboard(appDiv) {
   if(!state.token || state.user.role !== 'admin') return window.location.hash = '#/';
   appDiv.innerHTML = '<div class="container section"><h2>Admin Analytics Hub</h2><div id="adminStats"><div class="loader"><i class="fa-solid fa-spinner fa-spin"></i> Compiling Big Data...</div></div></div>';
   try {
       const res = await apiCall('/events/admin/stats');
       const stats = res.stats;
       const chartData = res.barChartData;

       document.getElementById('adminStats').innerHTML = `
           <div class="grid-container" style="margin-bottom:3rem;">
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
                   <p>QR Scans / Check-ins</p>
               </div>
           </div>

           <!-- Chart Layout -->
           <div class="grid-container" style="grid-template-columns: 1fr 1fr;">
                <div class="card">
                    <h3 style="text-align:center; margin-bottom:1rem;">Registrations per Event</h3>
                    <canvas id="barChart"></canvas>
                </div>
                <div class="card">
                    <h3 style="text-align:center; margin-bottom:1rem;">System Breakdown</h3>
                    <canvas id="pieChart"></canvas>
                </div>
           </div>
       `;

       // Render Bar Chart (Registrations per Event)
       new Chart(document.getElementById('barChart'), {
           type: 'bar',
           data: {
               labels: chartData.labels,
               datasets: chartData.datasets
           },
           options: { responsive: true }
       });

       // Render Pie Chart (Overall Engagement)
       new Chart(document.getElementById('pieChart'), {
           type: 'doughnut',
           data: {
               labels: ['Unregistered Users', 'Registrations', 'Verified Attendance'],
               datasets: [{
                   data: [stats.totalUsers - stats.totalRegistrations, stats.totalRegistrations - stats.checkedInCount, stats.checkedInCount],
                   backgroundColor: ['#cbd5e1', '#3b82f6', '#10b981']
               }]
           },
           options: { responsive: true }
       });

   } catch(err) {
       document.getElementById('adminStats').innerHTML = '<p style="color:red;">Failed to load analytics dashboard.</p>';
   }
}
