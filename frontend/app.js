// ============================================================
//  CertChain - Frontend Application
//  Kết nối MetaMask, tương tác Smart Contract qua Ethers.js
// ============================================================

// --- ABI của Smart Contract (chỉ các hàm cần thiết) ---
const CONTRACT_ABI = [
    "function admin() view returns (address)",
    "function universityName() view returns (string)",
    "function totalCertificates() view returns (uint256)",
    "function issueCertificate(string _certId, string _studentName, string _degree, string _major, bytes32 _contentHash)",
    "function verifyCertificate(string _certId, bytes32 _contentHash) view returns (bool isValid, string status)",
    "function revokeCertificate(string _certId)",
    "function getCertificate(string _certId) view returns (string studentName, string degree, string major, uint256 issueDate, bytes32 contentHash, uint8 status, address issuedBy)",
    "function getCertificateStatus(string _certId) view returns (uint8)",
    "event CertificateIssued(string indexed certificateId, string studentName, string degree, uint256 issueDate, bytes32 contentHash)",
    "event CertificateRevoked(string indexed certificateId, uint256 revokeDate)"
];

// --- Biến toàn cục ---
let provider = null;
let signer = null;
let contract = null;
let contractAddress = null;
let isConnected = false;

// --- Khởi tạo ---
document.addEventListener("DOMContentLoaded", () => {
    initTabs();
    initForms();
    initHashPreview();
    loadContractAddress();
});

// ============================================================
//  LOAD CONTRACT ADDRESS
// ============================================================
async function loadContractAddress() {
    try {
        const res = await fetch("contract-address.json");
        const data = await res.json();
        contractAddress = data.contractAddress;
        console.log("Contract address loaded:", contractAddress);
    } catch (e) {
        console.warn("Chưa deploy contract. Hãy chạy: npx hardhat run scripts/deploy.js --network localhost");
    }
}

// ============================================================
//  WALLET CONNECTION
// ============================================================
document.getElementById("btn-connect-wallet").addEventListener("click", connectWallet);

async function connectWallet() {
    if (typeof window.ethereum === "undefined") {
        showToast("Vui lòng cài đặt MetaMask!", "error");
        return;
    }

    try {
        const btn = document.getElementById("btn-connect-wallet");
        btn.innerHTML = '<span class="spinner"></span> Đang kết nối...';
        btn.disabled = true;

        // Yêu cầu chuyển sang mạng Hardhat Local (chainId 31337)
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x7A69' }],
            });
        } catch (switchError) {
            // Nếu mạng chưa có trong MetaMask thì thêm mới
            if (switchError.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: '0x7A69',
                        chainName: 'Hardhat Local',
                        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                        rpcUrls: ['http://127.0.0.1:8545'],
                    }],
                });
            } else {
                throw switchError;
            }
        }

        provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        signer = provider.getSigner();
        const address = await signer.getAddress();

        if (contractAddress) {
            contract = new ethers.Contract(contractAddress, CONTRACT_ABI, signer);
            await updateStats();
        }

        // Cập nhật UI
        btn.classList.add("hidden");
        const walletInfo = document.getElementById("wallet-info");
        walletInfo.classList.remove("hidden");
        document.getElementById("wallet-address").textContent =
            address.slice(0, 6) + "..." + address.slice(-4);

        isConnected = true;
        showToast("Kết nối ví thành công!", "success");
        addTxLog("🔗", "Kết nối ví", `Địa chỉ: ${address.slice(0, 10)}...`, "info");

    } catch (err) {
        showToast("Lỗi kết nối: " + err.message, "error");
        const btn = document.getElementById("btn-connect-wallet");
        btn.innerHTML = '<span class="btn-icon">🦊</span> Kết nối Ví';
        btn.disabled = false;
    }
}

// Lắng nghe sự kiện thay đổi tài khoản
if (window.ethereum) {
    window.ethereum.on("accountsChanged", () => location.reload());
    window.ethereum.on("chainChanged", () => location.reload());
}

// ============================================================
//  TAB NAVIGATION
// ============================================================
function initTabs() {
    document.querySelectorAll(".tab").forEach(tab => {
        tab.addEventListener("click", () => {
            // Deactivate all
            document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
            document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
            // Activate selected
            tab.classList.add("active");
            const panelId = "panel-" + tab.dataset.tab;
            document.getElementById(panelId).classList.add("active");
        });
    });
}

// ============================================================
//  HASH PREVIEW (real-time SHA-256)
// ============================================================
function initHashPreview() {
    const input = document.getElementById("input-content");
    const hashDisplay = document.getElementById("hash-value");

    input.addEventListener("input", async () => {
        const text = input.value.trim();
        if (!text) {
            hashDisplay.textContent = "Chưa có dữ liệu";
            return;
        }
        const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(text));
        hashDisplay.textContent = hash;
    });
}

// ============================================================
//  FORM HANDLERS
// ============================================================
function initForms() {
    // Issue
    document.getElementById("form-issue").addEventListener("submit", handleIssue);
    // Verify
    document.getElementById("form-verify").addEventListener("submit", handleVerify);
    // Lookup
    document.getElementById("form-lookup").addEventListener("submit", handleLookup);
    // Revoke
    document.getElementById("form-revoke").addEventListener("submit", handleRevoke);
}

