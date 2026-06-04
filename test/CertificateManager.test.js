const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CertificateManager", function () {
  let contract;
  let admin, user1, user2;

  beforeEach(async function () {
    [admin, user1, user2] = await ethers.getSigners();
    const CertificateManager = await ethers.getContractFactory("CertificateManager");
    contract = await CertificateManager.deploy("DH Cong nghe Thong tin");
    await contract.waitForDeployment();
  });

  // ============================================================
  //  KHỞI TẠO
  // ============================================================
  describe("Khởi tạo", function () {
    it("Nên thiết lập đúng Admin", async function () {
      expect(await contract.admin()).to.equal(admin.address);
    });

    it("Nên thiết lập đúng tên trường", async function () {
      expect(await contract.universityName()).to.equal("DH Cong nghe Thong tin");
    });

    it("Tổng số bằng ban đầu phải bằng 0", async function () {
      expect(await contract.totalCertificates()).to.equal(0);
    });
  });

  // ============================================================
  //  CẤP BẰNG (issueCertificate)
  // ============================================================
  describe("Cấp bằng (issueCertificate)", function () {
    it("Admin cấp bằng thành công", async function () {
      const hash = ethers.keccak256(ethers.toUtf8Bytes("test-cert-data"));
      await expect(
        contract.issueCertificate("CERT001", "Nguyen Van A", "Cu nhan", "CNTT", hash)
      ).to.emit(contract, "CertificateIssued");

      expect(await contract.totalCertificates()).to.equal(1);
    });

    it("Không cho phép người khác cấp bằng", async function () {
      const hash = ethers.keccak256(ethers.toUtf8Bytes("test-cert-data"));
      await expect(
        contract.connect(user1).issueCertificate("CERT002", "Tran Van B", "Cu nhan", "CNTT", hash)
      ).to.be.revertedWith("Chi Admin (Truong dai hoc) moi co quyen thuc hien");
    });

    it("Không cho phép cấp trùng mã bằng", async function () {
      const hash = ethers.keccak256(ethers.toUtf8Bytes("data"));
      await contract.issueCertificate("CERT001", "Nguyen Van A", "Cu nhan", "CNTT", hash);
      await expect(
        contract.issueCertificate("CERT001", "Tran Van B", "Thac si", "CNTT", hash)
      ).to.be.revertedWith("Ma bang cap da ton tai");
    });

    it("Cấp nhiều bằng liên tiếp - đếm chính xác", async function () {
      const hash1 = ethers.keccak256(ethers.toUtf8Bytes("data1"));
      const hash2 = ethers.keccak256(ethers.toUtf8Bytes("data2"));
      const hash3 = ethers.keccak256(ethers.toUtf8Bytes("data3"));

      await contract.issueCertificate("CERT001", "Nguyen Van A", "Cu nhan", "CNTT", hash1);
      await contract.issueCertificate("CERT002", "Tran Van B", "Thac si", "DTVT", hash2);
      await contract.issueCertificate("CERT003", "Le Van C", "Tien si", "KHMT", hash3);

      expect(await contract.totalCertificates()).to.equal(3);
    });
  });

  // ============================================================
  //  XÁC THỰC (verifyCertificate)
  // ============================================================
  describe("Xác thực bằng (verifyCertificate)", function () {
    const certContent = "Nguyen Van A - Cu nhan CNTT - DH CNTT - 2024";
    let contentHash;

    beforeEach(async function () {
      contentHash = ethers.keccak256(ethers.toUtf8Bytes(certContent));
      await contract.issueCertificate("CERT001", "Nguyen Van A", "Cu nhan", "CNTT", contentHash);
    });

    it("✅ Xác thực thành công với hash đúng", async function () {
      const [isValid, status] = await contract.verifyCertificate("CERT001", contentHash);
      expect(isValid).to.be.true;
      expect(status).to.equal("Hop le - Bang cap chinh thuc");
    });

    it("❌ Phát hiện hash không khớp (bằng giả mạo)", async function () {
      const fakeHash = ethers.keccak256(ethers.toUtf8Bytes("Noi dung gia mao"));
      const [isValid, status] = await contract.verifyCertificate("CERT001", fakeHash);
      expect(isValid).to.be.false;
      expect(status).to.equal("Hash khong khop - Nghi ngo gia mao");
    });

    it("❌ Báo không tồn tại với mã bằng sai", async function () {
      const [isValid, status] = await contract.verifyCertificate("INVALID-ID", contentHash);
      expect(isValid).to.be.false;
      expect(status).to.equal("Khong ton tai");
    });

    it("❌ Xác thực bằng đã thu hồi - phát hiện không hợp lệ", async function () {
      await contract.revokeCertificate("CERT001");
      const [isValid, status] = await contract.verifyCertificate("CERT001", contentHash);
      expect(isValid).to.be.false;
      expect(status).to.equal("Da thu hoi");
    });

    it("Ai cũng có thể xác thực (không cần quyền Admin)", async function () {
      const [isValid, status] = await contract.connect(user1).verifyCertificate("CERT001", contentHash);
      expect(isValid).to.be.true;
      expect(status).to.equal("Hop le - Bang cap chinh thuc");
    });

    it("Thay đổi 1 ký tự nội dung → hash khác → phát hiện giả mạo", async function () {
      const modifiedContent = "Nguyen Van A - Cu nhan CNTT - DH CNTT - 2025"; // đổi 2024 -> 2025
      const modifiedHash = ethers.keccak256(ethers.toUtf8Bytes(modifiedContent));
      const [isValid, status] = await contract.verifyCertificate("CERT001", modifiedHash);
      expect(isValid).to.be.false;
      expect(status).to.equal("Hash khong khop - Nghi ngo gia mao");
    });
  });

  // ============================================================
  //  TRA CỨU (getCertificate)
  // ============================================================
  describe("Tra cứu bằng (getCertificate)", function () {
    const certContent = "Le Thi D - Ky su DTVT - DH Bach Khoa - 2024";
    let contentHash;

    beforeEach(async function () {
      contentHash = ethers.keccak256(ethers.toUtf8Bytes(certContent));
      await contract.issueCertificate("CERT-BK-001", "Le Thi D", "Ky su", "DTVT", contentHash);
    });

    it("✅ Tra cứu thành công - trả về đúng thông tin", async function () {
      const result = await contract.getCertificate("CERT-BK-001");
      expect(result.studentName).to.equal("Le Thi D");
      expect(result.degree).to.equal("Ky su");
      expect(result.major).to.equal("DTVT");
      expect(result.contentHash).to.equal(contentHash);
      expect(result.status).to.equal(1); // Active
      expect(result.issuedBy).to.equal(admin.address);
    });

    it("✅ Ngày cấp phải hợp lệ (> 0)", async function () {
      const result = await contract.getCertificate("CERT-BK-001");
      expect(result.issueDate).to.be.gt(0);
    });

    it("✅ Người cấp phải là Admin", async function () {
      const result = await contract.getCertificate("CERT-BK-001");
      expect(result.issuedBy).to.equal(admin.address);
    });

    it("❌ Tra cứu mã không tồn tại - revert lỗi", async function () {
      await expect(
        contract.getCertificate("KHONG-TON-TAI")
      ).to.be.revertedWith("Bang cap khong ton tai");
    });

    it("✅ Ai cũng có thể tra cứu (không cần Admin)", async function () {
      const result = await contract.connect(user2).getCertificate("CERT-BK-001");
      expect(result.studentName).to.equal("Le Thi D");
    });

    it("✅ Tra cứu bằng đã thu hồi - vẫn hiển thị (status = Revoked)", async function () {
      await contract.revokeCertificate("CERT-BK-001");
      const result = await contract.getCertificate("CERT-BK-001");
      expect(result.studentName).to.equal("Le Thi D");
      expect(result.status).to.equal(2); // Revoked
    });

    it("✅ Kiểm tra trạng thái qua getCertificateStatus", async function () {
      // Trước khi thu hồi
      expect(await contract.getCertificateStatus("CERT-BK-001")).to.equal(1); // Active

      // Sau khi thu hồi
      await contract.revokeCertificate("CERT-BK-001");
      expect(await contract.getCertificateStatus("CERT-BK-001")).to.equal(2); // Revoked
    });

    it("✅ getCertificateStatus cho mã không tồn tại = NotExist (0)", async function () {
      expect(await contract.getCertificateStatus("KHONG-CO")).to.equal(0); // NotExist
    });
  });

  // ============================================================
  //  THU HỒI (revokeCertificate)
  // ============================================================
  describe("Thu hồi bằng (revokeCertificate)", function () {
    let contentHash;

    beforeEach(async function () {
      contentHash = ethers.keccak256(ethers.toUtf8Bytes("data-thu-hoi"));
      await contract.issueCertificate("CERT-RV-001", "Pham Van E", "Cu nhan", "QTKD", contentHash);
    });

    it("✅ Admin thu hồi bằng thành công", async function () {
      await expect(contract.revokeCertificate("CERT-RV-001"))
        .to.emit(contract, "CertificateRevoked");

      expect(await contract.getCertificateStatus("CERT-RV-001")).to.equal(2); // Revoked
    });

    it("✅ Sau thu hồi - xác thực trả về 'Đã thu hồi'", async function () {
      await contract.revokeCertificate("CERT-RV-001");
      const [isValid, status] = await contract.verifyCertificate("CERT-RV-001", contentHash);
      expect(isValid).to.be.false;
      expect(status).to.equal("Da thu hoi");
    });

    it("✅ Sau thu hồi - tra cứu vẫn trả về thông tin (status = 2)", async function () {
      await contract.revokeCertificate("CERT-RV-001");
      const result = await contract.getCertificate("CERT-RV-001");
      expect(result.studentName).to.equal("Pham Van E");
      expect(result.status).to.equal(2);
    });

    it("❌ Không cho phép người khác thu hồi", async function () {
      await expect(
        contract.connect(user1).revokeCertificate("CERT-RV-001")
      ).to.be.revertedWith("Chi Admin (Truong dai hoc) moi co quyen thuc hien");
    });

    it("❌ Không thể thu hồi bằng không tồn tại", async function () {
      await expect(
        contract.revokeCertificate("KHONG-CO")
      ).to.be.revertedWith("Bang cap khong ton tai");
    });

    it("❌ Không thể thu hồi bằng đã thu hồi rồi (thu hồi 2 lần)", async function () {
      await contract.revokeCertificate("CERT-RV-001");
      await expect(
        contract.revokeCertificate("CERT-RV-001")
      ).to.be.revertedWith("Bang cap khong o trang thai co hieu luc");
    });

    it("✅ Thu hồi không ảnh hưởng đến bằng khác", async function () {
      const hash2 = ethers.keccak256(ethers.toUtf8Bytes("data-khac"));
      await contract.issueCertificate("CERT-RV-002", "Hoang Van F", "Thac si", "CNTT", hash2);

      // Thu hồi bằng 001
      await contract.revokeCertificate("CERT-RV-001");

      // Bằng 002 vẫn hợp lệ
      const [isValid, status] = await contract.verifyCertificate("CERT-RV-002", hash2);
      expect(isValid).to.be.true;
      expect(status).to.equal("Hop le - Bang cap chinh thuc");

      // Bằng 001 đã thu hồi
      expect(await contract.getCertificateStatus("CERT-RV-001")).to.equal(2);
      expect(await contract.getCertificateStatus("CERT-RV-002")).to.equal(1);
    });
  });

  // ============================================================
  //  KỊCH BẢN TỔNG HỢP (End-to-End)
  // ============================================================
  describe("Kịch bản tổng hợp (E2E)", function () {
    it("Luồng hoàn chỉnh: Cấp → Xác thực → Tra cứu → Thu hồi → Xác thực lại", async function () {
      const content = "Tran Minh G - Cu nhan CNTT - 2024 - DH CNTT";
      const hash = ethers.keccak256(ethers.toUtf8Bytes(content));

      // 1. Cấp bằng
      await contract.issueCertificate("E2E-001", "Tran Minh G", "Cu nhan", "CNTT", hash);
      expect(await contract.totalCertificates()).to.equal(1);

      // 2. Xác thực → Hợp lệ
      let [isValid, status] = await contract.verifyCertificate("E2E-001", hash);
      expect(isValid).to.be.true;
      expect(status).to.equal("Hop le - Bang cap chinh thuc");

      // 3. Tra cứu → Đầy đủ thông tin
      const info = await contract.getCertificate("E2E-001");
      expect(info.studentName).to.equal("Tran Minh G");
      expect(info.degree).to.equal("Cu nhan");
      expect(info.major).to.equal("CNTT");
      expect(info.status).to.equal(1);

      // 4. Thu hồi
      await contract.revokeCertificate("E2E-001");

      // 5. Xác thực lại → Đã thu hồi
      [isValid, status] = await contract.verifyCertificate("E2E-001", hash);
      expect(isValid).to.be.false;
      expect(status).to.equal("Da thu hoi");

      // 6. Tra cứu sau thu hồi → vẫn có info nhưng status = Revoked
      const info2 = await contract.getCertificate("E2E-001");
      expect(info2.studentName).to.equal("Tran Minh G");
      expect(info2.status).to.equal(2);
    });
  });
});
