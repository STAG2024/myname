document.addEventListener("DOMContentLoaded", async () => {
  // 로그인 체크
  if (!checkAuth()) return;

  const emailList = document.querySelector(".email-list");
  const userEmail = document.querySelector(".user-email");

  // HTML 이스케이프 함수
  const escapeHtml = (unsafe) => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // 현재 사용자 이메일 표시
  userEmail.textContent = getCurrentUserEmail();

  // 로그아웃 버튼 이벤트
  document.querySelector(".logout-button").addEventListener("click", () => {
    auth.logout();
  });

  // 새 메일 작성 버튼 이벤트
  document.querySelector(".compose-button").addEventListener("click", () => {
    window.location.href = "compose.html";
  });

  try {
    // 받은 메일 목록 가져오기
    const mails = await mail.getInbox();

    // 메일 목록 표시
    emailList.innerHTML = mails.length
      ? mails
          .map(
            (email) => `
      <li class="email-item ${
        email.read ? "read" : "unread"
      }" data-id="${escapeHtml(email._id)}">
        <div class="email-sender">${escapeHtml(email.from)}</div>
        <div class="email-subject">${escapeHtml(email.subject)}</div>
        <div class="email-date">${escapeHtml(
          new Date(email.createdAt).toLocaleDateString()
        )}</div>
      </li>
    `
          )
          .join("")
      : '<li class="no-email">받은 메일이 없습니다.</li>';

    // 메일 클릭 이벤트
    document.querySelectorAll(".email-item").forEach((item) => {
      item.addEventListener("click", () => {
        const mailId = item.dataset.id;
        window.location.href = `view.html?id=${encodeURIComponent(mailId)}`;
      });
    });
  } catch (error) {
    console.error("메일 목록 로딩 오류:", error);
    emailList.innerHTML =
      '<li class="error-message">메일을 불러오는데 실패했습니다.</li>';
  }
});
