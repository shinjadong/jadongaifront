// API 설정과 공통 요청 함수
const API_BASE_URL = 'https://moray-leading-jolly.ngrok-free.app';

async function makeRequest(endpoint, options = {}) {
    try {
        const defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            },
            credentials: 'include'  // CORS 인증 정보 포함
        });

        if (options.method === 'OPTIONS') {
            return { status: 'OK' };
        }

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || '요청 처리 중 오류가 발생했습니다.');
        }
        
        return data;
    } catch (error) {
        console.error('API 요청 실패:', error);
        showModal(error.message || '서버와의 통신 중 오류가 발생했습니다.');
        throw error;
    }
}

// 유틸리티 함수
function showLoading() {
    document.getElementById('loadingIndicator').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingIndicator').style.display = 'none';
}

function showModal(message) {
    document.getElementById('modalMessage').textContent = message;
    document.getElementById('messageModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('messageModal').style.display = 'none';
}

// 폼 전환 함수
function showLoginForm() {
    document.querySelector('.signup-box').style.display = 'none';
    document.querySelector('.login-box').style.display = 'block';
}

function showSignupForm() {
    document.querySelector('.login-box').style.display = 'none';
    document.querySelector('.signup-box').style.display = 'block';
}

// 유효성 검사 함수
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePassword(password) {
    return password.length >= 6;
}

// 회원가입 처리
async function handleSignup() {
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;

    // 입력값 검증
    if (!name || !validateEmail(email) || !validatePassword(password)) {
        return;
    }

    showLoading();
    try {
        const data = await makeRequest('/signup', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        });

        showModal('회원가입이 완료되었습니다. 로그인해주세요.');
        showLoginForm();
    } catch (error) {
        // 에러는 makeRequest에서 처리됨
    } finally {
        hideLoading();
    }
}

// 로그인 처리
async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!validateEmail(email) || !password) {
        return;
    }

    showLoading();
    try {
        const data = await makeRequest('/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        localStorage.setItem('user', JSON.stringify(data));
        window.location.href = '/main.html';
    } catch (error) {
        // 에러는 makeRequest에서 처리됨
    } finally {
        hideLoading();
    }
}

// 엔터 키 이벤트 처리
function handleEnterKey(event, formType) {
    if (event.key === 'Enter') {
        if (formType === 'login') {
            handleLogin();
        } else if (formType === 'signup') {
            handleSignup();
        }
    }
}

// 초기화 함수
function initializeApp() {
    // 이벤트 리스너 등록
    document.getElementById('loginEmail').addEventListener('keypress', (e) => handleEnterKey(e, 'login'));
    document.getElementById('loginPassword').addEventListener('keypress', (e) => handleEnterKey(e, 'login'));
    document.getElementById('signupName').addEventListener('keypress', (e) => handleEnterKey(e, 'signup'));
    document.getElementById('signupEmail').addEventListener('keypress', (e) => handleEnterKey(e, 'signup'));
    document.getElementById('signupPassword').addEventListener('keypress', (e) => handleEnterKey(e, 'signup'));

    // 모달 닫기 이벤트
    document.querySelector('.close-button').addEventListener('click', closeModal);
    window.addEventListener('click', (event) => {
        if (event.target === document.getElementById('messageModal')) {
            closeModal();
        }
    });

    // 로그인 상태 체크
    const user = localStorage.getItem('user');
    if (user) {
        window.location.href = '/main.html';
    }
}

// 앱 초기화
document.addEventListener('DOMContentLoaded', initializeApp);