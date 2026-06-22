const API_BASE_URL = 'http://127.0.0.1:8000';

let ROOM_CAPACITY = {};
let ROOM_NAMES = {};

// ── Fetch all rooms to initialize capacity maps and populate create dropdown ──
async function fetchRooms() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/rooms/`);
    if (!response.ok) throw new Error('Failed to fetch rooms');
    const rooms = await response.json();
    
    rooms.forEach(room => {
      ROOM_CAPACITY[room.id] = room.capacity;
      ROOM_NAMES[room.id] = room.name;
    });

    const roomSelect = document.getElementById('room');
    if (roomSelect) {
      roomSelect.innerHTML = '<option value="">-- Select a room --</option>';
      rooms.forEach(room => {
        const option = document.createElement('option');
        option.value = room.id;
        option.textContent = `${room.name} — Capacity: ${room.capacity}`;
        roomSelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error fetching rooms:', error);
  }
}

// Initialize rooms on script load
fetchRooms();

// ── Check if a room is already booked at the requested time (client-side check) ──
async function hasOverlap(room, date, startTime, endTime) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/reservations/?date=${date}`);
    if (!response.ok) return false;
    const reservations = await response.json();
    
    return reservations.some(function(res) {
      if (String(res.room) !== String(room)) return false;
      const resStart = res.startTime.slice(0, 5);
      const resEnd = res.endTime.slice(0, 5);
      return startTime < resEnd && endTime > resStart;
    });
  } catch (error) {
    console.error('Error checking overlap:', error);
    return false;
  }
}

// ── Create reservation page ──
const submitBtn = document.getElementById('submit-btn');

if (submitBtn) {
  submitBtn.addEventListener('click', async function() {
    const room = document.getElementById('room').value;
    const name = document.getElementById('name').value.trim();
    const date = document.getElementById('date').value;
    const startTime = document.getElementById('start-time').value;
    const endTime = document.getElementById('end-time').value;
    const attendees = parseInt(document.getElementById('attendees').value);

    const errorMsg = document.getElementById('error-message');
    const successMsg = document.getElementById('success-message');

    errorMsg.textContent = '';
    successMsg.textContent = '';

    if (!room || !name || !date || !startTime || !endTime || !attendees) {
      errorMsg.textContent = 'Please fill in all fields.';
      return;
    }

    if (endTime <= startTime) {
      errorMsg.textContent = 'End time must be after start time.';
      return;
    }

    if (attendees > ROOM_CAPACITY[room]) {
      errorMsg.textContent = `${ROOM_NAMES[room]} only fits ${ROOM_CAPACITY[room]} people. You entered ${attendees}.`;
      return;
    }

    if (await hasOverlap(room, date, startTime, endTime)) {
      errorMsg.textContent = `${ROOM_NAMES[room]} is already booked during that time. Please choose another slot.`;
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/reservations/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          room: parseInt(room),
          name: name,
          date: date,
          startTime: startTime,
          endTime: endTime,
          attendees: attendees
        })
      });

      const responseData = await response.json();

      if (!response.ok) {
        let errorMsgText = 'An error occurred.';
        if (responseData.non_field_errors) {
          errorMsgText = responseData.non_field_errors.join(' ');
        } else if (typeof responseData === 'object') {
          errorMsgText = Object.values(responseData).flat().join(' ');
        } else if (typeof responseData === 'string') {
          errorMsgText = responseData;
        }
        errorMsg.textContent = errorMsgText;
        return;
      }

      successMsg.textContent = `Room booked! ${ROOM_NAMES[room]} reserved for ${name}. Redirecting to calendar...`;

      setTimeout(function() {
        window.location.href = 'calendar.html?date=' + date;
      }, 1000);

    } catch (err) {
      errorMsg.textContent = 'Network error: Failed to connect to server.';
      console.error(err);
    }
  });
}

// ── Cancel reservation page ──
const searchBtn = document.getElementById('search-btn');

