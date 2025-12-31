/**
 * 修复 ES module import 语句，添加 .js 后缀
 * 支持目录导入解析为 /index.js
 */
const fs = require('fs');
const path = require('path');

const distRenderer = path.join(__dirname, '..', 'dist', 'renderer');

/**
 * 解析导入路径，检测是否为目录
 * @param {string} currentFile 当前文件路径
 * @param {string} importPath 导入路径
 * @returns {string} 修正后的导入路径
 */
function resolveImportPath(currentFile, importPath) {
  if (importPath.endsWith('.js') || importPath.endsWith('.css')) {
    return importPath;
  }
  
  const currentDir = path.dirname(currentFile);
  const resolvedPath = path.resolve(currentDir, importPath);
  
  // 检查是否为目录（存在 index.js）
  const indexPath = path.join(resolvedPath, 'index.js');
  if (fs.existsSync(indexPath)) {
    return `${importPath}/index.js`;
  }
  
  // 检查是否存在 .js 文件
  if (fs.existsSync(`${resolvedPath}.js`)) {
    return `${importPath}.js`;
  }
  
  // 默认添加 .js 后缀
  return `${importPath}.js`;
}

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
          const fixedPath = resolveImportPath(fullPath, importPath);
          if (fixedPath !== importPath) {
            modified = true;
            return `from ${quote}${fixedPath}${quote}`;
          }
          return match;
        }
      );
      
      // 修复 import './xxx' 形式（无 from）
      content = content.replace(
        /import\s+(['"])(\.\.?\/[^'"]+)\1/g,
        (match, quote, importPath) => {
          const fixedPath = resolveImportPath(fullPath, importPath);
          if (fixedPath !== importPath) {
            modified = true;
            return `import ${quote}${fixedPath}${quote}`;
          }
          return match;
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
