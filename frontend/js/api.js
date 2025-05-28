const API_URL = "http://localhost:3000/api";

// CSRF 토큰 저장 변수
let csrfToken = null;

// CSRF 토큰 가져오기
const fetchCsrfToken = async () => {
  try {
    const response = await fetch(`${API_URL}/csrf-token`, {
      credentials: "include",
    });
    const data = await response.json();
    csrfToken = data.csrfToken;
  } catch (error) {
    console.error("CSRF 토큰 가져오기 실패:", error);
    throw new Error("보안 토큰을 가져오는데 실패했습니다.");
  }
};

// API 요청 함수
const apiRequest = async (endpoint, options = {}) => {
  if (!csrfToken) {
    await fetchCsrfToken();
  }

  const defaultOptions = {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "CSRF-Token": csrfToken,
    },
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  });

  if (response.status === 403 && response.headers.get("x-csrf-token-invalid")) {
    // CSRF 토큰이 유효하지 않은 경우, 새로운 토큰을 가져와서 재시도
    await fetchCsrfToken();
    return apiRequest(endpoint, options);
  }

  const data = await response.json();

  if (!response.ok) {
    throw { response: { data } };
  }

  return data;
};

// 인증 관련 API
const auth = {
  // 로그인
  async login(email, password) {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("token", data.token);
    localStorage.setItem("email", data.email);
    return data;
  },

  // 회원가입
  async signup(email, password) {
    return apiRequest("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  // 로그아웃
  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    window.location.href = "login.html";
  },
};

// 메일 관련 API
const mail = {
  // 받은 메일함 조회
  async getInbox() {
    return apiRequest("/mail/inbox", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
  },

  // 메일 상세 조회
  async getMail(id) {
    return apiRequest(`/mail/${id}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
  },

  // 메일 보내기
  async sendMail(to, subject, body) {
    return apiRequest("/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ to, subject, body }),
    });
  },

  // 메일 삭제
  async deleteMail(id) {
    return apiRequest(`/mail/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
  },
};

// 인증 체크 함수
function checkAuth() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}

// 현재 사용자 이메일 가져오기
function getCurrentUserEmail() {
  return localStorage.getItem("email");
}
