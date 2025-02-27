@echo off
REM Đặt đường dẫn tới thư mục frontend và app
set FRONTEND_DIR=frontend
set BACKEND_DIR=app
set VENV_DIR=venv

REM Tạo và kích hoạt môi trường ảo Python
echo Đang tạo môi trường ảo Python...
python -m venv %VENV_DIR%

REM Kích hoạt môi trường ảo
echo Đang kích hoạt môi trường ảo...
call %VENV_DIR%\Scripts\activate

REM Cài đặt Python dependencies
echo Đang cài đặt Python dependencies...
cd %BACKEND_DIR%
python -m pip install --upgrade pip
pip install -r requirements.txt
cd ..

REM Kiểm tra và cài đặt Node.js dependencies
echo Đang cài đặt Node.js dependencies...
cd %FRONTEND_DIR%
npm install
cd ..

REM Khởi chạy backend (FastAPI)
echo Đang khởi chạy backend server...
start "Backend Server" python -m uvicorn main:app --reload --port 8000 --app-dir %BACKEND_DIR%

REM Chờ 5 giây để backend khởi động hoàn toàn
timeout /t 5 >nul

REM Khởi chạy frontend (React)
echo Đang khởi chạy frontend server...
start "Frontend Server" cmd /k "cd %FRONTEND_DIR% && npm start"

REM Chờ 10 giây để frontend khởi động hoàn toàn
timeout /t 10 >nul

REM Mở trình duyệt với ứng dụng
echo Đang mở trình duyệt...
start http://localhost:3000

echo Ứng dụng đã được khởi chạy thành công!
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
pause