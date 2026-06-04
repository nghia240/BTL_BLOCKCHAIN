# KỊCH BẢN NỘI DUNG POSTER KHOA HỌC: CERTCHAIN

**Khổ poster:** A4 / A0 Dọc (Định dạng phân cột kỹ thuật súc tích)

---

## 1. Đặt Vấn Đề & Giải Pháp (Problem & Solution)
*   **Thực trạng:**
    *   Văn bằng giấy/PDF dễ chỉnh sửa, tẩy xóa và làm giả.
    *   Quy trình xác minh thủ công tốn thời gian (5–15 ngày), chi phí cao.
    *   Cơ sở dữ liệu tập trung dễ bị tấn công sửa đổi trực tiếp.
*   **Giải pháp CertChain:**
    *   Mã hóa thông tin bằng cấp thành mã băm mật mã học (**SHA-256**) duy nhất.
    *   Lưu trữ mã băm on-chain trên mạng lưới phi tập trung Ethereum.
    *   Cơ chế xác thực không tốn gas (**0 ETH**), thời gian xử lý **< 3 giây**.

---

## 2. Kiến Trúc Hệ Thống (System Architecture)
Mô hình kiến trúc chia làm **4 tầng công nghệ**:

| Tầng (Layer) | Công nghệ tích hợp | Vai trò / Nhiệm vụ chính |
| :--- | :--- | :--- |
| **L1: Frontend** | React, TailwindCSS, Ethers.js | Giao diện người dùng, kết nối ví MetaMask |
| **L2: Hashing client** | SHA-256 (Web Crypto API) | Băm dữ liệu văn bằng trên Form trước khi ký |
| **L3: Blockchain** | Solidity Smart Contract, Hardhat | Xử lý logic nghiệp vụ cấp phát, thu hồi |
| **L4: Storage** | EVM Mapping & IPFS Metadata | Lưu trữ mã băm vĩnh viễn, bất biến |

---

## 3. Quy Trình Vận Hành (Workflow)

```text
[Nhập Form Web] ──► [Băm SHA-256 Client] ──► [Ký Ví MetaMask] ──► [Ghi Lên Blockchain (SBT)]
                                                                           │
   ┌───────────────────────────────────────────────────────────────────────┘
   ▼
[Xác Thực 0 Gas] ◄── [So Khớp Hash On-chain] ◄── [Nhập Mã Bằng Tra Cứu]
```

1.  **Cấp phát:** Admin điền form ──► Mã băm SHA-256 được sinh tự động ──► MetaMask yêu cầu ký giao dịch ──► Ghi thông tin lên Smart Contract dưới dạng Soulbound Token (SBT).
2.  **Xác thực:** Người dùng tải lên văn bằng/nhập mã bằng ──► Trình duyệt băm dữ liệu và gọi hàm `verifyCertificate` (View) ──► So khớp mã băm on-chain ──► Trả về kết quả (Hợp lệ / Đã thu hồi / Không tồn tại).

---

## 4. Giao Diện & Chỉ Số Vận Hành (UI Mockup & Metrics)
*   **Giao diện điều hướng 4 Tab:** `Cấp bằng` | `Xác thực` | `Tra cứu` | `Thu hồi`.
*   **Dashboard Giám sát:**
    *   `Bằng đã cấp`: Tổng số văn bằng phát hành thành công.
    *   `Đang hiệu lực`: Trạng thái văn bằng hợp pháp.
    *   `Lượt xác thực`: Thống kê tần suất truy vấn.

---

## 5. Kết Luận & Hướng Phát Triển (Conclusion & Future Work)
*   **Kết luận:** Hệ thống giải quyết bài toán chống giả mạo văn bằng với chi phí vận hành tối ưu, độ an toàn tuyệt đối và quy trình tự động hóa hoàn toàn.
*   **Hướng phát triển:**
    *   Ứng dụng **Zero-Knowledge Proofs (ZKP)** để xác minh thông tin không lộ danh tính.
    *   Chuyển dịch lên các giải pháp **Ethereum Layer-2 (Optimism/Arbitrum)** tối ưu phí gas mint.
