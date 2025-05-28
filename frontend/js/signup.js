document.addEventListener("DOMContentLoaded", () => {
  // 이미 로그인된 경우 받은편지함으로 리다이렉션
  if (isAuthenticated()) {
    window.location.href = "/frontend/html/inbox.html";
    return;
  }

  const signupForm = document.querySelector(".auth-form");
  const errorMessage = document.createElement("div");
  errorMessage.className = "error-message";
  signupForm.insertBefore(errorMessage, signupForm.firstChild);

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorMessage.textContent = "";

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const passwordConfirm = document.getElementById("password-confirm").value;

    // 비밀번호 확인
    if (password !== passwordConfirm) {
      errorMessage.textContent = "비밀번호가 일치하지 않습니다.";
      return;
    }

    try {
      await auth.signup(email, password);
      // 회원가입 성공 시 자동 로그인
      await auth.login(email, password);
      window.location.href = "/frontend/html/inbox.html";
    } catch (error) {
      errorMessage.textContent = error.message;
    }
  });
});
