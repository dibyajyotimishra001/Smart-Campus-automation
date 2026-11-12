// Light - Dark mode logic
const sunIcon = document.querySelector(".dark-mode-toggle");
let savedTheme = localStorage.getItem("currentTheme");

if (savedTheme === "enabled") {
    document.body.classList.add("light");
}

sunIcon.addEventListener("click", function() {
    document.body.classList.toggle("light");

    if (document.body.classList.contains("light")) {
        localStorage.setItem("currentTheme", "enabled");
    } else {
        localStorage.setItem("currentTheme", "disabled");
    }
});

// Sidebar - Hamburger toggle
const hamburger = document.querySelector(".hamburger");
const sidebar = document.querySelector(".sidebar");

hamburger.addEventListener("click", () => {
    sidebar.classList.toggle("active");
});

// SPA Navigation Logic
const sidebarItems = document.querySelectorAll('.sidebar ul li');
const pageViews = document.querySelectorAll('.page-view');

const initialActiveTarget = document.querySelector('.page-view.active-page').id;
const initialActiveTab = document.querySelector(`[data-target="${initialActiveTarget}"]`);
if (initialActiveTab) {
    initialActiveTab.classList.add('active-tab');
}

sidebarItems.forEach(item => {
    item.addEventListener('click', () => {
        const targetId = item.getAttribute('data-target');
        if (!targetId) return;

        pageViews.forEach(page => {
            page.classList.remove('active-page');
        });

        sidebarItems.forEach(li => {
            li.classList.remove('active-tab');
        });

        const targetPage = document.getElementById(targetId);
        if (targetPage) {
            targetPage.classList.add('active-page');
        }

        item.classList.add('active-tab');
    });
});


// 1. DYNAMIC DROPDOWN SYSTEM (Must run first)


let campusData = {};

const courseSelect = document.getElementById('courseSelect');
const semSelect = document.getElementById('semSelect');
const secSelect = document.getElementById('secSelect');
const timetableBody = document.getElementById('timetable-body');

async function loadCampusStructure() {
    try {
        const response = await fetch('http://localhost:8000/api/structure');
        const result = await response.json();

        if (result.status === "success") {
            campusData = result.data;

            courseSelect.innerHTML = '<option value="" disabled selected>Select Course</option>';
            for (const course in campusData) {
                let option = document.createElement('option');
                option.value = course;
                option.textContent = course.toUpperCase();
                courseSelect.appendChild(option);
            }
        }
    } catch (error) {
        console.error("Database connection failed:", error);
        courseSelect.innerHTML = '<option value="" disabled selected>Server Offline</option>';
    }
}

loadCampusStructure();

courseSelect.addEventListener('change', function() {
    const selectedCourse = this.value;

    semSelect.innerHTML = '<option value="" disabled selected>Select Sem</option>';
    secSelect.innerHTML = '<option value="" disabled selected>Select Sec</option>';
    secSelect.disabled = true;

    if (campusData[selectedCourse]) {
        semSelect.disabled = false;
        campusData[selectedCourse].semesters.forEach(sem => {
            let option = document.createElement('option');
            option.value = sem;
            option.textContent = sem;
            semSelect.appendChild(option);
        });
    }
});

semSelect.addEventListener('change', function() {
    const selectedCourse = courseSelect.value;
    const selectedSem = this.value;

    secSelect.innerHTML = '<option value="" disabled selected>Select Sec</option>';

    if (campusData[selectedCourse]?.sections?.[selectedSem]) {
        secSelect.disabled = false;
        campusData[selectedCourse].sections[selectedSem].forEach(sec => {
            let option = document.createElement('option');
            option.value = sec;
            option.textContent = sec;
            secSelect.appendChild(option);
        });
    } else {
        secSelect.disabled = true;
    }
});


// 2. DATA INJECTION (Fetch & Render Table)


secSelect.addEventListener('change', function() {
    const course = courseSelect.value;
    const sem = semSelect.value;
    const sec = this.value;

    timetableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Fetching Domain Data...</td></tr>';

    fetchAndRenderTimetable(course, sem, sec);
});

