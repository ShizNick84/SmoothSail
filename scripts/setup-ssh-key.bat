@echo off
echo ========================================
echo SSH Key Setup for Oracle Cloud
echo ========================================
echo.

REM Create keys directory if it doesn't exist
if not exist "keys" mkdir keys

echo This script will help you set up your SSH private key for Oracle Cloud.
echo.
echo You have two options:
echo.
echo 1. Copy your existing private key file to ./keys/oracle_key
echo 2. Generate a new SSH key pair
echo.

set /p choice="Enter your choice (1 or 2): "

if "%choice%"=="1" (
    echo.
    echo Please copy your Oracle Cloud private key file to:
    echo %CD%\keys\oracle_key
    echo.
    echo Make sure the file:
    echo - Contains the full private key including BEGIN/END lines
    echo - Has no extra spaces or characters
    echo - Is in OpenSSH or PEM format
    echo.
    echo After copying the file, press any key to continue...
    pause >nul
    
    if exist "keys\oracle_key" (
        echo ✅ Private key file found!
        echo Updating .env file...
        
        REM Update .env to use file path instead of inline key
        powershell -Command "(Get-Content .env) -replace 'ORACLE_SSH_PRIVATE_KEY=.*', 'SSH_PRIVATE_KEY_PATH=./keys/oracle_key' | Set-Content .env"
        
        echo ✅ Configuration updated!
        echo Now run: npm run test:ssh
    ) else (
        echo ❌ Private key file not found at keys\oracle_key
        echo Please copy your private key file and try again.
    )
) else if "%choice%"=="2" (
    echo.
    echo Generating new SSH key pair...
    echo.
    
    REM Generate new SSH key pair
    ssh-keygen -t rsa -b 4096 -f keys\oracle_key -N ""
    
    if exist "keys\oracle_key" (
        echo ✅ New SSH key pair generated!
        echo.
        echo IMPORTANT: You need to add the public key to your Oracle Cloud instance:
        echo.
        echo 1. Copy the content of keys\oracle_key.pub
        type keys\oracle_key.pub
        echo.
        echo 2. Add it to your Oracle Cloud instance:
        echo    - SSH to your instance: ssh opc@168.138.104.117
        echo    - Edit: nano ~/.ssh/authorized_keys
        echo    - Paste the public key content
        echo    - Save and exit
        echo.
        echo 3. Update .env file...
        
        REM Update .env to use the new key file
        powershell -Command "(Get-Content .env) -replace 'ORACLE_SSH_PRIVATE_KEY=.*', 'SSH_PRIVATE_KEY_PATH=./keys/oracle_key' | Set-Content .env"
        
        echo ✅ Configuration updated!
        echo.
        echo After adding the public key to Oracle Cloud, run: npm run test:ssh
    ) else (
        echo ❌ Failed to generate SSH key pair
    )
) else (
    echo Invalid choice. Please run the script again and choose 1 or 2.
)

echo.
pause