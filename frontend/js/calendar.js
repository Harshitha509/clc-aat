window.renderCalendar = async function(appDiv) {
    appDiv.innerHTML = '<div class="container section"><h2>Event Calendar Schedule</h2><div id="calList"><div class="loader"><i class="fa-solid fa-spinner fa-spin"></i> Fetching schedule...</div></div></div>';
    try {
        const events = await apiCall('/events');
        events.sort((a,b) => new Date(a.date) - new Date(b.date));
        
        if (events.length === 0) {
            document.getElementById('calList').innerHTML = '<p>No scheduled events.</p>';
            return;
        }

        const tableHtml = `
            <table style="width:100%; text-align:left; border-collapse: collapse; margin-top:1rem;">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Event Title</th>
                        <th>Venue</th>
                    </tr>
                </thead>
                <tbody>
                    ${events.map(e => {
                        const d = new Date(e.date);
                        return `
                        <tr style="cursor:pointer;" onclick="window.location.hash='#/events'">
                            <td><strong>${d.toLocaleDateString()}</strong></td>
                            <td>${d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                            <td style="color:var(--secondary-color); font-weight:600;">${e.title}</td>
                            <td>${e.venue}</td>
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
