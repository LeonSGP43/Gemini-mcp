/**
 * Windows 平台特定工具函数
 * Windows-specific utility functions
 */
import * as path from 'path';
import * as fs from 'fs';
/**
 * 标准化 Windows 路径
 * - 将正斜杠转换为反斜杠
 * - 处理 UNC 路径
 * - 移除多余的分隔符
 * @param filePath 原始路径
 * @returns 标准化的 Windows 路径
 */
export function normalizeWindowsPath(filePath) {
    if (!filePath)
        return filePath;
    // 使用 Node.js 内置方法标准化路径
    let normalized = path.normalize(filePath);
    // 确保盘符大写 (C: 而不是 c:)
    if (normalized.length >= 2 && normalized[1] === ':') {
        normalized = normalized[0].toUpperCase() + normalized.slice(1);
    }
    return normalized;
}
/**
 * 安全地拼接路径
 * 使用 path.join() 确保跨平台兼容
 * @param paths 路径片段
 * @returns 拼接后的路径
 */
export function joinPath(...paths) {
    return path.join(...paths);
}
/**
 * 获取绝对路径
 * @param relativePath 相对路径
 * @param basePath 基础路径（可选）
 * @returns 绝对路径
 */
export function getAbsolutePath(relativePath, basePath) {
    if (path.isAbsolute(relativePath)) {
        return normalizeWindowsPath(relativePath);
    }
    const base = basePath || process.cwd();
    return normalizeWindowsPath(path.resolve(base, relativePath));
}
/**
 * 检查文件是否存在（支持中文路径）
 * @param filePath 文件路径
 * @returns 文件是否存在
 */
export function fileExists(filePath) {
    try {
        const normalized = normalizeWindowsPath(filePath);
        return fs.existsSync(normalized);
    }
    catch (error) {
        return false;
    }
}
/**
 * 安全地读取文件（支持中文路径和自动编码检测）
 * @param filePath 文件路径
 * @param encoding 编码格式，默认 utf-8
 * @returns 文件内容
 */
export function readFileSafe(filePath, encoding = 'utf-8') {
    const normalized = normalizeWindowsPath(filePath);
    if (!fileExists(normalized)) {
        throw new Error(`文件不存在: ${normalized}`);
    }
    try {
        return fs.readFileSync(normalized, encoding);
    }
    catch (error) {
        if (error.code === 'EACCES') {
            throw new Error(`没有权限读取文件: ${normalized}`);
        }
        throw new Error(`读取文件失败: ${error.message}`);
    }
}
/**
 * 安全地写入文件（支持中文路径）
 * @param filePath 文件路径
 * @param content 文件内容
 * @param encoding 编码格式，默认 utf-8
 */
export function writeFileSafe(filePath, content, encoding = 'utf-8') {
    const normalized = normalizeWindowsPath(filePath);
    // 确保目录存在
    const dir = path.dirname(normalized);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    try {
        // Windows 下使用 CRLF 换行符
        const contentWithCRLF = content.replace(/\n/g, '\r\n');
        fs.writeFileSync(normalized, contentWithCRLF, encoding);
    }
    catch (error) {
        if (error.code === 'EACCES') {
            throw new Error(`没有权限写入文件: ${normalized}`);
        }
        throw new Error(`写入文件失败: ${error.message}`);
    }
}
/**
 * 检测路径是否包含中文字符
 * @param filePath 文件路径
 * @returns 是否包含中文
 */
export function hasChineseChars(filePath) {
    return /[\u4e00-\u9fa5]/.test(filePath);
}
/**
 * 将 WSL/Git Bash 路径转换为 Windows 路径
 * 例如: /c/Users/... -> C:\Users\...
 * @param posixPath POSIX 风格路径
 * @returns Windows 路径
 */
export function convertPosixToWindows(posixPath) {
    if (!posixPath.startsWith('/')) {
        return normalizeWindowsPath(posixPath);
    }
    // 处理 /c/Users/... 格式
    const match = posixPath.match(/^\/([a-z])\/(.*)/i);
    if (match) {
        const drive = match[1].toUpperCase();
        const rest = match[2].replace(/\//g, '\\');
        return `${drive}:\\${rest}`;
    }
    // 其他情况直接标准化
    return normalizeWindowsPath(posixPath);
}
/**
 * 将 Windows 路径转换为 POSIX 路径（用于某些命令行工具）
 * 例如: C:\Users\... -> /c/Users/...
 * @param windowsPath Windows 路径
 * @returns POSIX 风格路径
 */
export function convertWindowsToPosix(windowsPath) {
    const normalized = normalizeWindowsPath(windowsPath);
    // 处理盘符
    if (normalized.length >= 2 && normalized[1] === ':') {
        const drive = normalized[0].toLowerCase();
        const rest = normalized.slice(2).replace(/\\/g, '/');
        return `/${drive}${rest}`;
    }
    return normalized.replace(/\\/g, '/');
}
/**
 * 获取用户主目录
 * @returns 用户主目录路径
 */
export function getHomeDir() {
    const homeDir = process.env.USERPROFILE || process.env.HOME || '';
    return normalizeWindowsPath(homeDir);
}
/**
 * 检查是否在 Windows 平台
 * @returns 是否为 Windows
 */
export function isWindows() {
    return process.platform === 'win32';
}
/**
 * 获取临时目录
 * @returns 临时目录路径
 */
export function getTempDir() {
    const tmpDir = process.env.TEMP || process.env.TMP || path.join(getHomeDir(), 'AppData', 'Local', 'Temp');
    return normalizeWindowsPath(tmpDir);
}
//# sourceMappingURL=windows-utils.js.map