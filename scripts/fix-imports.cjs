/**
 * 修复 ES module import 语句，添加 .js 后缀
 */
const fs = require('fs');
const path = require('path');

const distRenderer = path.join(__dirname, '..', 'dist', 'renderer');

function fixImports(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      fixImports(fullPath);
    } else if (file.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;
      
      // 修复 from './xxx' 形式
      content = content.replace(
        /from\s+(['"])(\.\.?\/[^'"]+)\1/g,
        (match, quote, importPath) => {
          if (importPath.endsWith('.js') || importPath.endsWith('.css')) {
            return match;
          }
          modified = true;
          return `from ${quote}${importPath}.js${quote}`;
        }
      );
      
      // 修复 import './xxx' 形式（无 from）
      content = content.replace(
        /import\s+(['"])(\.\.?\/[^'"]+)\1/g,
        (match, quote, importPath) => {
          if (importPath.endsWith('.js') || importPath.endsWith('.css')) {
            return match;
          }
          modified = true;
          return `import ${quote}${importPath}.js${quote}`;
        }
      );
      
      if (modified) {
        fs.writeFileSync(fullPath, content);
        console.log(`Fixed: ${path.relative(distRenderer, fullPath)}`);
      }
    }
  }
}

console.log('Fixing ES module imports...');
fixImports(distRenderer);
console.log('Done!');
