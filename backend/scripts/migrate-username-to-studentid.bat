@echo off
REM 数据库迁移脚本：将 username 字段重命名为 student_id

echo 开始数据库迁移...

REM 1. 生成 Prisma Client
echo 1. 生成 Prisma Client...
cd backend
call npx prisma generate

REM 2. 执行数据库迁移
echo 2. 执行数据库迁移...
call npx prisma db push

echo 迁移完成！
echo.
echo 注意事项：
echo - User 表的 username 字段已重命名为 student_id
echo - 所有相关代码已更新
echo - 请重启后端服务以应用更改

pause
