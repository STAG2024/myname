document.addEventListener("DOMContentLoaded", async () => {
  // 로그인 체크
  if (!checkAuth()) return;

  const userEmail = document.querySelector(".user-email");
  const mailContent = document.querySelector(".mail-content");

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

  // URL에서 메일 ID 가져오기
  const urlParams = new URLSearchParams(window.location.search);
  const mailId = urlParams.get("id");

  if (!mailId) {
    window.location.href = "inbox.html";
    return;
  }

  try {
    // 메일 데이터 가져오기
    const mailData = await mail.getMail(mailId);

    // 메일 내용 표시
    mailContent.innerHTML = `
      <div class="mail-header">
        <h1>${escapeHtml(mailData.subject)}</h1>
        <div class="mail-meta">
          <div class="mail-from">
            <strong>보낸 사람:</strong> ${escapeHtml(mailData.from)}
          </div>
          <div class="mail-to">
            <strong>받는 사람:</strong> ${escapeHtml(mailData.to)}
          </div>
          <div class="mail-date">
            ${escapeHtml(new Date(mailData.createdAt).toLocaleString())}
          </div>
        </div>
      </div>
      <div class="mail-body">
        ${mailData.body
          .replace(/\n/g, "<br>")
          .split("<br>")
          .map((line) => escapeHtml(line))
          .join("<br>")}
      </div>
    `;

    // 답장 버튼 이벤트
    document.querySelector(".reply-button").addEventListener("click", () => {
      const originalBody = `${mailData.from} 님이 작성:\n${mailData.body}`;
      const params = new URLSearchParams({
        reply_to: mailData.from,
        subject: `Re: ${mailData.subject}`,
        body: originalBody,
      });
      window.location.href = `compose.html?${params.toString()}`;
    });

    // 삭제 버튼 이벤트
    document
      .querySelector(".delete-button")
      .addEventListener("click", async () => {
        if (confirm("이 메일을 삭제하시겠습니까?")) {
          try {
            await mail.deleteMail(mailId);
            window.location.href = "inbox.html";
          } catch (error) {
            console.error("메일 삭제 오류:", error);
            alert("메일 삭제에 실패했습니다.");
          }
        }
      });
  } catch (error) {
    console.error("메일 상세 조회 오류:", error);
    mailContent.innerHTML = `
      <div class="error-message">
        메일을 불러오는데 실패했습니다.
      </div>
    `;
  }
});
