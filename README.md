# Meeting Room Reservation System

A simple web application for reserving meeting rooms.

## Repository Structure

- `/backend` - Django REST Framework backend providing database storage, business logic validation, and a RESTful API.
- `/frontend` - Static client application (HTML/CSS/Vanilla JS) communicating with the backend APIs via `fetch()`.

## Backend Setup & Execution

### 1. Install Dependencies
You need Python installed. Run the following command from the repository root:
```bash
pip install Django djangorestframework django-cors-headers
```

### 2. Run Database Migrations
Navigate to the `/backend` directory and apply the Django migrations:
```bash
cd backend
python manage.py migrate
```

### 3. Load Seed Room Data
Load the initial static rooms (Room A, Room B, Room C) into the SQLite database using the provided fixture:
```bash
python manage.py loaddata rooms
```

### 4. Run the Dev Server
Start the local Django server:
```bash
python manage.py runserver
```
The API will run at `http://127.0.0.1:8000/`.

## Running the Tests
To run the automated API test suite (which validates capacities, scheduling, overlap rejections, back-to-back allowance, and room cancellations):
```bash
cd backend
python manage.py test
```

## Frontend Setup & API Integration

The frontend consists of static files in the `/frontend` directory. The JavaScript client (`frontend/app.js`) is configured to send HTTP queries to the backend at `http://127.0.0.1:8000` via:
```javascript
const API_BASE_URL = 'http://127.0.0.1:8000';
```
If you deploy or run the backend at a different host/port, update this variable at the top of [app.js](file:///c:/Users/User/meeting-room-reservation/frontend/app.js) to match.

To run the frontend:
Simply open `frontend/index.html` directly in your browser, or serve it using any simple local HTTP server (like VS Code Live Server or python `http.server`).