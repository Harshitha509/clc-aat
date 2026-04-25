window.renderDashboard = async function(appDiv) {
    if(!state.token) return window.location.hash = '#/login';

    const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
    const scanTicket = urlParams.get('scan');
    
    if (scanTicket && (state.user.role === 'admin' || state.user.role === 'organizer')) {
        try {
            const res = await apiCall('/events/scan', 'POST', { ticket_id: scanTicket });
            showToast('✅ ' + res.msg);
            window.location.hash = '#/dashboard';
        } catch(err) { 
            showToast('❌ ' + err.message, 'error'); 
            window.location.hash = '#/dashboard'; 
        }
    }

    appDiv.innerHTML = `
        <div class="container section">
            <h2>Welcome back, ${state.user.name} 👋</h2>
            <p style="color:var(--text-secondary);">Logged in as: <strong style="color:var(--secondary-color);">${state.user.role.toUpperCase()}</strong></p>
            
            <div style="margin-top: 3rem; background: var(--surface-dark); border: 1px solid var(--surface-border); padding: 2.5rem; border-radius:24px; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
                <h3>Quick Actions</h3>
                <div style="display:flex; gap: 1rem; margin-top: 1.5rem; flex-wrap:wrap;">
                    ${state.user.role !== 'participant' ? `
                        <button onclick="startCameraScan()" class="btn btn-primary"><i class="fa-solid fa-camera"></i> Camera Scan</button>
                        <button onclick="simulateScan()" class="btn btn-secondary"><i class="fa-solid fa-keyboard"></i> Manual Entry</button>
                    ` : ''}
                    <a href="#/events" class="btn btn-secondary">View Event Catalog</a>
                    <a href="#/calendar" class="btn btn-secondary">Interactive Calendar</a>
                </div>
                
                <div id="qr-reader" style="width:100%; max-width:500px; display:none; margin-top:2rem; border-radius:12px; overflow:hidden; border: 1px solid var(--surface-border);"></div>
            </div>
        </div>
    `;
}

let html5QrcodeScanner;
window.startCameraScan = function() {
    const qrReaderDiv = document.getElementById('qr-reader');
    if(qrReaderDiv.style.display === 'block') {
        qrReaderDiv.style.display = 'none';
        if(html5QrcodeScanner) html5QrcodeScanner.clear();
        return;
    }
    
    qrReaderDiv.style.display = 'block';
    
    html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: {width: 250, height: 250} },
        false);
        
    html5QrcodeScanner.render(async (decodedText, decodedResult) => {
        html5QrcodeScanner.clear();
        qrReaderDiv.style.display = 'none';
        
        const ticketId = decodedText.includes('scan=') ? decodedText.split('scan=')[1] : decodedText;
        
        try {
            const res = await apiCall('/events/scan', 'POST', { ticket_id: ticketId });
            showToast('✅ SUCCESS: ' + res.msg);
        } catch(err) { showToast('❌ ERROR: ' + err.message, 'error'); }
    }, (errorMessage) => { });
}

window.simulateScan = async function() {
    const ticketId = prompt('Scanner Simulator: Enter the Ticket ID (e.g. TKT-XXXXXX):');
    if(!ticketId) return;
    try {
        const res = await apiCall('/events/scan', 'POST', { ticket_id: ticketId });
        showToast('✅ SUCCESS: ' + res.msg);
    } catch(err) { showToast('❌ ERROR: ' + err.message, 'error'); }
}

window.renderAdminDashboard = async function(appDiv) {
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
                   <h3 style="font-size:2.5rem; color:var(--text-primary);">${stats.totalUsers}</h3>
                   <p>Active Participants</p>
               </div>
               <div class="card text-center">
                   <h3 style="font-size:2.5rem; color:var(--text-primary);">${stats.totalRegistrations}</h3>
                   <p>Total Registrations</p>
               </div>
               <div class="card text-center" style="border-left: 4px solid #10b981;">
                   <h3 style="font-size:2.5rem; color:#10b981;">${stats.checkedInCount}</h3>
                   <p>Verified Scans</p>
               </div>
           </div>

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

       new Chart(document.getElementById('barChart'), {
           type: 'bar',
           data: { labels: chartData.labels, datasets: chartData.datasets },
           options: { responsive: true, color: '#f8fafc', scales: { x: { ticks: {color: '#94a3b8'} }, y: { ticks: {color: '#94a3b8'} } } }
       });

       new Chart(document.getElementById('pieChart'), {
           type: 'doughnut',
           data: {
               labels: ['Unregistered Users', 'Registrations', 'Verified Attendance'],
               datasets: [{
                   data: [stats.totalUsers - stats.totalRegistrations, stats.totalRegistrations - stats.checkedInCount, stats.checkedInCount],
                   backgroundColor: ['rgba(255,255,255,0.1)', '#a855f7', '#10b981'],
                   borderColor: '#09090b', borderWidth: 2
               }]
           },
           options: { responsive: true, color: '#f8fafc' }
       });

   } catch(err) {
       document.getElementById('adminStats').innerHTML = '<p style="color:red;">Failed to load analytics dashboard.</p>';
   }
}
