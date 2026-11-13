# 🎓 Smart Campus Automation

🚀 **Live Preview:** <https://smart-campus-automation.netlify.app/>

## 📖 Project Overview

Most educational institutions rely on manual timetable generation, which inevitably leads to overlapping classes, double-booked rooms, and resource mismanagement. **Smart Campus Automation** solves this by providing a dynamic, automated scheduling engine.

Instead of relying on local servers or static templates, this project is built on a **fully decoupled cloud architecture**. The frontend client communicates seamlessly with a remote Python backend, which actively processes live data from a NoSQL database to assign time slots and detect scheduling collisions dynamically.

## ✨ Key Features

* **🛡️ Conflict Detection Engine:** Actively scans the database to highlight overlapping faculty assignments or classroom bookings in real-time.

* **📊 Dynamic Dashboard:** Provides a live overview of total classes, faculty members, active classrooms, and pending schedule conflicts.

* **🗓️ Automated Timetable Generation:** Organizes schedules across different courses (B.Tech, BCA, MCA), semesters, and sections.

* **👨‍🏫 Faculty & Room Management:** Tracks faculty availability and classroom capacities to ensure optimized academic loads.

* **☁️ 100% Cloud-Native:** Zero local dependencies. The entire system breathes on the public internet.

## 🏗️ System Architecture & Tech Stack

This project strictly separates the client interface from the backend logic, ensuring high scalability and clean data flow.

### Frontend (Client-Side)

* **HTML5 & CSS3:** Built entirely from scratch utilizing modern **CSS Grid** for complex, responsive layouts. No external UI frameworks (like Bootstrap or Tailwind) were used.

* **Vanilla JavaScript:** Handles dynamic DOM manipulation, SPA (Single Page Application) navigation logic, and asynchronous API calls.

* **Hosting:** Deployed globally via **Netlify**.

### Backend (Server-Side)

* **Python:** Core logic and algorithmic processing.

* **FastAPI:** High-performance RESTful API framework handling all incoming requests from the frontend.

* **Hosting:** Deployed on **Render** (Note: As it runs on a free-tier instance, the server may experience a brief cold start upon the very first request after periods of inactivity).

### Database (Data Layer)

* **MongoDB Atlas:** Cloud-hosted NoSQL database storing departments, courses, faculty, student groups, and scheduling data.

* **Formspree:** Integrated for secure, serverless admission form submissions without cluttering the main database.

## ⚙️ Local Setup & Installation

If you wish to run this project locally on your machine:

**1. Clone the repository**

```
git clone https://github.com/dibyajyotimishra001/Smart-Campus-automation.git
cd Smart-Campus-automation

```

**2. Setup the Backend (FastAPI)**

```
cd backend-folder-name
pip install -r requirements.txt
uvicorn main:app --reload

```

**3. Setup the Frontend**

* Open the frontend `script.js` file and temporarily change the API fetch URLs from the live Render URL back to `http://localhost:8000`.

* Open `index.html` in your browser (or use Live Server).

## 👥 Team: Infinity Void

Built with precision and cursed energy by **Team Infinity Void** for the GEC Hackathon 2026.

* **Raj (Dibyajyoti)** - Team Leader & Full-Stack Architect

* **Mitransu** - Team Member

* **Shitam** - Team Member

* **Sahil** - Team Member