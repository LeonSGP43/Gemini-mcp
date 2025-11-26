/**
 * File reading utility module
 * Provides single file reading and directory batch reading functions, supports glob pattern filtering
 */
import fg from 'fast-glob';
import * as fs from 'fs/promises';
import * as path from 'path';
import { validatePath, validateFileSize, validateFileCount, SecurityError, DEFAULT_SECURITY_CONFIG } from './security.js';
// ============== Constant Definitions ==============
/**
 * Default exclude patterns
 * These directories/files usually don't need to be analyzed
 */
export const DEFAULT_EXCLUDE_PATTERNS = [
    // Dependency directories
    'node_modules/**',
    'vendor/**',
    'bower_components/**',
    // Build output
    'dist/**',
    'build/**',
    'out/**',
    '.next/**',
    '.nuxt/**',
    '.output/**',
    // Test coverage
    'coverage/**',
    '.nyc_output/**',
    // Cache directories
    '.cache/**',
    '.parcel-cache/**',
    '.turbo/**',
    // Lock files
    '*.lock',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    // Minified/compiled files
    '*.min.js',
    '*.min.css',
    '*.bundle.js',
    '*.chunk.js',
    // Source map
    '*.map',
    '*.js.map',
    '*.css.map',
    // Version control
    '.git/**',
    '.svn/**',
    '.hg/**',
    // IDE configuration
    '.idea/**',
    '.vscode/**',
    '*.code-workspace',
    // Log files
    '*.log',
    'logs/**',
    // Temporary files
    'tmp/**',
    'temp/**',
    '.tmp/**',
];
/**
 * Binary file extensions
 * These files cannot be read as text and should be skipped
 */
export const BINARY_EXTENSIONS = [
    // Images
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.bmp', '.svg', '.tiff', '.avif',
    // Audio
    '.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.wma',
    // Video
    '.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm', '.m4v',
    // Archives
    '.zip', '.tar', '.gz', '.rar', '.7z', '.bz2', '.xz',
    // Executables
    '.exe', '.dll', '.so', '.dylib', '.bin', '.app', '.msi',
    // Documents (binary formats)
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp',
    // Fonts
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    // Databases
    '.db', '.sqlite', '.sqlite3', '.mdb',
    // Other binary
    '.class', '.jar', '.pyc', '.pyo', '.o', '.obj', '.a', '.lib',
    '.ico', '.icns', '.cur',
];
/**
 * Programming language mapping table
 * Detects programming language based on file extension
 */
const LANGUAGE_MAP = {
    // JavaScript/TypeScript
    '.js': 'JavaScript',
    '.jsx': 'JavaScript (JSX)',
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript (TSX)',
    '.mjs': 'JavaScript (ESM)',
    '.cjs': 'JavaScript (CommonJS)',
    // Web
    '.html': 'HTML',
    '.htm': 'HTML',
    '.css': 'CSS',
    '.scss': 'SCSS',
    '.sass': 'Sass',
    '.less': 'Less',
    '.vue': 'Vue',
    '.svelte': 'Svelte',
    // Python
    '.py': 'Python',
    '.pyw': 'Python',
    '.pyx': 'Cython',
    '.pyi': 'Python (Stub)',
    // Java/JVM
    '.java': 'Java',
    '.kt': 'Kotlin',
    '.kts': 'Kotlin Script',
    '.scala': 'Scala',
    '.groovy': 'Groovy',
    // C family
    '.c': 'C',
    '.h': 'C Header',
    '.cpp': 'C++',
    '.cc': 'C++',
    '.cxx': 'C++',
    '.hpp': 'C++ Header',
    '.hxx': 'C++ Header',
    // Go
    '.go': 'Go',
    // Rust
    '.rs': 'Rust',
    // Ruby
    '.rb': 'Ruby',
    '.erb': 'ERB',
    // PHP
    '.php': 'PHP',
    // Swift
    '.swift': 'Swift',
    // Shell
    '.sh': 'Shell',
    '.bash': 'Bash',
    '.zsh': 'Zsh',
    '.fish': 'Fish',
    '.ps1': 'PowerShell',
    '.bat': 'Batch',
    '.cmd': 'Batch',
    // Configuration files
    '.json': 'JSON',
    '.yaml': 'YAML',
    '.yml': 'YAML',
    '.toml': 'TOML',
    '.xml': 'XML',
    '.ini': 'INI',
    '.cfg': 'Config',
    '.conf': 'Config',
    // Data formats
    '.csv': 'CSV',
    '.tsv': 'TSV',
    // Documents
    '.md': 'Markdown',
    '.mdx': 'MDX',
    '.rst': 'reStructuredText',
    '.txt': 'Plain Text',
    // Database
    '.sql': 'SQL',
    '.graphql': 'GraphQL',
    '.gql': 'GraphQL',
    // Other
    '.r': 'R',
    '.R': 'R',
    '.lua': 'Lua',
    '.pl': 'Perl',
    '.ex': 'Elixir',
    '.exs': 'Elixir Script',
    '.erl': 'Erlang',
    '.hrl': 'Erlang Header',
    '.clj': 'Clojure',
    '.cljs': 'ClojureScript',
    '.dart': 'Dart',
    '.zig': 'Zig',
    '.nim': 'Nim',
    '.ml': 'OCaml',
    '.mli': 'OCaml Interface',
    '.fs': 'F#',
    '.fsx': 'F# Script',
    '.hs': 'Haskell',
    // Docker/Container
    '.dockerfile': 'Dockerfile',
    // Templates
    '.ejs': 'EJS',
    '.hbs': 'Handlebars',
    '.pug': 'Pug',
    '.jade': 'Jade',
    '.njk': 'Nunjucks',
    '.twig': 'Twig',
    '.jinja': 'Jinja',
    '.jinja2': 'Jinja2',
};
// ============== Error Class Definition ==============
/**
 * File reading error class
 */
