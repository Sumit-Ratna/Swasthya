const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'frontend_react/src');
const variableName = "import.meta.env.VITE_API_URL || 'http://localhost:8000'";

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // 1. Handle Single/Double Quotes: Upgrades to Template Literal
    // Matches: 'http://localhost:8000...' or "http://localhost:8000..."
    content = content.replace(/(['"])http:\/\/localhost:8000(.*?)\1/g, (match, quote, rest) => {
        return `\`\${${variableName}}${rest}\``;
    });

    // 2. Handle Existing Backticks: Inserts variable inside
    // Matches: `http://localhost:8000...` (start of template literal)
    // We only replace the start "http://localhost:8000" and keep the rest
    // Note: This regex assumes the string starts with http://localhost:8000
    // It does NOT match if http:// is in the middle of a string (which is rare for API calls)
    content = content.replace(/`http:\/\/localhost:8000/g, `\`\${${variableName}}`);

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
    }
}

function traverseDirectory(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            traverseDirectory(fullPath);
        } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
            processFile(fullPath);
        }
    });
}

console.log('Starting URL migration...');
traverseDirectory(directoryPath);
console.log('Migration complete.');
