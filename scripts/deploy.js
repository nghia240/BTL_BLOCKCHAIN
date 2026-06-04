const hre = require("hardhat");

async function main() {
  console.log("=== BẮT ĐẦU DEPLOY SMART CONTRACT ===\n");

  const universityName = "Trường Đại học Công nghệ Thông tin";

  // Deploy contract
  const CertificateManager = await hre.ethers.getContractFactory("CertificateManager");
  const contract = await CertificateManager.deploy(universityName);
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();

  console.log(`Tên trường: ${universityName}`);
  console.log(`Contract deployed tại: ${contractAddress}`);
  console.log(`Admin (Deployer): ${(await hre.ethers.getSigners())[0].address}`);
  console.log("\n=== DEPLOY THÀNH CÔNG ===");

  // Ghi địa chỉ contract ra file để frontend sử dụng
  const fs = require("fs");
  const deployData = {
    contractAddress: contractAddress,
    universityName: universityName,
    network: hre.network.name,
    deployedAt: new Date().toISOString()
  };

  fs.writeFileSync(
    "frontend/contract-address.json",
    JSON.stringify(deployData, null, 2)
  );
  console.log("\nĐã lưu địa chỉ contract vào frontend/contract-address.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