export class FileReadError extends Error {
    filePath;
    cause;
    /**
     * Create file reading error instance
     * @param message Error message
     * @param filePath File path
     * @param cause Original error (optional)
     */
    constructor(message, filePath, cause) {
        super(message);
        this.filePath = filePath;
        this.cause = cause;
        this.name = 'FileReadError';
        Object.setPrototypeOf(this, FileReadError.prototype);
    }
}
// ============== Utility Functions ==============
/**
 * Detect programming language based on file extension
 *
 * @param filePath File path
 * @returns Language name, returns undefined if unknown
 *
 * @example
 * detectLanguage('src/index.ts')     // 'TypeScript'
 * detectLanguage('styles/main.css')  // 'CSS'
 * detectLanguage('unknown.xyz')      // undefined
 */
export function detectLanguage(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    // Special filename handling
    const fileName = path.basename(filePath).toLowerCase();
    if (fileName === 'dockerfile') {
        return 'Dockerfile';
    }
    if (fileName === 'makefile' || fileName === 'gnumakefile') {
        return 'Makefile';
    }
    if (fileName === '.gitignore' || fileName === '.dockerignore') {
        return 'Ignore File';
    }
    if (fileName === '.editorconfig') {
        return 'EditorConfig';
    }
    return LANGUAGE_MAP[ext];
}
/**
 * Detect if file is binary
 *
 * @param filePath File path
 * @returns Returns true if it's a binary file
 *
 * @example
 * isBinaryFile('image.png')  // true
 * isBinaryFile('code.ts')    // false
 */
export function isBinaryFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return BINARY_EXTENSIONS.includes(ext);
}
// ============== Main Functions ==============
/**
 * Read a single file
 *
 * @param filePath File path
 * @param config Security configuration (optional)
 * @returns File content object
 * @throws FileReadError Thrown when file reading fails
 * @throws SecurityError Thrown when security validation fails
 *
 * @example
 * const file = await readFile('./src/index.ts');
 * console.log(file.content);  // File content
 * console.log(file.language); // 'TypeScript'
 */
export async function readFile(filePath, config) {
    // 1. Security validation
    await validatePath(filePath, config);
    // 2. Check if it's a binary file
    if (isBinaryFile(filePath)) {
        throw new FileReadError(`Cannot read binary file: "${filePath}"`, filePath);
    }
    try {
        // 3. Get absolute path
        const absolutePath = path.resolve(filePath);
        // 4. Get file information
        const stats = await fs.stat(absolutePath);
        // 5. Validate file size
        const maxSize = config?.maxFileSize ?? DEFAULT_SECURITY_CONFIG.maxFileSize;
        await validateFileSize(absolutePath, maxSize);
        // 6. Read file content
        const content = await fs.readFile(absolutePath, 'utf-8');
        // 7. Detect language
        const language = detectLanguage(filePath);
        return {
            path: filePath,
            absolutePath: absolutePath.replace(/\\/g, '/'),
            content,
            size: stats.size,
            language
        };
    }
    catch (error) {
        // If it's a known error type, throw directly
        if (error instanceof FileReadError || error instanceof SecurityError) {
            throw error;
        }
        // Handle other errors
        const nodeError = error;
        if (nodeError.code === 'ENOENT') {
            throw new FileReadError(`File not found: "${filePath}"`, filePath, nodeError);
        }
        if (nodeError.code === 'EACCES') {
            throw new FileReadError(`No permission to access file: "${filePath}"`, filePath, nodeError);
        }
        if (nodeError.code === 'EISDIR') {
            throw new FileReadError(`Path is a directory, not a file: "${filePath}"`, filePath, nodeError);
        }
        throw new FileReadError(`Failed to read file: "${filePath}" - ${error.message}`, filePath, error);
    }
}
/**
 * Read multiple files in batch
 * Automatically skips binary files and files that fail to read
 *
 * @param filePaths Array of file paths
 * @param config Security configuration (optional)
 * @returns Array of successfully read file contents
 *
 * @example
 * const files = await readFiles(['./src/a.ts', './src/b.ts']);
 */
