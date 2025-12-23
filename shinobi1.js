const API_URL = "http://localhost:3000/users";

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
        
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error("Сервертэй холбогдох боломжгүй");
        }

        const users = await response.json();
        
       
        const user = users.find(
            (u) => (u.username === username || u.email === username) && u.password === password
        );

        if (user) {
            showSuccess(`Амжилттай нэвтэрлээ! Тавтай морил, ${user.username}!`);
            
            setTimeout(() => {
                window.location.href = "index.html";
            }, 1000);
        } else {
            showError("Хэрэглэгчийн нэр эсвэл нууц үг буруу байна!");
        }
    } catch (error) {
        console.error("Алдаа:", error);
        showError("Алдаа гарлаа. Дахин оролдоно уу.");
    }
});

