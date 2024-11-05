// API 설정
const API_BASE_URL = 'https://moray-leading-jolly.ngrok-free.app';

// API 요청 공통 함수
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
            }
        });

        // OPTIONS 요청에 대한 처리
        if (options.method === 'OPTIONS') {
            return { status: 'OK' };
        }

        const data = await response.json();
        
        // 에러 응답 처리
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

// 로딩 표시 함수
function showLoading() {
    document.getElementById('loadingIndicator').style.display = 'flex';
}

// 로딩 숨김 함수
function hideLoading() {
    document.getElementById('loadingIndicator').style.display = 'none';
}

// 모달 표시 함수
function showModal(message) {
    const modalMessage = document.getElementById('modalMessage');
    const modal = document.getElementById('messageModal');
    if (modalMessage && modal) {
        modalMessage.textContent = message;
        modal.style.display = 'flex';
    } else {
        alert(message); // 모달이 없는 경우 alert로 대체
    }
}

// 모달 닫기 함수
function closeModal() {
    const modal = document.getElementById('messageModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 전역 변수
let currentUser = null;
let selectedProducts = new Set();

// 사용자 정보 업데이트
function updateUserInfo() {
    if (currentUser) {
        document.getElementById('remainingCredits').textContent = 
            `남은 컨설팅 횟수: ${currentUser.remainingCredits}`;
    }
}

// 로그아웃 처리
function handleLogout() {
    localStorage.removeItem('user');
    window.location.href = '/';
}

// 검색 처리
async function handleSearch() {
    const keyword = document.getElementById('searchInput').value.trim();
    const searchType = document.getElementById('searchType').value;

    if (!keyword) {
        showModal('검색어를 입력해주세요.');
        return;
    }

    showLoading();
    try {
        const response = await fetch(`${API_BASE_URL}/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                keyword,
                uid: currentUser.uid,
                sort_type: searchType
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || '검색 중 오류가 발생했습니다.');
        }

        displaySearchResults(data.products);

    } catch (error) {
        console.error('검색 실패:', error);
        showModal(error.message);
    } finally {
        hideLoading();
    }
}

// 검색 결과 표시
function displaySearchResults(products) {
    const tbody = document.getElementById('searchResults');
    tbody.innerHTML = '';

    products.forEach(product => {
        const row = document.createElement('tr');
        const priceFormatted = new Intl.NumberFormat('ko-KR').format(product.price);
        const reviewFormatted = new Intl.NumberFormat('ko-KR').format(product.review_count);
        
        row.innerHTML = `
            <td>
                <input type="checkbox" 
                       value="${product.id}" 
                       onchange="handleProductSelect(this)"
                       ${selectedProducts.has(product.id) ? 'checked' : ''}>
            </td>
            <td>
                <img src="${product.image_url}" alt="${product.product_title}" 
                     style="width: 50px; height: 50px; object-fit: contain;">
            </td>
            <td>${product.product_title}</td>
            <td>${priceFormatted}원</td>
            <td>${reviewFormatted}</td>
            <td>${product.recent_purchases || 0}</td>
            <td>${product.market_name || '-'}</td>
            <td>
                ${product.taobaoMatch ? `
                    <div class="taobao-match-info">
                        <span>매칭완료</span>
                        <span>${new Intl.NumberFormat('ko-KR').format(product.taobaoMatch.price)}원</span>
                    </div>
                ` : '미매칭'}
            </td>
        `;
        tbody.appendChild(row);
    });
    
    updateCollectButton();
}

// 상품 선택 처리
function handleProductSelect(checkbox) {
    if (checkbox.checked) {
        selectedProducts.add(checkbox.value);
    } else {
        selectedProducts.delete(checkbox.value);
    }
    updateCollectButton();
}

// 전체 선택 처리
function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('#searchResults input[type="checkbox"]');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
        if (selectAllCheckbox.checked) {
            selectedProducts.add(checkbox.value);
        } else {
            selectedProducts.delete(checkbox.value);
        }
    });
    
    updateCollectButton();
}

// 수집 버튼 상태 업데이트
function updateCollectButton() {
    const collectButton = document.querySelector('.collect-button');
    collectButton.disabled = selectedProducts.size === 0;
}

// 상품 수집 처리
async function handleCollectProducts() {
    if (selectedProducts.size === 0) {
        showModal('선택된 상품이 없습니다.');
        return;
    }

    const currentUser = JSON.parse(localStorage.getItem('user'));
    if (!currentUser || !currentUser.uid) {
        showModal('로그인이 필요합니다.');
        return;
    }

    showLoading();
    try {
        const data = await makeRequest('/collect', {
            method: 'POST',
            body: JSON.stringify({
                uid: currentUser.uid,
                selected_product_ids: Array.from(selectedProducts)
            })
        });

        showModal('상품이 성공적으로 수집되었습니다.');
        
        // 수집 성공 후 '수집한 상품' 탭으로 전환
        switchTab('collected');
        
        // 선택 초기화
        selectedProducts.clear();
        updateCollectButton();

    } catch (error) {
        console.error('상품 수집 실패:', error);
        showModal(error.message || '상품 수집 중 오류가 발생했습니다.');
    } finally {
        hideLoading();
    }
}

// 수집된 상품 표시 함수 수정
function displayCollectedProducts(products) {
    const tbody = document.getElementById('collectedProducts');
    tbody.innerHTML = '';

    if (!Array.isArray(products) || products.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="empty-message">수집된 상품이 없습니다.</td>
            </tr>
        `;
        return;
    }

    products.forEach(product => {
        const row = document.createElement('tr');
        const priceFormatted = new Intl.NumberFormat('ko-KR').format(product.price);
        
        row.innerHTML = `
            <td>
                <input type="checkbox" 
                       value="${product.id}" 
                       onchange="handleCollectedProductSelect(this)"
                       ${selectedCollectedProducts.has(product.id) ? 'checked' : ''}>
            </td>
            <td>
                <img src="${product.image_url}" alt="${product.product_title}" 
                     style="width: 50px; height: 50px; object-fit: contain;">
            </td>
            <td>${product.product_title}</td>
            <td>${product.seo_title || '미생성'}</td>
            <td>${priceFormatted}원</td>
            <td>${new Intl.NumberFormat('ko-KR').format(product.review_count)}</td>
            <td>${new Intl.NumberFormat('ko-KR').format(product.recent_purchases || 0)}</td>
            <td>${product.market_name}</td>
            <td>
                ${product.taobaoMatch ? `
                    <div class="taobao-matched">
                        <span class="match-status matched">매칭완료</span>
                        <span class="taobao-price">
                            ¥${new Intl.NumberFormat('ko-KR').format(product.taobaoMatch.price)}
                            <br>
                            <small class="krw-price">
                                약 ${new Intl.NumberFormat('ko-KR').format(product.taobaoMatch.price * 200)}원
                            </small>
                        </span>
                    </div>
                ` : '<span class="match-status unmatched">미매칭</span>'}
            </td>
            <td class="action-buttons">
                ${!product.seo_title ? `
                    <button onclick="handleSingleSEO('${product.id}')" class="action-btn seo-btn">
                        SEO 생성
                    </button>
                ` : ''}
                ${!product.taobaoMatch ? `
                    <button onclick="handleSingleTaobaoMatch('${product.id}')" class="action-btn taobao-btn">
                        타오바오 매칭
                    </button>
                ` : ''}
            </td>
        `;
        tbody.appendChild(row);
    });

    updateCollectButtonStates();
}

// 체크박스 선택 핸들러
function handleCollectedProductSelect(checkbox) {
    if (checkbox.checked) {
        selectedCollectedProducts.add(checkbox.value);
    } else {
        selectedCollectedProducts.delete(checkbox.value);
    }
    updateCollectButtonStates();
}

// 전체 선택 핸들러
function toggleSelectAllCollected() {
    const allCheckbox = document.getElementById('selectAllCollected');
    const checkboxes = document.querySelectorAll('#collectedProducts input[type="checkbox"]');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = allCheckbox.checked;
        if (allCheckbox.checked) {
            selectedCollectedProducts.add(checkbox.value);
        } else {
            selectedCollectedProducts.delete(checkbox.value);
        }
    });
    updateCollectButtonStates();
}

// 버튼 상태 업데이트 함수 수정
function updateCollectButtonStates() {
    const hasSelectedProducts = selectedCollectedProducts.size > 0;
    
    const deleteBtn = document.querySelector('.delete-btn');
    const taobaoBtn = document.querySelector('.bulk-action-btn.taobao-btn');
    const heysellerBtn = document.querySelector('.heyseller-btn');
    
    if (deleteBtn) deleteBtn.disabled = !hasSelectedProducts;
    if (taobaoBtn) taobaoBtn.disabled = !hasSelectedProducts;
    if (heysellerBtn) heysellerBtn.disabled = !hasSelectedProducts;
}

// 진행 상태 업데이트
function updateProgressStatus(products) {
    const totalCount = products.length;
    const seoCount = products.filter(p => p.seo_title).length;
    const matchCount = products.filter(p => p.taobaoMatch).length;
    
    document.getElementById('seoProgress').textContent = `${seoCount}/${totalCount}`;
    document.getElementById('matchProgress').textContent = `${matchCount}/${totalCount}`;
}

// 헤이셀러 다운로드 버튼 상태 업데이트
function updateHeysellerButton(products) {
    const downloadBtn = document.querySelector('.heyseller-button');
    if (!downloadBtn) return;

    // SEO와 타오바오 매칭이 모두 완료된 상품이 있는지 확인
    const isReadyToDownload = products.some(product => 
        product.seo_title && product.taobaoMatch
    );

    downloadBtn.disabled = !isReadyToDownload;
    
    if (!isReadyToDownload) {
        downloadBtn.title = 'SEO 생성과 타오바오 매칭을 먼저 완료해주세요';
    } else {
        downloadBtn.title = '헤이셀러 엑셀 다운로드';
    }
}

// SEO 타이틀 생성
async function generateSEO(productId) {
    const currentUser = JSON.parse(localStorage.getItem('user'));
    showLoading();
    
    try {
        const data = await makeRequest('/generate_seo', {
            method: 'POST',
            body: JSON.stringify({
                uid: currentUser.uid,
                product_id: productId
            })
        });

        showModal('SEO 타이틀이 생성되었습니다.');
        await loadCollectedProducts(); // 목록 새로고침
    } catch (error) {
        showModal(error.message || 'SEO 생성 중 오류가 발생했습니다.');
    } finally {
        hideLoading();
    }
}

// 단일 상품 타오바오 매칭 함수 
async function handleSingleTaobaoMatch(productId) {
    const currentUser = JSON.parse(localStorage.getItem('user'));
    if (!currentUser) {
        showModal('로그인이 필요합니다.');
        return;
    }

    showLoading();
    try {
        // 타오바오 매칭 요청
        const response = await makeRequest('/batch_taobao_match', {
            method: 'POST',
            body: JSON.stringify({
                uid: currentUser.uid,
                productIds: [productId]
            })
        });

        // 매칭된 상품 데이터를 받아옴
        if (response && response.matched_products) {
            // 수집된 상품 목록 새로고침
            const collectedResponse = await makeRequest(`/get_collected_products?uid=${currentUser.uid}`, {
                method: 'GET'
            });

            if (collectedResponse && collectedResponse.products) {
                displayCollectedProducts(collectedResponse.products);
                updateProgress(collectedResponse.products);
            }

            showModal('타오바오 매칭이 완료되었습니다.');
        }

    } catch (error) {
        showModal(error.message || '타오바오 매칭 중 오류가 발생했습니다.');
    } finally {
        hideLoading();
    }
}

// 타오바오 일괄 매칭 함수
async function handleBulkTaobaoMatch() {
    if (selectedCollectedProducts.size === 0) {
        showModal('선택된 상품이 없습니다.');
        return;
    }

    const currentUser = JSON.parse(localStorage.getItem('user'));
    if (!currentUser) {
        showModal('로그인이 필요합니다.');
        return;
    }

    showLoading();
    try {
        // 타오바오 매칭 요청
        const response = await makeRequest('/batch_taobao_match', {
            method: 'POST',
            body: JSON.stringify({
                uid: currentUser.uid,
                productIds: Array.from(selectedCollectedProducts)
            })
        });

        if (response && response.matched_products) {
            // 수집된 상품 목록 새로고침
            const collectedResponse = await makeRequest(`/get_collected_products?uid=${currentUser.uid}`, {
                method: 'GET'
            });

            if (collectedResponse && collectedResponse.products) {
                displayCollectedProducts(collectedResponse.products);
                updateProgress(collectedResponse.products);
            }

            showModal('타오바오 매칭이 완료되었습니다.');
            selectedCollectedProducts.clear();
            updateCollectButtonStates();
        }

    } catch (error) {
        showModal(error.message || '타오바오 매칭 중 오류가 발생했습니다.');
    } finally {
        hideLoading();
    }
}

// 마켓 리버싱
async function handleMarketReverse() {
    const currentUser = JSON.parse(localStorage.getItem('user'));
    if (!currentUser) {
        showModal('로그인이 필요합니다.');
        return;
    }

    const marketUrl = document.getElementById('marketUrl').value.trim();
    const option = document.getElementById('marketOption').value;

    if (!marketUrl) {
        showModal('마켓 URL을 입력해주세요.');
        return;
    }

    showLoading();
    try {
        const data = await makeRequest('/scrape_market', {
            method: 'POST',
            body: JSON.stringify({
                uid: currentUser.uid,
                url: marketUrl,
                option: option
            })
        });

        displayReverseResults(data.products);
    } catch (error) {
        console.error('마켓 리버싱 실패:', error);
        showModal(error.message);
    } finally {
        hideLoading();
    }
}

// 헤이셀러 다운로드 함수 수정
async function handleDownloadHeySeller() {
    const currentUser = JSON.parse(localStorage.getItem('user'));
    if (!currentUser) {
        showModal('로그인이 필요합니다.');
        return;
    }

    showLoading();
    try {
        // 직접 브라우저에서 파일 다운로드 처리
        window.location.href = `${API_BASE_URL}/download_heyseller?uid=${currentUser.uid}`;
        hideLoading();
    } catch (error) {
        console.error('헤이셀러 다운로드 실패:', error);
        showModal(error.message || '헤이셀러 다운로드 중 오류가 발생했습니다.');
        hideLoading();
    }
}

// 탭 전환 처리
function switchTab(tabName) {
    console.log('탭 전환:', tabName); // 디버깅용
    
    // 모든 탭 컨텐츠 숨기기
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // 모든 탭 버튼 비활성화
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // 선택된 탭 활성화
    const selectedTab = document.getElementById(`${tabName}Tab`);
    const selectedButton = document.querySelector(`[onclick="switchTab('${tabName}')"]`);
    
    if (selectedTab) selectedTab.classList.add('active');
    if (selectedButton) selectedButton.classList.add('active');
    
    // 수집한 상품 탭으로 전환 시 데이터 로드
    if (tabName === 'collected') {
        loadCollectedProducts();
    }
}

// 수집된 상품 로드 함수 수정
async function loadCollectedProducts() {
    const currentUser = JSON.parse(localStorage.getItem('user'));
    if (!currentUser) {
        showModal('로그인이 필요합니다.');
        return;
    }

    showLoading();
    try {
        console.log('수집된 상품 로드 시작'); // 디버깅용
        const data = await makeRequest(`/get_collected_products?uid=${currentUser.uid}`, {
            method: 'GET'
        });

        console.log('받아온 데이터:', data); // 디버깅용

        if (data && data.products) {
            displayCollectedProducts(data.products);
            updateProgress(data.products);
        } else {
            console.error('상품 데이터가 없습니다.');
        }
    } catch (error) {
        console.error('수집된 상품 로드 실패:', error);
        showModal(error.message || '수집된 상품을 불러오는데 실패했습니다.');
    } finally {
        hideLoading();
    }
}

// 초기화 함수
function initializeApp() {
    // 로그인 체크
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        window.location.href = '/';
        return;
    }

    currentUser = JSON.parse(userStr);
    updateUserInfo();

    // 이벤트 리스너 등록
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    // 모달 닫기 이벤트
    document.querySelector('.close-button').addEventListener('click', closeModal);
    window.addEventListener('click', (event) => {
        if (event.target === document.getElementById('messageModal')) {
            closeModal();
        }
    });

    // 정기적으로 사용자 정보 업데이트
    setInterval(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/user-info?uid=${currentUser.uid}`);
            const data = await response.json();
            if (response.ok) {
                currentUser = { ...currentUser, ...data.user };
                updateUserInfo();
            }
        } catch (error) {
            console.error('사용자 정보 업데이트 실패:', error);
        }
    }, 60000); // 1분마다 업데이트
}

// 앱 초기화
document.addEventListener('DOMContentLoaded', initializeApp);

// 선택된 수집 상품 관리
let selectedCollectedProducts = new Set();

// 수집된 상품 전체 선택/해제
function toggleSelectAllCollected() {
    const checkboxes = document.querySelectorAll('#collectedProducts input[type="checkbox"]');
    const selectAllCheckbox = document.getElementById('selectAllCollected');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
        if (selectAllCheckbox.checked) {
            selectedCollectedProducts.add(checkbox.value);
        } else {
            selectedCollectedProducts.delete(checkbox.value);
        }
    });
    
    updateBulkButtons();
}

// 개별 상품 선택/해제
function handleCollectedProductSelect(checkbox) {
    if (checkbox.checked) {
        selectedCollectedProducts.add(checkbox.value);
    } else {
        selectedCollectedProducts.delete(checkbox.value);
    }
    
    updateBulkButtons();
}

// 일괄 작업 버튼 상태 업데이트
function updateBulkButtons() {
    const seoBtn = document.querySelector('.bulk-action-btn:nth-child(1)');
    const taobaoBtn = document.querySelector('.bulk-action-btn:nth-child(2)');
    const heysellerBtn = document.querySelector('.bulk-action-btn:nth-child(3)');
    
    const hasSelection = selectedCollectedProducts.size > 0;
    
    seoBtn.disabled = !hasSelection;
    taobaoBtn.disabled = !hasSelection;
    heysellerBtn.disabled = !hasSelection;
}

// 진행상황 업데이트
function updateProgress(products) {
    const totalCount = products.length;
    const seoCount = products.filter(p => p.seo_title).length;
    const taobaoCount = products.filter(p => p.taobaoMatch).length;
    
    // 상단의 진행 상태 업데이트
    document.getElementById('seoProgress').textContent = `${seoCount}/${totalCount}`;
    document.getElementById('matchProgress').textContent = `${taobaoCount}/${totalCount}`;
}

// 자동 새로고침 설정
function setupAutoRefresh() {
    // 1분마다 수집된 상품 목록 새로고침
    setInterval(async () => {
        const currentUser = JSON.parse(localStorage.getItem('user'));
        if (currentUser && document.getElementById('collectedTab').classList.contains('active')) {
            try {
                const response = await makeRequest(`/get_collected_products?uid=${currentUser.uid}`, {
                    method: 'GET'
                });

                if (response && response.products) {
                    displayCollectedProducts(response.products);
                }
            } catch (error) {
                console.error('자동 새로고침 중 오류:', error);
            }
        }
    }, 60000); // 60초마다
}

// 페이지 로드 시 자동 새로고침 설정
document.addEventListener('DOMContentLoaded', () => {
    setupAutoRefresh();
    loadCollectedProducts(); // 초기 데이터 로드
});

// SEO 생성 함수 수정
async function handleSingleSEO(productId) {
    const currentUser = JSON.parse(localStorage.getItem('user'));
    if (!currentUser) {
        showModal('로그인이 필요합니다.');
        return;
    }

    showLoading();
    try {
        const response = await makeRequest('/generate_seo', {
            method: 'POST',
            body: JSON.stringify({
                uid: currentUser.uid,
                product_id: productId
            })
        });

        if (response) {
            // 수집된 상품 목록 새로고침
            await loadCollectedProducts();
            showModal('SEO 타이틀이 생성되었습니다.');
        }
    } catch (error) {
        showModal(error.message || 'SEO 생성 중 오류가 발생했습니다.');
    } finally {
        hideLoading();
    }
}

// 일괄 SEO 생성
async function handleBulkSEO() {
    if (selectedCollectedProducts.size === 0) {
        showModal('선택된 상품이 없습니다.');
        return;
    }

    const currentUser = JSON.parse(localStorage.getItem('user'));
    if (!currentUser) {
        showModal('로그인이 필요합니다.');
        return;
    }

    showLoading();
    try {
        const response = await makeRequest('/bulk_generate_seo', {
            method: 'POST',
            body: JSON.stringify({
                uid: currentUser.uid,
                product_ids: Array.from(selectedCollectedProducts)
            })
        });

        if (response) {
            await loadCollectedProducts();
            showModal('SEO 타이틀 일괄 생성이 완료되었습니다.');
            selectedCollectedProducts.clear();
            updateCollectButtonStates();
        }
    } catch (error) {
        showModal(error.message || 'SEO 생성 중 오류가 발생했습니다.');
    } finally {
        hideLoading();
    }
}

// 선택된 상품 삭제 함수 수정
async function handleDeleteProducts() {
    if (selectedCollectedProducts.size === 0) {
        showModal('삭제할 상품을 선택해주세요.');
        return;
    }

    if (!confirm('선택한 상품을 삭제하시겠습니까?')) {
        return;
    }

    const currentUser = JSON.parse(localStorage.getItem('user'));
    if (!currentUser) {
        showModal('로그인이 필요합니다.');
        return;
    }

    showLoading();
    try {
        const response = await makeRequest('/delete_products', {
            method: 'POST',
            body: JSON.stringify({
                uid: currentUser.uid,
                product_ids: Array.from(selectedCollectedProducts)
            })
        });

        showModal('선택한 상품이 삭제되었습니다.');
        selectedCollectedProducts.clear();
        // 목록 새로고침
        loadCollectedProducts();
    } catch (error) {
        console.error('상품 삭제 실패:', error);
        showModal(error.message || '상품 삭제 중 오류가 발생했습니다.');
    } finally {
        hideLoading();
    }
}