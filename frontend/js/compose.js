document.addEventListener("DOMContentLoaded", () => {
  // 로그인 체크
  if (!checkAuth()) return;

  const composeForm = document.querySelector(".compose-form");
  const userEmail = document.querySelector(".user-email");
  const toInput = document.getElementById("to");
  const subjectInput = document.getElementById("subject");
  const bodyInput = document.getElementById("body");
  const errorMessage = document.querySelector(".error-message");

  // 현재 사용자 이메일 표시
  userEmail.textContent = getCurrentUserEmail();

  // URL 파라미터 처리 (답장 기능)
  const urlParams = new URLSearchParams(window.location.search);
  const replyTo = urlParams.get("reply_to");
  const replySubject = urlParams.get("subject");
  const originalBody = urlParams.get("body");

  if (replyTo) {
    toInput.value = replyTo;
  }
  if (replySubject) {
    subjectInput.value = replySubject;
  }
  if (originalBody) {
    bodyInput.value = `\n\n\n-------- 원본 메일 --------\n${decodeURIComponent(
      originalBody
    )}`;
  }

  // 로그아웃 버튼 이벤트
  document.querySelector(".logout-button").addEventListener("click", () => {
    auth.logout();
  });

  // 취소 버튼 이벤트
  document.querySelector(".cancel-button").addEventListener("click", () => {
    if (toInput.value || subjectInput.value || bodyInput.value) {
      if (!confirm("작성 중인 내용이 있습니다. 정말 취소하시겠습니까?")) {
        return;
      }
    }
    window.location.href = "inbox.html";
  });

  // 이메일 유효성 검사
  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return emailRegex.test(email);
  };

  // 폼 제출 이벤트
  composeForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitButton = composeForm.querySelector('button[type="submit"]');
    errorMessage.textContent = "";

    // 입력값 검증
    const to = toInput.value.trim();
    const subject = subjectInput.value.trim();
    const body = bodyInput.value.trim();

    if (!to || !subject || !body) {
      errorMessage.textContent =
        "받는 사람, 제목, 내용은 필수 입력 항목입니다.";
      return;
    }

    if (!validateEmail(to)) {
      errorMessage.textContent = "올바른 이메일 형식이 아닙니다.";
      return;
    }

    // 버튼 비활성화
    submitButton.disabled = true;
    submitButton.textContent = "전송 중...";

    try {
      const response = await mail.sendMail(to, subject, body);

      if (response.mailSaved && !response.mailSent) {
        // 메일은 저장되었지만 실제 발송은 실패한 경우
        if (
          confirm(
            "메일이 저장되었으나, 실제 발송에는 실패했습니다. 받은편지함으로 이동하시겠습니까?"
          )
        ) {
          window.location.href = "inbox.html";
        } else {
          submitButton.disabled = false;
          submitButton.textContent = "보내기";
        }
      } else {
        // 성공적으로 발송된 경우
        window.location.href = "inbox.html";
      }
    } catch (error) {
      console.error("메일 전송 오류:", error);
      errorMessage.textContent =
        error.response?.data?.message || "메일 전송에 실패했습니다.";

      // 버튼 상태 복구
      submitButton.disabled = false;
      submitButton.textContent = "보내기";
    }
  });
});
