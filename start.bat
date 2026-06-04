@echo off
title CertChain - Blockchain Certificate System

echo.
echo ========================================================
echo    CertChain - He thong Xac thuc Bang cap Blockchain
echo    Truong Dai hoc Cong nghe Thong tin
echo ========================================================
echo.

:: Kiem tra Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [LOI] Chua cai dat Node.js!
    echo       Tai tai: https://nodejs.org
    pause
    exit /b 1
)

:: Kiem tra node_modules
if not exist "node_modules" (
    echo [1/4] Dang cai dat dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [LOI] Cai dat dependencies that bai!
        pause
        exit /b 1
    )
    echo       Da cai dat xong!
) else (
    echo [1/4] Dependencies da san sang.
)

:: Compile Smart Contract
echo [2/4] Dang compile Smart Contract...
call npx hardhat compile 2>nul
echo       Compile thanh cong!

:: Giai phong port 8545 va 3000 neu dang bi chiem
echo [3/4] Dang khoi dong Hardhat Local Blockchain...
echo       Kiem tra port...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8545.*LISTENING"') do taskkill /f /pid %%a >nul 2>nul
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3000.*LISTENING"') do taskkill /f /pid %%a >nul 2>nul
ping 127.0.0.1 -n 3 >nul

:: Khoi chay Hardhat Node trong cua so moi
start "Hardhat Node" cmd /c "cd /d %~dp0 && npx hardhat node"

:: Cho node khoi dong du
echo       Cho Hardhat Node khoi dong...
ping 127.0.0.1 -n 7 >nul

:: Deploy Smart Contract
echo [4/4] Dang deploy Smart Contract...
call npx hardhat run scripts/deploy.js --network localhost 2>nul

:: Kiem tra deploy thanh cong bang cach doc file contract-address.json
findstr /c:"contractAddress" frontend\contract-address.json >nul 2>nul
if %errorlevel% neq 0 (
    echo [LOI] Deploy Smart Contract that bai!
    echo       Dam bao Hardhat Node dang chay.
    pause
    exit /b 1
)

echo.
echo ========================================================
echo   KHOI DONG THANH CONG!
echo ========================================================
echo.
echo   Blockchain:  http://127.0.0.1:8545
echo   Frontend:    http://127.0.0.1:3000
echo.
echo   Huong dan:
echo     1. Mo MetaMask, ket noi mang Hardhat Local
echo     2. Import account voi Private Key cua Account #0
echo     3. Su dung giao dien web de cap/xac thuc/tra cuu bang
echo.
echo   Nhan Ctrl+C de dung chuong trinh.
echo ========================================================
echo.

:: Mo trinh duyet
ping 127.0.0.1 -n 3 >nul
start "" http://127.0.0.1:3000

:: Khoi chay HTTP Server (giu cua so mo)
npx -y http-server ./frontend -p 3000 -c-1 --cors
