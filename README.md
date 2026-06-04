# CERTCHAIN

![Solidity](https://img.shields.io/badge/Solidity-%23363636.svg?style=flat-square&logo=solidity&logoColor=white)
![React](https://img.shields.io/badge/React-%2320232a.svg?style=flat-square&logo=react&logoColor=%2361DAFB)
![FastAPI](https://img.shields.io/badge/FastAPI-%23009688.svg?style=flat-square&logo=fastapi&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-%2338B2AC.svg?style=flat-square&logo=tailwind-css&logoColor=white)

Hệ thống quản lý và xác thực văn bằng học thuật phi tập trung dựa trên công nghệ Blockchain.

## 🎨 Poster Dự án

![CertChain Poster](Poster.png)

---

## ⚡ Tính năng cốt lõi (Features)

*   **Dashboard Giám sát 3 Chỉ số**:
    *   *Bằng đã cấp*: Tổng số văn bằng đã phát hành on-chain.
    *   *Đang hiệu lực*: Số văn bằng đang ở trạng thái hoạt động bình thường.
    *   *Lượt xác thực*: Tổng số lượt tra cứu và kiểm tra chéo thành công.
*   **Luồng Điều hướng 4 Phân hệ (Tabs)**:
    *   `Cấp bằng mới`: Giao diện dành riêng cho cơ sở đào tạo (Admin).
    *   `Xác thực bằng`: Công cụ kiểm tra tính toàn vẹn của bằng cấp dành cho nhà tuyển dụng.
    *   `Tra cứu`: Tìm kiếm thông tin chi tiết bằng cấp công khai.
    *   `Thu hồi`: Hủy hiệu lực văn bằng khi phát hiện sai sót/vi phạm (Admin).
*   **Mã hóa Client-Side**:
    *   Tự động băm dữ liệu gốc bằng thuật toán **SHA-256** ngay trên giao diện form trước khi thực hiện giao dịch ghi chuỗi, tối ưu hóa kích thước dữ liệu và bảo mật thông tin cá nhân.
*   **Tích hợp Ví Web3**:
    *   Nút kết nối ví MetaMask (Web3 Provider) tích hợp trực tiếp tại Header để xác thực danh tính và quyền điều hành của nhà trường.

---

## 🏗️ Kiến trúc Hệ thống (Architecture)

```text
┌────────────────────────────────────────────────────────┐
│                      FRONTEND                          │
│        React dApp + Tailwind CSS + Ethers.js           │
└──────────────────────────┬─────────────────────────────┘
                           │
                           │ (1) Gửi thông tin gốc
                           ▼
┌────────────────────────────────────────────────────────┐
│                      BACKEND                           │
│        FastAPI (Tính toán mã băm SHA-256)             │
└──────────────────────────┬─────────────────────────────┘
                           │
                           │ (2) Trả về bytes32 hash
                           ▼
┌────────────────────────────────────────────────────────┐
│                     BLOCKCHAIN                         │
│     Solidity Smart Contract (Soulbound Token - SBT)    │
└──────────────────────────┬─────────────────────────────┘
                           │
                           │ (3) Lưu trữ metadata & hash
                           ▼
┌────────────────────────────────────────────────────────┐
│                      STORAGE                           │
│                 IPFS Phi tập trung                     │
└────────────────────────────────────────────────────────┘
```

---

## 🪙 Thiết kế Gas & Phí Giao dịch (Token Economics)

| Hành động | Loại giao dịch | Phí Gas (ETH) | Cơ chế thực thi |
| :--- | :--- | :--- | :--- |
| **Xác thực / Tra cứu** | `read` (View Function) | **0 ETH** | Truy vấn trực tiếp từ Local Node / RPC, không đổi trạng thái mạng. |
| **Cấp bằng / Thu hồi** | `write` (State Mutation) | **Cực nhỏ** | Thực hiện giao dịch `mint`/`burn` token phi chuyển nhượng (SBT) trên mạng Testnet. |

---

## 🚀 Cài đặt Nhanh (Quick Start)

### 1. Khởi chạy Smart Contract (Hardhat Node)
```bash
# Cài đặt dependencies và khởi chạy mạng blockchain local
npm install
npx hardhat node

# Deploy smart contract lên local network
npx hardhat run scripts/deploy.js --network localhost
```

### 2. Khởi chạy Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. Khởi chạy Frontend (React)
```bash
cd frontend
npm install
npm run dev
```
