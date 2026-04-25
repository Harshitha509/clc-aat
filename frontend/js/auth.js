window.renderLogin = async function(appDiv) {
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

window.renderSignup = async function(appDiv) {
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

window.logout = function(e) {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    state.token = null;
    state.user = null;
    window.location.hash = '#/';
}