async function fetchAndRenderTimetable(course, semester, section) {
    try {
        const url = `http://localhost:8000/api/timetable?course=${course}&semester=${semester}&section=${section}`;

        const response = await fetch(url);
        const result = await response.json();

        if (result.status === "success" && result.data.length > 0) {
            timetableBody.innerHTML = '';

            const scheduleData = result.data[0].schedule;

            for (const [day, classes] of Object.entries(scheduleData)) {
                let tr = document.createElement('tr');

                let tdDay = document.createElement('td');
                tdDay.innerHTML = `<strong>${day}</strong>`;
                tr.appendChild(tdDay);

                for (let i = 1; i <= 3; i++) {
                    let tdClass = document.createElement('td');
                    let slotData = classes.find(c => c.slot === i);

                    if (slotData) {
                        tdClass.innerHTML = `
                            <span style="color: var(--accent-purple); font-weight:bold;">${slotData.subject.name}</span><br>
                            <small>${slotData.faculty.name}</small><br>
                            <small>Room: ${slotData.room.number}</small>
                        `;
                    } else {
                        tdClass.innerHTML = `- Free -`;
                    }
                    tr.appendChild(tdClass);
                }

                timetableBody.appendChild(tr);
            }
        } else {
            timetableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No Data Found for this Section.</td></tr>';
        }
    } catch (error) {
        console.error("Backend Disconnected:", error);
        timetableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red;">Connection Error. Is FastAPI running?</td></tr>';
    }
}

// 3. FACULTY TIMELINE INJECTION (The 0ms Cache Strike)

const facultyPage = document.getElementById('faculty-page');
const facultyGrid = facultyPage.querySelector('.faculity-time-table-grid');

// Injecting UI structure directly into the Faculty Page
facultyGrid.innerHTML = `
    <div class="table-header">
        <div class="course">
            <p>Select Faculty</p>
            <select id="facultySelect" name="faculty">
                <option value="" disabled selected>Loading Faculty Domain...</option>
            </select>
        </div>
    </div>
    <div class="time-table">
        <table>
            <thead>
                <tr>
                    <th>Day / Time</th>
                    <th>08:00 - 10:00</th>
                    <th>10:15 - 12:15</th>
                    <th>01:30 - 03:30</th>
                </tr>
            </thead>
            <tbody id="faculty-timetable-body">
                <tr><td colspan="4" style="text-align:center;">Select a faculty to view their timeline</td></tr>
            </tbody>
        </table>
    </div>
`;

const facultySelect = document.getElementById('facultySelect');
const facultyTimetableBody = document.getElementById('faculty-timetable-body');

// Global RAM Cache for Faculty Data (No repeated DB calls)
let globalFacultyCache = [];

