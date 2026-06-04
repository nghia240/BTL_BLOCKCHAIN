// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title CertificateManager
 * @dev Hợp đồng thông minh quản lý và xác thực bằng cấp trên Blockchain.
 * Chỉ lưu trữ mã Hash (SHA-256) của bằng cấp để tối ưu Gas fee và bảo mật thông tin cá nhân.
 * Chỉ Admin (Trường đại học) mới có quyền cấp và thu hồi bằng.
 */
contract CertificateManager {

    // ============================================================
    //                      CẤU TRÚC DỮ LIỆU
    // ============================================================

    /// @dev Trạng thái của bằng cấp
    enum CertificateStatus {
        NotExist,   // Chưa tồn tại
        Active,     // Đang có hiệu lực
        Revoked     // Đã thu hồi
    }

    /// @dev Cấu trúc dữ liệu lưu trữ thông tin bằng cấp trên chuỗi
    struct Certificate {
        string certificateId;       // Mã định danh duy nhất của bằng cấp
        string studentName;         // Tên sinh viên
        string degree;              // Loại bằng (Cử nhân, Thạc sĩ, Tiến sĩ)
        string major;               // Chuyên ngành
        uint256 issueDate;          // Ngày cấp (Unix timestamp)
        bytes32 contentHash;        // Mã hash SHA-256 của nội dung bằng cấp
        CertificateStatus status;   // Trạng thái bằng
        address issuedBy;           // Địa chỉ ví của người cấp
    }

    // ============================================================
    //                      BIẾN TRẠNG THÁI
    // ============================================================

    /// @dev Địa chỉ Admin (Trường đại học)
    address public admin;

    /// @dev Tên trường đại học
    string public universityName;

    /// @dev Mapping từ certificateId -> Certificate
    mapping(string => Certificate) private certificates;

    /// @dev Danh sách tất cả certificateId đã cấp
    string[] public certificateIds;

    /// @dev Tổng số bằng đã cấp
    uint256 public totalCertificates;

    // ============================================================
    //                         SỰ KIỆN
    // ============================================================

    /// @dev Phát ra khi bằng cấp mới được cấp
    event CertificateIssued(
        string indexed certificateId,
        string studentName,
        string degree,
        uint256 issueDate,
        bytes32 contentHash
    );

    /// @dev Phát ra khi bằng cấp bị thu hồi
    event CertificateRevoked(
        string indexed certificateId,
        uint256 revokeDate
    );

    // ============================================================
    //                       MODIFIER
    // ============================================================

    /// @dev Chỉ Admin mới có quyền thực thi
    modifier onlyAdmin() {
        require(msg.sender == admin, "Chi Admin (Truong dai hoc) moi co quyen thuc hien");
        _;
    }

    /// @dev Kiểm tra bằng cấp tồn tại
    modifier certificateExists(string memory _certId) {
        require(
            certificates[_certId].status != CertificateStatus.NotExist,
            "Bang cap khong ton tai"
        );
        _;
    }

    // ============================================================
    //                      HÀM KHỞI TẠO
    // ============================================================

    /**
     * @dev Khởi tạo hợp đồng, thiết lập Admin là người deploy
     * @param _universityName Tên trường đại học
     */
    constructor(string memory _universityName) {
        admin = msg.sender;
        universityName = _universityName;
    }

    // ============================================================
    //                      HÀM CHÍNH
    // ============================================================

    /**
     * @dev Cấp bằng cấp mới - CHỈ ADMIN
     * @param _certId Mã định danh duy nhất
     * @param _studentName Tên sinh viên
     * @param _degree Loại bằng
     * @param _major Chuyên ngành
     * @param _contentHash Mã hash SHA-256 của nội dung bằng
     */
    function issueCertificate(
        string memory _certId,
        string memory _studentName,
        string memory _degree,
        string memory _major,
        bytes32 _contentHash
    ) external onlyAdmin {
        // Kiểm tra bằng chưa tồn tại
        require(
            certificates[_certId].status == CertificateStatus.NotExist,
            "Ma bang cap da ton tai"
        );

        // Tạo bản ghi bằng cấp mới
        certificates[_certId] = Certificate({
            certificateId: _certId,
            studentName: _studentName,
            degree: _degree,
            major: _major,
            issueDate: block.timestamp,
            contentHash: _contentHash,
            status: CertificateStatus.Active,
            issuedBy: msg.sender
        });

        certificateIds.push(_certId);
        totalCertificates++;

        emit CertificateIssued(_certId, _studentName, _degree, block.timestamp, _contentHash);
    }

    /**
     * @dev Xác thực bằng cấp - AI CÓ THỂ GỌI
     * @param _certId Mã định danh bằng cấp
     * @param _contentHash Mã hash cần xác thực
     * @return isValid Kết quả xác thực (true/false)
     * @return status Trạng thái bằng cấp
     */
    function verifyCertificate(
        string memory _certId,
        bytes32 _contentHash
    ) external view returns (bool isValid, string memory status) {
        Certificate memory cert = certificates[_certId];

        if (cert.status == CertificateStatus.NotExist) {
            return (false, "Khong ton tai");
        }

        if (cert.status == CertificateStatus.Revoked) {
            return (false, "Da thu hoi");
        }

        if (cert.contentHash == _contentHash) {
            return (true, "Hop le - Bang cap chinh thuc");
        } else {
            return (false, "Hash khong khop - Nghi ngo gia mao");
        }
    }

    /**
     * @dev Thu hồi bằng cấp - CHỈ ADMIN
     * @param _certId Mã định danh bằng cấp
     */
    function revokeCertificate(
        string memory _certId
    ) external onlyAdmin certificateExists(_certId) {
        require(
            certificates[_certId].status == CertificateStatus.Active,
            "Bang cap khong o trang thai co hieu luc"
        );

        certificates[_certId].status = CertificateStatus.Revoked;

        emit CertificateRevoked(_certId, block.timestamp);
    }

    /**
     * @dev Truy xuất thông tin bằng cấp
     * @param _certId Mã định danh bằng cấp
     */
    function getCertificate(
        string memory _certId
    ) external view certificateExists(_certId) returns (
        string memory studentName,
        string memory degree,
        string memory major,
        uint256 issueDate,
        bytes32 contentHash,
        CertificateStatus status,
        address issuedBy
    ) {
        Certificate memory cert = certificates[_certId];
        return (
            cert.studentName,
            cert.degree,
            cert.major,
            cert.issueDate,
            cert.contentHash,
            cert.status,
            cert.issuedBy
        );
    }

    /**
     * @dev Kiểm tra trạng thái bằng cấp
     * @param _certId Mã định danh bằng cấp
     * @return Trạng thái hiện tại
     */
    function getCertificateStatus(
        string memory _certId
    ) external view returns (CertificateStatus) {
        return certificates[_certId].status;
    }

    /**
     * @dev Chuyển quyền Admin
     * @param _newAdmin Địa chỉ Admin mới
     */
    function transferAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Dia chi khong hop le");
        admin = _newAdmin;
    }
}
