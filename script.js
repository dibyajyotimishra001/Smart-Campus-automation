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