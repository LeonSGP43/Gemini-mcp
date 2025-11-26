/**
 * Security validation module
 * Provides file path security validation to prevent path traversal attacks and sensitive file access
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import micromatch from 'micromatch';

// ============== Type Definitions ==============

/**
 * Security check configuration interface
 */
export interface SecurityConfig {
  /** Whitelist of allowed directories (optional, when empty allows all non-sensitive paths) */
  allowedDirectories?: string[];
  /** Blacklist of sensitive file patterns (glob patterns) */
  sensitivePatterns?: string[];
  /** Single file size limit (bytes), default 1MB */
  maxFileSize?: number;
  /** Maximum file count limit, default 500 */
  maxFiles?: number;
  /** Whether to allow symbolic links, default false */
  allowSymlinks?: boolean;
}

/**
 * Security error codes
 */
export type SecurityErrorCode =
  | 'PATH_TRAVERSAL'      // Path traversal attack
  | 'ACCESS_DENIED'       // Access denied (not in whitelist)
  | 'SENSITIVE_FILE'      // Sensitive file
  | 'SYMLINK_DETECTED'    // Symbolic link detected
  | 'SIZE_EXCEEDED'       // File size exceeded
  | 'FILE_LIMIT_EXCEEDED'; // File count exceeded

// ============== Constant Definitions ==============

/**
 * Default sensitive file patterns
 * These files may contain sensitive information and are not allowed access by default
 */
export const DEFAULT_SENSITIVE_PATTERNS = [
  // Environment variable files
  '.env',
  '.env.*',
  '.env.local',
  '.env.development',
  '.env.production',
  '**/.env',
  '**/.env.*',

  // SSH and key files
  '.ssh/**',
  '**/.ssh/**',
  '*.pem',
  '*.key',
  '*.pfx',
  '*.p12',
  '**/id_rsa',
  '**/id_rsa.*',
  '**/id_ed25519',
  '**/id_ed25519.*',
  '**/id_dsa',
  '**/id_dsa.*',

  // Credential and secret files
  '**/credentials*',
  '**/secrets*',
  '**/secret.*',
  '**/*password*',
  '**/*token*',

  // Git sensitive configuration
  '**/.git/config',
  '**/.gitconfig',

  // Database files
  '*.sqlite',
  '*.sqlite3',
  '*.db',

  // History files
  '**/.bash_history',
  '**/.zsh_history',
  '**/.node_repl_history',

  // AWS and cloud service configurations
  '**/.aws/**',
  '**/.azure/**',
  '**/.gcloud/**',

  // Docker secrets
  '**/docker-compose*.yml',
  '**/docker-compose*.yaml',
];

/**
 * Default security configuration
 */
export const DEFAULT_SECURITY_CONFIG: Required<SecurityConfig> = {
  allowedDirectories: [],           // Empty array means no restriction
  sensitivePatterns: DEFAULT_SENSITIVE_PATTERNS,
  maxFileSize: 1024 * 1024,         // 1MB
  maxFiles: 500,
  allowSymlinks: false,
};

// ============== Error Class Definitions ==============

/**
 * Security error class
 * Thrown when security validation fails
 */
export class SecurityError extends Error {
  /**
   * Create a security error instance
   * @param message Error message
   * @param code Error code
   * @param path Related file path (optional)
   */
  constructor(
    message: string,
    public readonly code: SecurityErrorCode,
    public readonly path?: string
  ) {
    super(message);
    this.name = 'SecurityError';
    // Ensure correct prototype chain (TypeScript compilation compatibility)
    Object.setPrototypeOf(this, SecurityError.prototype);
  }
}

// ============== Utility Functions ==============

/**
 * Normalize path
 * Convert path to unified format, handling Windows and Unix path differences
 *
 * @param inputPath Input path
 * @returns Normalized absolute path
 *
 * @example
 * normalizePath('./src/index.ts')  // Returns absolute path
 * normalizePath('C:\\Users\\test') // Returns C:/Users/test
 */
export function normalizePath(inputPath: string): string {
  // Resolve to absolute path
  const absolutePath = path.resolve(inputPath);
  // Unify to use forward slashes (for cross-platform handling)
  return absolutePath.replace(/\\/g, '/');
}

/**
 * Detect if path contains path traversal attack
 *
 * Use path.relative method to safely detect path traversal,
 * avoiding false positives from simple includes('..') checks on legitimate filenames (e.g., vendor..lib.js)
 *
 * @param inputPath Path to detect
 * @param basePath Base path (defaults to current working directory)
 * @returns Returns true if path traversal is detected
 *
 * @example
 * hasPathTraversal('../etc/passwd')      // true
 * hasPathTraversal('./src/index.ts')     // false
 * hasPathTraversal('./vendor..lib.js')   // false (legitimate filename)
 */
