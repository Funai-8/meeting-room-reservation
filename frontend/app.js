// ── Room capacities ──
const ROOM_CAPACITY = {
  "Room A": 10,
  "Room B": 20,
  "Room C": 5
};

// ── Get all reservations from storage ──
function getReservations() {
  const data = localStorage.getItem('reservations');
  return data ? JSON.parse(data) : [];
}

// ── Save reservations to storage ──
function saveReservations(reservations) {
  localStorage.setItem('reservations', JSON.stringify(reservations));
}

// ── Generate a unique ID ──
function generateId() {
  return Date.now();
}

// ── Check if a room is already booked at the requested time ──
function hasOverlap(room, date, startTime, endTime, excludeId = null) {
  const reservations = getReservations();
  return reservations.some(function(res) {
    if (res.id === excludeId) return false;
    if (res.room !== room) return false;
    if (res.date !== date) return false;
    return startTime < res.endTime && endTime > res.startTime;
  });
}

// ── Create reservation page ──
const submitBtn = document.getElementById('submit-btn');

if (submitBtn) {
  submitBtn.addEventListener('click', function() {
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
      errorMsg.textContent = `${room} only fits ${ROOM_CAPACITY[room]} people. You entered ${attendees}.`;
      return;
    }

    if (hasOverlap(room, date, startTime, endTime)) {
      errorMsg.textContent = `${room} is already booked during that time. Please choose another slot.`;
      return;
    }

    const reservations = getReservations();

    const newReservation = {
      id: generateId(),
      room,
      name,
      date,
      startTime,
      endTime,
      attendees
    };

    reservations.push(newReservation);
    saveReservations(reservations);

    successMsg.textContent = `Room booked! ${room} reserved for ${name}.`;

    document.getElementById('room').value = '';
    document.getElementById('name').value = '';
    document.getElementById('date').value = '';
    document.getElementById('start-time').value = '';
    document.getElementById('end-time').value = '';
    document.getElementById('attendees').value = '';
  });
}

// ── Cancel reservation page ──
const searchBtn = document.getElementById('search-btn');

if (searchBtn) {
  searchBtn.addEventListener('click', function() {
    const searchName = document.getElementById('cancel-name').value.trim().toLowerCase();
    const resultsDiv = document.getElementById('reservation-results');
    resultsDiv.innerHTML = '';

    if (!searchName) {
      resultsDiv.innerHTML = '<p style="color:#ef4565">Please enter a name to search.</p>';
      return;
    }

    const reservations = getReservations();
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
          <h4>${res.room}</h4>
          <p>${res.date} &nbsp;|&nbsp; ${res.startTime} – ${res.endTime} &nbsp;|&nbsp; Booked by: ${res.name}</p>
        </div>
        <button class="cancel-btn" data-id="${res.id}">Cancel</button>
      `;

      resultsDiv.appendChild(card);
    });

    resultsDiv.querySelectorAll('.cancel-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const id = parseInt(btn.getAttribute('data-id'));
        let reservations = getReservations();
        reservations = reservations.filter(function(res) {
          return res.id !== id;
        });
        saveReservations(reservations);
        btn.closest('.result-card').remove();
      });
    });
  });
}

// ── Calendar page ──
const viewBtn = document.getElementById('view-btn');

if (viewBtn) {
  viewBtn.addEventListener('click', function() {
    const date = document.getElementById('date-picker').value;
    const gridDiv = document.getElementById('calendar-grid');

    if (!date) {
      gridDiv.innerHTML = '<p class="placeholder">Please select a date.</p>';
      return;
    }

    const reservations = getReservations();
    const filtered = reservations.filter(function(res) {
      return res.date === date;
    });

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
          <td>${res.room}</td>
          <td>${res.name}</td>
          <td>${res.startTime}</td>
          <td>${res.endTime}</td>
          <td>${res.attendees}</td>
          <td><span class="badge">Booked</span></td>
        </tr>
      `;
    });

    tableHTML += `</tbody></table>`;
    gridDiv.innerHTML = tableHTML;
  });
}

// ── Active nav indicator ──
const currentPage = window.location.pathname;
document.querySelectorAll('.nav-links a').forEach(function(link) {
  if (currentPage.includes(link.getAttribute('href').replace('../', ''))) {
    link.classList.add('active');
  }
});