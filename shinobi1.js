const JSON_URL = "db.json";

const loginForm = document.getElementById("loginForm");
const errorMessage = document.getElementById("errorMessage");
const successMessage = document.getElementById("successMessage");

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = "block";
    successMessage.style.display = "none";
}

function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.style.display = "block";
    errorMessage.style.display = "none";
}

function hideMessages() {
    errorMessage.style.display = "none";
    successMessage.style.display = "none";
}

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMessages();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (!username || !password) {
        showError("Бүх талбарыг бөглөнө үү!");
        return;
    }

    try {
        // db.json файлаас өгөгдөл татах
        const response = await fetch(JSON_URL);
        if (!response.ok) {
            throw new Error("JSON файл унших боломжгүй");
        }

        const data = await response.json();
        const users = data.users || [];
        
        // Хэрэглэгчийг олох (username эсвэл email-ээр)
        const user = users.find(
            (u) => (u.username === username || u.email === username) && u.password === password
        );

        if (user) {
            showSuccess(`Амжилттай нэвтэрлээ! Тавтай морил, ${user.username}!`);
            
            // Амжилттай нэвтрэх анимейшн
            const loginBox = document.querySelector('.login');
            loginBox.style.animation = 'successPulse 0.5s ease';
            
            setTimeout(() => {
                // index.html руу шилжих
                window.location.href = "index.html";
            }, 2000);
        } else {
            showError("Хэрэглэгчийн нэр эсвэл нууц үг буруу байна!");
            
            // Алдааны анимейшн
            const loginBox = document.querySelector('.login');
            loginBox.style.animation = 'errorShake 0.5s ease';
            setTimeout(() => {
                loginBox.style.animation = 'float 6s ease-in-out infinite, glowPulse 3s ease-in-out infinite';
            }, 500);
        }
    } catch (error) {
        console.error("Алдаа:", error);
        showError("Алдаа гарлаа. Дахин оролдоно уу.");
    }
});

// Анимейшн нэмэх
const style = document.createElement('style');
style.textContent = `
    @keyframes successPulse {
        0%, 100% {
            box-shadow: 0 0 50px rgba(0, 255, 255, 0.3),
                        0 0 100px rgba(0, 255, 255, 0.1);
        }
        50% {
            box-shadow: 0 0 100px rgba(0, 255, 0, 0.6),
                        0 0 200px rgba(0, 255, 0, 0.3);
            transform: scale(1.05);
        }
    }
    
    @keyframes errorShake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
    }
`;
document.head.appendChild(style);
