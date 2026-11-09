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
