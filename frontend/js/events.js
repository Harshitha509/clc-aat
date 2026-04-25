window.renderEvents = async function(appDiv) {
    appDiv.innerHTML = '<div class="container section"><h2>Upcoming Events (Real-Time)</h2><div id="eventsList" class="grid-container"><div class="loader"><i class="fa-solid fa-spinner fa-spin"></i> Checking cloud...</div></div></div>';
    try {
        const events = await apiCall('/events');
        if (events.length === 0) {
            document.getElementById('eventsList').innerHTML = '<p>No events found. Check back later!</p>';
            return;
        }
        const evHtml = events.map(e => {
            let finalImageUrl = '';
            if (e.imageUrl) {
                if (e.imageUrl.startsWith('data:') || e.imageUrl.startsWith('http')) finalImageUrl = e.imageUrl;
                else finalImageUrl = 'https://smart-event-api.onrender.com' + e.imageUrl;
            }
            const posterHtml = finalImageUrl ? `<img src="${finalImageUrl}" style="width:100%; height:150px; object-fit:cover; border-radius:8px; margin-bottom:1rem;" alt="Event Poster">` : '';
            const detailsHtml = e.detailsFileUrl ? `<a href="${e.detailsFileUrl}" download="${e.detailsFileName || 'event-details'}" class="btn btn-secondary btn-block" style="margin-top: 0.5rem;"><i class="fa-solid fa-file-arrow-down"></i> Download Details Document</a>` : '';
            
            let deleteBtn = '';
            if (state.token && state.user) {
                const isOwner = e.organizer_id && (e.organizer_id._id === state.user.id || e.organizer_id === state.user.id);
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
                <p style="font-size:0.9rem; color:var(--text-secondary);">${e.description}</p>
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

window.renderCreateEvent = async function(appDiv) {
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

            await apiCall('/events', 'POST', formData, true); 
            showToast('Event & Resources successfully uploaded to Cloud Database!');
            window.location.hash = '#/events';
        } catch(err) { showToast(err.message, 'error'); }
   });
}

window.renderEditEvent = async function(appDiv) {
   if(!state.token || state.user.role === 'participant') return window.location.hash = '#/';
   
   const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
   const eventId = urlParams.get('id');
   if(!eventId) return window.location.hash = '#/events';

   appDiv.innerHTML = '<div class="loader"><i class="fa-solid fa-spinner fa-spin"></i> Loading event data...</div>';
   try {
       const events = await apiCall('/events');
       const event = events.find(e => e._id === eventId);
       if(!event) throw new Error('Event not found');

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
