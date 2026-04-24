@echo off
chcp 65001 >nul
echo ========================================
echo   PLC编程助手 - 微信小程序版 快速开始
echo ========================================
echo.

echo [1/3] 检查Node.js环境...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 未检测到Node.js，请先安装：https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js已安装: 
node --version

echo.
echo [2/3] 安装依赖包...
call npm install

if errorlevel 1 (
    echo ❌ 依赖安装失败
    pause
    exit /b 1
)
echo ✅ 依赖安装完成

echo.
echo [3/3] 检查微信开发者工具...
echo.
echo ========================================
echo   安装完成！现在请执行以下操作：
echo ========================================
echo.
echo 📱 微信小程序开发：
echo    1. 运行: npm run dev:mp-weixin
echo    2. 用微信开发者工具打开 dist/dev/mp-weixin 目录
echo    3. 在开发者工具中预览或导入项目
echo.
echo 🌐 H5网页预览：
echo    1. 运行: npm run dev:h5
echo    2. 浏览器访问: http://localhost:3000
echo.
echo 📖 更多说明请查看 README.md
echo.
echo ========================================
pause