export function hasPathTraversal(inputPath: string, basePath?: string): boolean {
  // Get base path (defaults to current working directory)
  const base = basePath ? path.resolve(basePath) : process.cwd();

  // Resolve input path to absolute path
  const resolvedPath = path.resolve(base, inputPath);

  // Use path.relative to calculate relative path
  // If result starts with '..', the path is trying to escape the base directory
  const relativePath = path.relative(base, resolvedPath);

  // Check if relative path starts with '..' (indicates path traversal)
  // or is an absolute path (on Windows may start with 'C:')
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return true;
  }

  // Additional check: path segments should not have '..' as a standalone directory name
  // This is to prevent some edge cases
  const segments = inputPath.split(/[/\\]/);
  for (const segment of segments) {
    // Only check segments that exactly equal '..', not filenames containing '..'
    if (segment === '..') {
      return true;
    }
  }

  return false;
}

/**
 * Check if file is a sensitive file
 *
 * @param filePath File path
 * @param patterns List of sensitive file patterns (glob patterns)
 * @returns Returns true if it is a sensitive file
 *
 * @example
 * isSensitiveFile('.env')                    // true
 * isSensitiveFile('./src/index.ts')          // false
 * isSensitiveFile('./config/credentials.json') // true
 */
export function isSensitiveFile(
  filePath: string,
  patterns: string[] = DEFAULT_SENSITIVE_PATTERNS
): boolean {
  // Get filename and path
  const normalizedPath = filePath.replace(/\\/g, '/');
  const fileName = path.basename(normalizedPath);

  // Use micromatch for glob pattern matching
  const isMatch = micromatch.isMatch(normalizedPath, patterns, {
    dot: true,           // Match files starting with .
    nocase: true,        // Ignore case
    basename: false      // Use full path matching
  });

  // Additional filename check
  const fileNameMatch = micromatch.isMatch(fileName, patterns, {
    dot: true,
    nocase: true
  });

  return isMatch || fileNameMatch;
}

/**
 * Check if path is within allowed directory
 *
 * Use path.relative method to safely check if path is within allowed directory,
 * avoiding simple prefix matching bypasses (e.g., /var/www-secret matching /var/www)
 *
 * @param filePath File path to check
 * @param allowedDirs List of allowed directories
 * @returns Returns true if within allowed directory
 *
 * @example
 * isWithinAllowedDirectory('./src/index.ts', ['./src', './lib']) // true
 * isWithinAllowedDirectory('./etc/passwd', ['./src'])            // false
 * isWithinAllowedDirectory('/var/www-secret', ['/var/www'])      // false (fixed: cannot be bypassed)
 */
export function isWithinAllowedDirectory(
  filePath: string,
  allowedDirs: string[]
): boolean {
  // If whitelist is empty, allow all paths
  if (!allowedDirs || allowedDirs.length === 0) {
    return true;
  }

  // Resolve to absolute path
  const absoluteFilePath = path.resolve(filePath);

  for (const dir of allowedDirs) {
    const absoluteDir = path.resolve(dir);

    // Use path.relative to calculate relative path
    const relativePath = path.relative(absoluteDir, absoluteFilePath);

    // If relative path doesn't start with '..' and is not an absolute path,
    // the file is within the allowed directory or is the directory itself
    if (!relativePath.startsWith('..') && !path.isAbsolute(relativePath)) {
      // Additional check: empty string means paths are identical
      // Non-empty string means it's a subpath
      return true;
    }
  }

  return false;
}

/**
 * Check if it is a symbolic link
 *
 * @param filePath File path
 * @returns Returns true if it is a symbolic link
 */
export async function isSymlink(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.lstat(filePath);
    return stats.isSymbolicLink();
  } catch {
    // File does not exist or cannot be accessed, return false
    return false;
  }
}

/**
 * Get file size
 *
 * @param filePath File path
 * @returns File size (bytes)
 */
export async function getFileSize(filePath: string): Promise<number> {
  const stats = await fs.stat(filePath);
  return stats.size;
}

// ============== Main Validation Functions ==============