// --- CẤP BẰNG ---
async function handleIssue(e) {
    e.preventDefault();
    if (!checkConnection()) return;

    const certId = document.getElementById("input-cert-id").value.trim();
    const studentName = document.getElementById("input-student-name").value.trim();
    const degree = document.getElementById("input-degree").value;
    const major = document.getElementById("input-major").value.trim();
    const content = document.getElementById("input-content").value.trim();

    if (!certId || !studentName || !degree || !major || !content) {
        showToast("Vui lòng điền đầy đủ thông tin!", "error");
        return;
    }

    const contentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(content));
    const btn = document.getElementById("btn-issue");

    try {
        btn.innerHTML = '<span class="spinner"></span> Đang xử lý giao dịch...';
        btn.disabled = true;

        const tx = await contract.issueCertificate(certId, studentName, degree, major, contentHash);
        showToast("Giao dịch đã gửi. Đang chờ xác nhận...", "info");
        await tx.wait();

        showToast(`Cấp bằng thành công! Mã: ${certId}`, "success");
        addTxLog("📜", `Cấp bằng: ${certId}`, `SV: ${studentName} - ${degree} ${major}`, "issue");
        await updateStats();

        // Reset form
        document.getElementById("form-issue").reset();
        document.getElementById("hash-value").textContent = "Chưa có dữ liệu";

    } catch (err) {
        showToast("Lỗi: " + parseError(err), "error");
    } finally {
        btn.innerHTML = '<span class="btn-icon">⛓️</span> Cấp bằng & Lưu lên Blockchain';
        btn.disabled = false;
    }
}

// --- XÁC THỰC ---
async function handleVerify(e) {
    e.preventDefault();
    if (!checkConnection()) return;

    const certId = document.getElementById("input-verify-id").value.trim();
    const content = document.getElementById("input-verify-content").value.trim();
    const resultBox = document.getElementById("verify-result");

    if (!certId || !content) {
        showToast("Vui lòng điền đầy đủ thông tin!", "error");
        return;
    }

    const contentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(content));
    const btn = document.getElementById("btn-verify");

    try {
        btn.innerHTML = '<span class="spinner"></span> Đang xác thực...';
        btn.disabled = true;

        const [isValid, status] = await contract.verifyCertificate(certId, contentHash);

        resultBox.classList.remove("hidden", "success", "error", "info");
        resultBox.classList.add(isValid ? "success" : "error");
        resultBox.innerHTML = `
            <div class="result-title ${isValid ? 'valid' : 'invalid'}">
                ${isValid ? '✅ BẰNG CẤP HỢP LỆ' : '❌ BẰNG CẤP KHÔNG HỢP LỆ'}
            </div>
            <div class="result-details">
                <div class="result-row">
                    <span class="result-label">Mã bằng:</span>
                    <span class="result-value">${certId}</span>
                </div>
                <div class="result-row">
                    <span class="result-label">Trạng thái:</span>
                    <span class="result-value">${status}</span>
                </div>
                <div class="result-row">
                    <span class="result-label">Hash kiểm tra:</span>
                    <span class="result-value">${contentHash.slice(0, 20)}...</span>
                </div>
            </div>
        `;

        addTxLog("🔍", `Xác thực: ${certId}`, isValid ? "Hợp lệ ✅" : "Không hợp lệ ❌", "verify");

    } catch (err) {
        showToast("Lỗi: " + parseError(err), "error");
    } finally {
        btn.innerHTML = '<span class="btn-icon">🔍</span> Xác thực ngay';
        btn.disabled = false;
    }
}

