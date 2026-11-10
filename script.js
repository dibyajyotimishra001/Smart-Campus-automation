// for Light - Dark mode

const sunIcon = document.querySelector(".dark-mode-toggle");

let savedTheme = localStorage.getItem("currentTheme");

if(savedTheme == "enabled"){
    document.body.classList.add("light");
}

sunIcon.addEventListener("click", function(){
    document.body.classList.toggle("light");

    if(document.body.classList.contains("light")){
        localStorage.setItem("currentTheme", "enabled");
    }
    else{
        localStorage.setItem("currentTheme", "disabled");
    }

});

// sidebar - hamburger
hamburger = document.querySelector(".hamburger");
sidebar = document.querySelector(".sidebar");

hamburger.addEventListener("click", ()=>{
    sidebar.classList.toggle("active");
});

// script_2.js (Add this below your dark mode logic)

// 1. Mock Data (This will later come from MongoDB via FastAPI)
const campusData = {
    btech: {
        semesters: ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"],
        sections: {
            "1st": ["K", "L", "M", "N", "O", "P", "Q", "R"], // BTech 1st sem has 5 sections
            "3rd": ["Sec 1", "Sec 2", "Sec 3", "Sec 4", "Sec 5", "Sec 6", "Sec 7", "Sec 8"],
            "5th" : ["A", "B", "C", "D", "E", "F", "G", "H"]
        }
    },
    bca: {
        semesters: ["1st", "2nd", "3rd", "4th", "5th", "6th"],
    },
    mca: {
        semesters: ["1st", "2nd", "3rd", "4th"],
    }
};

// 2. DOM Elements
const courseSelect = document.getElementById('courseSelect');
const semSelect = document.getElementById('semSelect');
const secSelect = document.getElementById('secSelect');

// 3. Event Listeners (The Triggers)
courseSelect.addEventListener('change', function() {
    const selectedCourse = this.value;
    
    // Clear previous options
    semSelect.innerHTML = '<option value="" disabled selected>Select Sem</option>';
    secSelect.innerHTML = '<option value="" disabled selected>Select Sec</option>';
    secSelect.disabled = true; // Disable section until sem is chosen
    
    if (campusData[selectedCourse]) {
        // Enable Sem dropdown and populate it
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
    
    // Clear previous sections
    secSelect.innerHTML = '<option value="" disabled selected>Select Sec</option>';
    
    // Optional Chaining (?.) prevents crash if 'sections' is missing (like in BCA)
    if (campusData[selectedCourse]?.sections?.[selectedSem]) {
        secSelect.disabled = false;
        campusData[selectedCourse].sections[selectedSem].forEach(sec => {
            let option = document.createElement('option');
            option.value = sec;
            option.textContent = sec;
            secSelect.appendChild(option);
        });
    } else {
        // Fallback for BCA or any course/sem with no sections
        // Keeps the Section dropdown strictly disabled 
        secSelect.disabled = true;
    }
});

// SPA Navigation Logic
const sidebarItems = document.querySelectorAll('.sidebar ul li');
const pageViews = document.querySelectorAll('.page-view');

// Set initial active tab on page load (matching the HTML active-page)
const initialActiveTarget = document.querySelector('.page-view.active-page').id;
const initialActiveTab = document.querySelector(`[data-target="${initialActiveTarget}"]`);
if(initialActiveTab) {
    initialActiveTab.classList.add('active-tab');
}

sidebarItems.forEach(item => {
    item.addEventListener('click', () => {
        const targetId = item.getAttribute('data-target');
        if (!targetId) return; 

        // 1. Hide all pages
        pageViews.forEach(page => {
            page.classList.remove('active-page');
        });

        // 2. Remove active styling from all sidebar items
        sidebarItems.forEach(li => {
            li.classList.remove('active-tab');
        });

        // 3. Show the target page
        const targetPage = document.getElementById(targetId);
        if (targetPage) {
            targetPage.classList.add('active-page');
        }

        // 4. Add active styling to clicked sidebar item
        item.classList.add('active-tab');
    });
});