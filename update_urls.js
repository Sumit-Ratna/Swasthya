const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'frontend_react/src');
const searchString = 'http://localhost:8000';
const replacementString = '${import.meta.env.VITE_API_URL}';

function processFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(searchString)) {
        // Use a regex to replace all occurrences globally
        // Escape special regex chars in searchString if needed, but http://localhost:8000 is safe-ish
        const newContent = content.split(searchString).join(replacementString);
        fs.writeFileSync(filePath, newContent, 'utf8');
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

console.log('Starting URL update...');
traverseDirectory(directoryPath);
console.log('Update complete.');
