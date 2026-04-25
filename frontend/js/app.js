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

function updateNav() {
    const navLinks = document.getElementById('nav-links');
    if (state.token) {
        let extraLinks = '';
        if (state.user.role === 'admin') extraLinks += '<li><a href="#/admin" class="nav-link">Analytics Hub</a></li>';
        if (state.user.role === 'admin' || state.user.role === 'organizer') extraLinks += '<li><a href="#/create-event" class="nav-link">Host Event</a></li>';

        navLinks.innerHTML = `
            <li><a href="#/" class="nav-link">Home</a></li>
            <li><a href="#/events" class="nav-link">Catalog</a></li>
            <li><a href="#/calendar" class="nav-link">Calendar</a></li>
            ${extraLinks}
            <li><a href="#/dashboard" class="nav-link btn btn-secondary">Dashboard</a></li>
            <li><a href="#" onclick="logout(event)" class="nav-link btn btn-primary">Logout</a></li>
        `;
    } else {
        navLinks.innerHTML = `
            <li><a href="#/" class="nav-link">Home</a></li>
            <li><a href="#/events" class="nav-link">Events</a></li>
            <li><a href="#/login" class="nav-link btn btn-secondary">Log In</a></li>
            <li><a href="#/signup" class="nav-link btn btn-primary">Sign Up</a></li>
        `;
    }
}

async function renderHome(appDiv) {
    appDiv.innerHTML = `
        <section class="hero text-center">
            <div class="container">
                <h1>EVENTCLOUD</h1>
                <p>The Next-Gen Platform for Scalable Cloud Event Organization.</p>
                <div style="margin-top:2rem; display:flex; justify-content:center; gap:1rem; flex-wrap:wrap;">
                    ${!state.token ? '<a href="#/signup" class="btn btn-primary">Join Now</a>' : ''}
                    <a href="#/events" class="btn btn-secondary">Explore Events</a>
                </div>
            </div>
        </section>
    `;
}