export async function readFiles(filePaths, config) {
    const results = [];
    const errors = [];
    // Read all files in parallel
    const promises = filePaths.map(async (filePath) => {
        try {
            // Skip binary files
            if (isBinaryFile(filePath)) {
                return null;
            }
            const content = await readFile(filePath, config);
            return content;
        }
        catch (error) {
            // Record error but don't interrupt
            errors.push({
                path: filePath,
                error: error.message
            });
            return null;
        }
    });
    const settled = await Promise.all(promises);
    // Filter out null results
    for (const result of settled) {
        if (result !== null) {
            results.push(result);
        }
    }
    // If there are errors, output warning (but don't throw)
    if (errors.length > 0) {
        console.warn(`[file-reader] Skipped ${errors.length} files:`);
        for (const { path, error } of errors.slice(0, 5)) {
            console.warn(`  - ${path}: ${error}`);
        }
        if (errors.length > 5) {
            console.warn(`  ... and ${errors.length - 5} other files`);
        }
    }
    return results;
}
/**
 * Read entire directory
 * Supports glob pattern filtering, automatically excludes binary files and common ignored directories
 *
 * @param directory Directory path
 * @param options Reading options
 * @returns Array of file contents
 * @throws SecurityError Thrown when security validation fails
 * @throws FileReadError Thrown when directory doesn't exist
 *
 * @example
 * // Read all TypeScript files
 * const files = await readDirectory('./src', {
 *   include: ['**\/*.ts', '**\/*.tsx'],
 *   exclude: ['**\/*.test.ts']
 * });
 */
export async function readDirectory(directory, options) {
    // 1. Security validate directory path
    await validatePath(directory, options?.securityConfig);
    // 2. Validate directory existence
    const absoluteDir = path.resolve(directory);
    try {
        const stats = await fs.stat(absoluteDir);
        if (!stats.isDirectory()) {
            throw new FileReadError(`Path is not a directory: "${directory}"`, directory);
        }
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            throw new FileReadError(`Directory not found: "${directory}"`, directory);
        }
        throw error;
    }
    // 3. Prepare glob patterns
    const include = options?.include || ['**/*'];
    const userExclude = options?.exclude || [];
    // Merge exclude patterns
    const exclude = [...DEFAULT_EXCLUDE_PATTERNS, ...userExclude];
    // Add binary file extensions to exclude patterns
    const binaryExclude = BINARY_EXTENSIONS.map(ext => `**/*${ext}`);
    // 4. Use fast-glob to get file list
    const files = await fg(include, {
        cwd: absoluteDir,
        ignore: [...exclude, ...binaryExclude],
        onlyFiles: true,
        dot: false, // Don't include hidden files (starting with .)
        followSymbolicLinks: false, // Don't follow symbolic links
        absolute: false // Return relative paths
    });
    // 5. Validate file count
    const maxFiles = options?.maxFiles ?? DEFAULT_SECURITY_CONFIG.maxFiles;
    validateFileCount(files.length, maxFiles);
    // 6. Build complete file paths
    const filePaths = files.map(file => path.join(directory, file));
    // 7. Read all files
    const contents = await readFiles(filePaths, options?.securityConfig);
    // 8. Adjust relative paths (relative to the passed directory parameter)
    return contents.map(file => ({
        ...file,
        path: path.relative(directory, file.absolutePath).replace(/\\/g, '/')
    }));
}
/**
 * Check if file exists
 *
 * @param filePath File path
 * @returns Returns true if file exists
 */
export async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Check if directory exists
 *
 * @param dirPath Directory path
 * @returns Returns true if directory exists
 */
export async function directoryExists(dirPath) {
    try {
        const stats = await fs.stat(dirPath);
        return stats.isDirectory();
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=file-reader.js.map