/**
 * Validate the security of a single path
 * Performs complete security checks including path traversal, sensitive files, whitelist, and symbolic link detection
 *
 * @param inputPath Path to validate
 * @param config Security configuration (optional)
 * @throws SecurityError Thrown when security validation fails
 *
 * @example
 * // Normal usage
 * await validatePath('./src/index.ts');
 *
 * // With whitelist
 * await validatePath('./src/index.ts', { allowedDirectories: ['./src'] });
 *
 * // Path traversal attack will throw error
 * await validatePath('../../../etc/passwd'); // Throws SecurityError
 */
export async function validatePath(
  inputPath: string,
  config?: SecurityConfig
): Promise<void> {
  const mergedConfig = { ...DEFAULT_SECURITY_CONFIG, ...config };

  // 1. Check for path traversal attack
  if (hasPathTraversal(inputPath)) {
    throw new SecurityError(
      `Path traversal attack blocked: "${inputPath}" contains disallowed path traversal pattern`,
      'PATH_TRAVERSAL',
      inputPath
    );
  }

  // 2. Check if it is a sensitive file
  if (isSensitiveFile(inputPath, mergedConfig.sensitivePatterns)) {
    throw new SecurityError(
      `Access to sensitive file denied: "${inputPath}" matches sensitive file pattern`,
      'SENSITIVE_FILE',
      inputPath
    );
  }

  // 3. Check if within whitelist directory
  if (!isWithinAllowedDirectory(inputPath, mergedConfig.allowedDirectories || [])) {
    throw new SecurityError(
      `Access denied: "${inputPath}" is not in the allowed directory list`,
      'ACCESS_DENIED',
      inputPath
    );
  }

  // 4. Check for symbolic link (if file exists)
  if (!mergedConfig.allowSymlinks) {
    try {
      if (await isSymlink(inputPath)) {
        throw new SecurityError(
          `Symlink access denied: "${inputPath}" is a symbolic link`,
          'SYMLINK_DETECTED',
          inputPath
        );
      }
    } catch (error) {
      // If it's a SecurityError, continue throwing
      if (error instanceof SecurityError) {
        throw error;
      }
      // Ignore symlink check when file doesn't exist (let subsequent file reading handle it)
    }
  }
}

/**
 * Batch validate the security of multiple paths
 *
 * @param paths Array of paths to validate
 * @param config Security configuration (optional)
 * @throws SecurityError Thrown when any path validation fails
 *
 * @example
 * await validatePaths(['./src/a.ts', './src/b.ts']);
 */
export async function validatePaths(
  paths: string[],
  config?: SecurityConfig
): Promise<void> {
  for (const filePath of paths) {
    await validatePath(filePath, config);
  }
}

/**
 * Validate if file size is within limits
 *
 * @param filePath File path
 * @param maxSize Maximum file size (bytes)
 * @throws SecurityError Thrown when file size exceeds limit
 */
export async function validateFileSize(
  filePath: string,
  maxSize: number = DEFAULT_SECURITY_CONFIG.maxFileSize
): Promise<void> {
  try {
    const size = await getFileSize(filePath);
    if (size > maxSize) {
      throw new SecurityError(
        `File size exceeded: "${filePath}" size is ${formatBytes(size)}, exceeds limit of ${formatBytes(maxSize)}`,
        'SIZE_EXCEEDED',
        filePath
      );
    }
  } catch (error) {
    if (error instanceof SecurityError) {
      throw error;
    }
    // Ignore size check when file doesn't exist (let subsequent file reading handle it)
  }
}

/**
 * Validate if file count is within limits
 *
 * @param count File count
 * @param maxFiles Maximum file count
 * @throws SecurityError Thrown when file count exceeds limit
 */
export function validateFileCount(
  count: number,
  maxFiles: number = DEFAULT_SECURITY_CONFIG.maxFiles
): void {
  if (count > maxFiles) {
    throw new SecurityError(
      `File count exceeded: Found ${count} files, exceeds limit of ${maxFiles}`,
      'FILE_LIMIT_EXCEEDED'
    );
  }
}

// ============== Helper Functions ==============

/**
 * Format bytes to human-readable format
 *
 * @param bytes Byte count
 * @returns Formatted string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Merge security configurations
 *
 * @param userConfig User-provided configuration
 * @returns Merged complete configuration
 */
export function mergeSecurityConfig(
  userConfig?: SecurityConfig
): Required<SecurityConfig> {
  return {
    ...DEFAULT_SECURITY_CONFIG,
    ...userConfig,
    // Merge sensitive file patterns (rather than overwrite)
    sensitivePatterns: [
      ...DEFAULT_SENSITIVE_PATTERNS,
      ...(userConfig?.sensitivePatterns || [])
    ]
  };
}
