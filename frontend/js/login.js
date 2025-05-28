document.addEventListener("DOMContentLoaded", () => {
  // 이미 로그인된 경우 받은편지함으로 리다이렉션
  if (isAuthenticated()) {
    window.location.href = "/frontend/html/inbox.html";
    return;
  }

  const loginForm = document.querySelector(".auth-form");
  const errorMessage = document.createElement("div");
  errorMessage.className = "error-message";
  loginForm.insertBefore(errorMessage, loginForm.firstChild);

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorMessage.textContent = "";

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      await auth.login(email, password);
      window.location.href = "/frontend/html/inbox.html";
    } catch (error) {
      errorMessage.textContent = error.message;
    }
  });
});