if (searchBtn) {
  searchBtn.addEventListener('click', async function() {
    const searchName = document.getElementById('cancel-name').value.trim().toLowerCase();
    const resultsDiv = document.getElementById('reservation-results');
    resultsDiv.innerHTML = '';

    if (!searchName) {
      resultsDiv.innerHTML = '<p style="color:#ef4565">Please enter a name to search.</p>';
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/reservations/`);
      if (!response.ok) throw new Error('Failed to fetch reservations');
      const reservations = await response.json();

      const matches = reservations.filter(function(res) {
        return res.name.toLowerCase().includes(searchName);
      });

      if (matches.length === 0) {
        resultsDiv.innerHTML = '<p style="color:#94a1b2">No reservations found for that name.</p>';
        return;
      }

      matches.forEach(function(res) {
        const card = document.createElement('div');
        card.classList.add('result-card');

        card.innerHTML = `
          <div class="result-info">
            <h4>${res.room_name}</h4>
            <p>${res.date} &nbsp;|&nbsp; ${res.startTime.slice(0, 5)} – ${res.endTime.slice(0, 5)} &nbsp;|&nbsp; Booked by: ${res.name}</p>
          </div>
          <button class="cancel-btn" data-id="${res.id}">Cancel</button>
        `;

        resultsDiv.appendChild(card);
      });

      resultsDiv.querySelectorAll('.cancel-btn').forEach(function(btn) {
        btn.addEventListener('click', async function() {
          const id = btn.getAttribute('data-id');
          try {
            const deleteResponse = await fetch(`${API_BASE_URL}/api/reservations/${id}/`, {
              method: 'DELETE'
            });
            if (!deleteResponse.ok) throw new Error('Failed to delete reservation');
            btn.closest('.result-card').remove();
          } catch (err) {
            alert('Error deleting reservation: ' + err.message);
          }
        });
      });

    } catch (err) {
      resultsDiv.innerHTML = '<p style="color:#ef4565">Network error: Failed to fetch reservations.</p>';
      console.error(err);
    }
  });
}

// ── Calendar page ──
const viewBtn = document.getElementById('view-btn');

if (viewBtn) {
  viewBtn.addEventListener('click', async function() {
    const date = document.getElementById('date-picker').value;
    const gridDiv = document.getElementById('calendar-grid');

    if (!date) {
      gridDiv.innerHTML = '<p class="placeholder">Please select a date.</p>';
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/reservations/?date=${date}`);
      if (!response.ok) throw new Error('Failed to fetch reservations');
      const filtered = await response.json();

      if (filtered.length === 0) {
        gridDiv.innerHTML = '<p class="placeholder">No reservations for this date.</p>';
        return;
      }

      let tableHTML = `
        <table class="calendar-table">
          <thead>
            <tr>
              <th>Room</th>
              <th>Booked By</th>
              <th>Start</th>
              <th>End</th>
              <th>Attendees</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
      `;

      filtered.forEach(function(res) {
        tableHTML += `
          <tr>
            <td>${res.room_name}</td>
            <td>${res.name}</td>
            <td>${res.startTime.slice(0, 5)}</td>
            <td>${res.endTime.slice(0, 5)}</td>
            <td>${res.attendees}</td>
            <td><span class="badge">Booked</span></td>
          </tr>
        `;
      });

      tableHTML += `</tbody></table>`;
      gridDiv.innerHTML = tableHTML;

    } catch (err) {
      gridDiv.innerHTML = '<p class="placeholder" style="color:#ef4565">Network error: Failed to load reservations.</p>';
      console.error(err);
    }
  });
}

// Automatically trigger date query parameter selection if it exists in URL
const urlParams = new URLSearchParams(window.location.search);
const dateParam = urlParams.get('date');
const datePicker = document.getElementById('date-picker');
if (datePicker && dateParam) {
  datePicker.value = dateParam;
  if (viewBtn) {
    viewBtn.click();
  }
}

// ── Active nav indicator ──
const currentPage = window.location.pathname;
document.querySelectorAll('.nav-links a').forEach(function(link) {
  if (currentPage.includes(link.getAttribute('href').replace('../', ''))) {
    link.classList.add('active');
  }
});