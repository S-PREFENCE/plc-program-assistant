@echo off
chcp 65001 >nul
echo ================================================
echo   PLC编程助手 - GitHub部署脚本
echo ================================================
echo.

:: 检查Git是否安装
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到Git，请先安装Git
    echo 下载地址: https://git-scm.com/download/win
    pause
    exit /b 1
)

:: 检查npm是否安装
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到npm，请先安装Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo [1/6] 初始化Git仓库...
git init
if %errorlevel% neq 0 (
    echo [错误] Git初始化失败
    pause
    exit /b 1
)
echo        完成!

echo.
echo [2/6] 添加所有文件...
git add .
echo        完成!

echo.
echo [3/6] 创建初始提交...
git commit -m "Initial commit: PLC编程助手 v1.0"
echo        完成!

echo.
echo ================================================
echo   创建GitHub仓库
echo ================================================
echo.
echo   请在浏览器中打开GitHub并登录:
echo   https://github.com/new
echo.
echo   设置如下:
echo   - Repository name: plc-program-assistant
echo   - Description: 掌上移动PLC编程助手 - H5在线版
echo   - 选择 Private (私有) 或 Public (公开)
echo   - 不要勾选 "Add a README file"
echo.
echo   创建完成后，将仓库地址复制下来
echo   (格式类似: https://github.com/你的用户名/plc-program-assistant.git)
echo.
set /p REPO_URL="请粘贴仓库地址: "

echo.
echo [4/6] 添加远程仓库...
git remote add origin %REPO_URL%
echo        完成!

echo.
echo [5/6] 推送代码到GitHub...
git branch -M main
git push -u origin main --force
if %errorlevel% neq 0 (
    echo [警告] 首次推送可能需要认证
    echo 请在弹出的浏览器窗口中登录GitHub
)

echo.
echo [6/6] 配置GitHub Pages...
echo.
echo   请在GitHub仓库页面完成以下操作:
echo   1. 进入 Settings (设置)
echo   2. 左侧菜单选择 Pages
echo   3. Source 选择 "Deploy from a branch"
echo   4. Branch 选择 "gh-pages" 和 "/(root)"
echo   5. 点击 Save
echo.
echo   等待2-3分钟后，访问:
echo   https://你的用户名.github.io/plc-program-assistant
echo.

echo ================================================
echo   部署完成！
echo ================================================
echo.
echo   接下来的步骤:
echo   1. 在浏览器打开你的GitHub仓库
echo   2. 进入 Settings > Pages
echo   3. Source 选择 "GitHub Actions"
echo   4. 推送代码后会自动部署
echo.
echo   访问地址:
echo   https://%REPO_URL:~19,-4%.github.io/plc-program-assistant/
echo.
echo   (将上述地址中的用户名替换为你的GitHub用户名)
echo.
pause