// --- TRA CỨU ---
async function handleLookup(e) {
    e.preventDefault();
    if (!checkConnection()) return;

    const certId = document.getElementById("input-lookup-id").value.trim();
    const resultBox = document.getElementById("lookup-result");

    if (!certId) { showToast("Vui lòng nhập mã bằng!", "error"); return; }

    const btn = document.getElementById("btn-lookup");

    try {
        btn.innerHTML = '<span class="spinner"></span> Đang tra cứu...';
        btn.disabled = true;

        const result = await contract.getCertificate(certId);
        const statusNames = ["Không tồn tại", "Có hiệu lực", "Đã thu hồi"];
        const statusClasses = ["", "active", "revoked"];
        const statusIdx = result.status;
        const issueDate = new Date(result.issueDate.toNumber() * 1000);

        resultBox.classList.remove("hidden", "success", "error", "info");
        resultBox.classList.add("info");
        resultBox.innerHTML = `
            <div class="result-title neutral">📋 Thông tin bằng cấp</div>
            <div class="result-details">
                <div class="result-row">
                    <span class="result-label">Mã bằng:</span>
                    <span class="result-value">${certId}</span>
                </div>
                <div class="result-row">
                    <span class="result-label">Sinh viên:</span>
                    <span class="result-value">${result.studentName}</span>
                </div>
                <div class="result-row">
                    <span class="result-label">Loại bằng:</span>
                    <span class="result-value">${result.degree}</span>
                </div>
                <div class="result-row">
                    <span class="result-label">Chuyên ngành:</span>
                    <span class="result-value">${result.major}</span>
                </div>
                <div class="result-row">
                    <span class="result-label">Ngày cấp:</span>
                    <span class="result-value">${issueDate.toLocaleDateString('vi-VN')} ${issueDate.toLocaleTimeString('vi-VN')}</span>
                </div>
                <div class="result-row">
                    <span class="result-label">Hash nội dung:</span>
                    <span class="result-value" style="font-family:monospace;font-size:0.75rem">${result.contentHash}</span>
                </div>
                <div class="result-row">
                    <span class="result-label">Trạng thái:</span>
                    <span class="result-value"><span class="status-badge ${statusClasses[statusIdx]}">${statusNames[statusIdx]}</span></span>
                </div>
                <div class="result-row">
                    <span class="result-label">Cấp bởi:</span>
                    <span class="result-value" style="font-family:monospace;font-size:0.78rem">${result.issuedBy}</span>
                </div>
            </div>
        `;

    } catch (err) {
        resultBox.classList.remove("hidden", "success", "info");
        resultBox.classList.add("error");
        resultBox.innerHTML = `
            <div class="result-title invalid">❌ Không tìm thấy</div>
            <p style="color:var(--text-secondary);font-size:0.9rem">Mã bằng "${certId}" không tồn tại trên Blockchain.</p>
        `;
    } finally {
        btn.innerHTML = '<span class="btn-icon">📋</span> Tra cứu';
        btn.disabled = false;
    }
}

// --- THU HỒI ---
async function handleRevoke(e) {
    e.preventDefault();
    if (!checkConnection()) return;

    const certId = document.getElementById("input-revoke-id").value.trim();
    const resultBox = document.getElementById("revoke-result");

    if (!certId) { showToast("Vui lòng nhập mã bằng!", "error"); return; }

    if (!confirm(`Bạn có chắc muốn THU HỒI bằng cấp "${certId}"?\nThao tác này KHÔNG THỂ hoàn tác!`)) return;

    const btn = document.getElementById("btn-revoke");

    try {
        btn.innerHTML = '<span class="spinner"></span> Đang thu hồi...';
        btn.disabled = true;

        const tx = await contract.revokeCertificate(certId);
        showToast("Giao dịch đã gửi. Đang chờ xác nhận...", "info");
        await tx.wait();

        resultBox.classList.remove("hidden", "success", "info");
        resultBox.classList.add("error");
        resultBox.innerHTML = `
            <div class="result-title invalid">🚫 Đã thu hồi thành công</div>
            <p style="color:var(--text-secondary)">Bằng cấp mã "${certId}" đã bị thu hồi và không còn hiệu lực.</p>
        `;

        showToast(`Thu hồi bằng ${certId} thành công!`, "success");
        addTxLog("🚫", `Thu hồi: ${certId}`, "Bằng cấp đã bị vô hiệu hóa", "revoke");
        await updateStats();

    } catch (err) {
        showToast("Lỗi: " + parseError(err), "error");
    } finally {
        btn.innerHTML = '<span class="btn-icon">🚫</span> Thu hồi bằng cấp';
        btn.disabled = false;
    }
}

// ============================================================
//  UTILITIES
// ============================================================

function checkConnection() {
    if (!isConnected || !contract) {
        showToast("Vui lòng kết nối ví MetaMask trước!", "error");
        return false;
    }
    return true;
}

async function updateStats() {
    try {
        const total = await contract.totalCertificates();
        document.getElementById("stat-total").textContent = total.toString();
        document.getElementById("stat-active").textContent = total.toString();
    } catch (e) {
        console.error("Lỗi cập nhật stats:", e);
    }
}

function parseError(err) {
    if (err.reason) return err.reason;
    if (err.data && err.data.message) return err.data.message;
    if (err.message && err.message.includes("reverted")) {
        const match = err.message.match(/reason string '(.+?)'/);
        if (match) return match[1];
    }
    return err.message || "Lỗi không xác định";
}

function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    const icons = { success: "✅", error: "❌", info: "ℹ️" };
    toast.innerHTML = `<span>${icons[type] || "ℹ️"}</span><span class="toast-msg">${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(60px)";
        toast.style.transition = "all 0.3s ease";
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function addTxLog(icon, title, sub, type) {
    const log = document.getElementById("tx-log");
    const empty = log.querySelector(".tx-empty");
    if (empty) empty.remove();

    const item = document.createElement("div");
    item.className = "tx-item";
    const now = new Date().toLocaleTimeString("vi-VN");
    item.innerHTML = `
        <div class="tx-icon ${type}">${icon}</div>
        <div class="tx-info">
            <div class="tx-title">${title}</div>
            <div class="tx-sub">${sub}</div>
        </div>
        <div class="tx-time">${now}</div>
    `;
    log.insertBefore(item, log.firstChild);
}