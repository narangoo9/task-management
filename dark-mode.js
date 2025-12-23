
let isDarkMode = localStorage.getItem('darkMode') === 'true';


function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    localStorage.setItem('darkMode', isDarkMode);
    applyDarkMode();
}


function applyDarkMode() {
    const body = document.body;
    const html = document.documentElement;
    
    if (isDarkMode) {
        body.classList.add('dark-mode');
        html.classList.add('dark-mode');
    } else {
        body.classList.remove('dark-mode');
        html.classList.remove('dark-mode');
    }
    
  
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        const icon = darkModeToggle.querySelector('i');
        if (icon) {
            icon.className = isDarkMode ? 'fas fa-sun' : 'fas fa-moon';
        }
    }
}


document.addEventListener('DOMContentLoaded', () => {
    applyDarkMode();
    
   
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', toggleDarkMode);
    }
});