async function initFacultyDomain() {
    try {
        const response = await fetch('http://localhost:8000/api/faculty');
        const result = await response.json();

        if (result.status === "success") {
            globalFacultyCache = result.data; // Caching the massive payload in RAM
            
            facultySelect.innerHTML = '<option value="" disabled selected>Select Faculty</option>';
            
            // Populating Dropdown
            globalFacultyCache.forEach(fac => {
                let option = document.createElement('option');
                option.value = fac.faculty_id;
                option.textContent = fac.faculty_name;
                facultySelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Faculty API Miss:", error);
        facultySelect.innerHTML = '<option value="" disabled selected>API Offline</option>';
    }
}

facultySelect.addEventListener('change', function() {
    const selectedFid = this.value;
    
    // Direct RAM lookup - O(n) execution, Zero network latency
    const faculty = globalFacultyCache.find(f => f.faculty_id === selectedFid);
    
    if (!faculty) return;

    // Grouping classes by Day
    const scheduleByDay = { "Monday": [], "Tuesday": [], "Wednesday": [], "Thursday": [], "Friday": [], "Saturday": [] };
    
    faculty.classes.forEach(cls => {
        if (scheduleByDay[cls.day]) {
            scheduleByDay[cls.day].push(cls);
        }
    });

    facultyTimetableBody.innerHTML = '';
    let hasClasses = false;

    for (const [day, classesOfDay] of Object.entries(scheduleByDay)) {
        if (classesOfDay.length === 0) continue;
        hasClasses = true;

        let tr = document.createElement('tr');
        let tdDay = document.createElement('td');
        tdDay.innerHTML = `<strong>${day}</strong>`;
        tr.appendChild(tdDay);

        // Map classes to exact time slots (08:00, 10:15, 01:30)
        let slots = [null, null, null];
        classesOfDay.forEach(cls => {
            if (cls.time.includes("08:00")) slots[0] = cls;
            else if (cls.time.includes("10:15")) slots[1] = cls;
            else if (cls.time.includes("01:30")) slots[2] = cls;
        });

        // Render Slots
        slots.forEach(slot => {
            let tdClass = document.createElement('td');
            if (slot) {
                tdClass.innerHTML = `
                    <span style="color: var(--accent-purple); font-weight:bold;">${slot.subject}</span><br>
                    <small style="color: var(--accent-blue);">${slot.course.toUpperCase()} (Sem ${slot.semester} - ${slot.section})</small><br>
                    <small>Room: ${slot.room}</small>
                `;
            } else {
                tdClass.innerHTML = `- Free -`;
            }
            tr.appendChild(tdClass);
        });

        facultyTimetableBody.appendChild(tr);
    }

    if (!hasClasses) {
        facultyTimetableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No Classes Assigned.</td></tr>';
    }
});

initFacultyDomain();


// 5. CLASSROOM ALLOCATION ENGINE (The 0ms Strike)


const classroomPage = document.getElementById('class-room-allocation-page');
const classroomGrid = classroomPage.querySelector('.classroom-allocation-grid'); // Fixed class name based on index_2.html

// Injecting UI structure into the Classroom Page
classroomGrid.innerHTML = `
    <div class="table-header">
        <div class="course">
            <p>Select Room</p>
            <select id="roomSelect" name="room">
                <option value="" disabled selected>Loading Room Matrix...</option>
            </select>
        </div>
        <div style="margin-top: auto; padding: 10px; background: rgba(139, 92, 246, 0.1); border-radius: 8px;">
            <p style="color: var(--accent-purple); font-size: 14px; font-weight: bold;" id="roomCapacityDisplay">Capacity: -</p>
        </div>
    </div>
    <div class="time-table">
        <table>
            <thead>
                <tr>
                    <th>Day / Time</th>
                    <th>08:00 - 10:00</th>
                    <th>10:15 - 12:15</th>
                    <th>01:30 - 03:30</th>
                </tr>
            </thead>
            <tbody id="room-timetable-body">
                <tr><td colspan="4" style="text-align:center;">Select a room to view occupancy</td></tr>
            </tbody>
        </table>
    </div>
`;

const roomSelect = document.getElementById('roomSelect');
const roomTimetableBody = document.getElementById('room-timetable-body');
const roomCapacityDisplay = document.getElementById('roomCapacityDisplay');

// Global RAM Cache for Rooms (Bypassing the second API endpoint completely)
let globalRoomCache = [];

async function initRoomDomain() {
    try {
        const response = await fetch('http://localhost:8000/api/rooms');
        const result = await response.json();

        if (result.status === "success") {
            globalRoomCache = result.data; // Cache the aggregated payload
            
            roomSelect.innerHTML = '<option value="" disabled selected>Select Room</option>';
            
            // Sort rooms alphanumeric (e.g., A101, A102)
            globalRoomCache.sort((a, b) => a.room_number.localeCompare(b.room_number));

            globalRoomCache.forEach(room => {
                let option = document.createElement('option');
                option.value = room.room_number;
                option.textContent = `Room ${room.room_number}`;
                roomSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Room API Miss:", error);
        roomSelect.innerHTML = '<option value="" disabled selected>API Offline</option>';
    }
}

// 0ms Rendering on Dropdown Change
roomSelect.addEventListener('change', function() {
    const selectedRoomNum = this.value;
    
    // Direct O(n) lookup from RAM cache
    const roomData = globalRoomCache.find(r => r.room_number === selectedRoomNum);
    
    if (!roomData) return;

    roomCapacityDisplay.textContent = `Capacity: ${roomData.capacity || 'N/A'}`;

    // Structure days
    const scheduleByDay = { "Monday": [], "Tuesday": [], "Wednesday": [], "Thursday": [], "Friday": [], "Saturday": [] };
    
    roomData.classes.forEach(cls => {
        if (scheduleByDay[cls.day]) {
            scheduleByDay[cls.day].push(cls);
        }
    });

    roomTimetableBody.innerHTML = '';
    let hasClasses = false;

    for (const [day, classesOfDay] of Object.entries(scheduleByDay)) {
        if (classesOfDay.length === 0) continue;
        hasClasses = true;

        let tr = document.createElement('tr');
        let tdDay = document.createElement('td');
        tdDay.innerHTML = `<strong>${day}</strong>`;
        tr.appendChild(tdDay);

        // Map classes to exact time slots
        let slots = [null, null, null];
        classesOfDay.forEach(cls => {
            if (cls.time.includes("08:00")) slots[0] = cls;
            else if (cls.time.includes("10:15")) slots[1] = cls;
            else if (cls.time.includes("01:30")) slots[2] = cls;
        });

        // Render Slots
        slots.forEach(slot => {
            let tdClass = document.createElement('td');
            if (slot) {
                tdClass.innerHTML = `
                    <span style="color: var(--accent-blue); font-weight:bold;">${slot.course.toUpperCase()}</span><br>
                    <small style="color: var(--accent-purple);">Sem ${slot.semester} - Sec ${slot.section}</small><br>
                    <small>${slot.subject}</small>
                `;
            } else {
                tdClass.innerHTML = `- Empty -`;
            }
            tr.appendChild(tdClass);
        });

        roomTimetableBody.appendChild(tr);
    }

    if (!hasClasses) {
        roomTimetableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Room is entirely free.</td></tr>';
    }
});

// Execute Room Domain Expansion
initRoomDomain();