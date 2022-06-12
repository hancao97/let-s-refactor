const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { includedFileSubfixes, excludedDirs } = require('../configs/index');
const { IMPORT_ALL, VUE_MODULE, UNNAMED_DEFAULT, UNNAMED_FUNCTION, DECONSTRUCTION_STATEMENT_SYMBOLS } = require('../constants/index');
const _isDir = (path) => {
    const state = fs.statSync(path);
    return !state.isFile();
}

const getIconUri = (name) => {
    return vscode.Uri.file(path.join(__filename, '..', '..', `resources/${name}.svg`));
}

const getProjectRoot = () => {
    const rootInfo = vscode.workspace.workspaceFolders[0];
    if (!rootInfo) {
        vscode.window.showInformationMessage('no root!');
        return '';
    }
    return path.join(rootInfo.uri.fsPath, '/src');
}

const getFileList = (dirPath) => {
    let dirSubItems = fs.readdirSync(dirPath);
    const fileList = [];
    for (const item of dirSubItems) {
        const childPath = path.join(dirPath, item);
        if (_isDir(childPath) && !excludedDirs.has(item)) {
            fileList.push(...getFileList(childPath));
        } else if (!_isDir(childPath) && includedFileSubfixes.has(path.extname(item))) {
            fileList.push(childPath);
        }
    }
    return fileList;
}

const getBusinessFileList = () => {
    const dirPath = getProjectRoot();
    if (!dirPath) return [];
    return getFileList(dirPath);
}

const getBusinessRootFileList = () => {
    const projectRoot = getProjectRoot();
    if (!projectRoot) return [];
    const fileList = [];
    const pagePath = path.join(projectRoot, '/views/pages');
    if (fs.existsSync(pagePath)) {
        fileList.push(...getFileList(pagePath));
    }
    const exposePath = path.join(projectRoot, '/expose');
    if (fs.existsSync(exposePath)) {
        fileList.push(...getFileList(exposePath));
    }
    const mainPath = path.join(projectRoot, '/main.js');
    if (fs.existsSync(mainPath)) {
        fileList.push(mainPath);
    }
    return fileList;
}

const getFileLineCount = (fileList) => {
    let count = 0;
    for (const file of fileList) {
        const content = fs.readFileSync(file, {
            encoding: 'utf-8'
        });
        count += content.split('\n').length;
    }
    return count;
}

const speculatePath = (source, basicPath) => {
    let _source;
    if (source.startsWith('@/')) {
        const srcPath = getProjectRoot();
        _source = `${srcPath}${source.replace('@', '')}`
    } else {
        _source = path.join(path.dirname(basicPath), source);
    }
    if (fs.existsSync(_source) && !_isDir(_source)) {
        return _source;
    }
    let speculatePath;
    if (fs.existsSync(_source) && _isDir(_source)) {
        speculatePath = path.join(_source, '/index.js');
        if (fs.existsSync(speculatePath)) {
            return speculatePath;
        }
        speculatePath = path.join(_source, '/index.vue');
        if (fs.existsSync(speculatePath)) {
            return speculatePath;
        }
        return null;
    }
    if (!fs.existsSync(_source)) {
        speculatePath = `${_source}.js`;
        if (fs.existsSync(speculatePath)) {
            return speculatePath;
        }
        speculatePath = `${_source}.vue`;
        if (fs.existsSync(speculatePath)) {
            return speculatePath;
        }
        return null;
    }
    return null;
}

const getImportPathRegs = () => {
    // TODO: 无法检测运行时生成的路径
    return [
        // import * from './example'
        /(?<statement>import\s+.*?\s+from\s+['"](?<modulePath>.+?)['"])/g,
        // import('./example')
        /(?<statement>import\(['"](?<modulePath>.+?)['"]\))/g,
        // import './example'
        /(?<statement>import\s+['"](?<modulePath>.+?)['"])/g
    ]
}

const getImportedFileSet = (fileList, set = new Set([])) => {
    const _fileList = [];
    for (const file of fileList) {
        if (set.has(file)) {
            continue;
        }
        set.add(file);
        const content = fs.readFileSync(file, {
            encoding: 'utf-8'
        });
        const regReferences = getImportPathRegs();
        for (const reg of regReferences) {
            let matchResult;
            while ((matchResult = reg.exec(content))) {
                const { modulePath } = matchResult.groups;
                const filePath = speculatePath(modulePath, file);
                if (filePath && !set.has(filePath)) {
                    _fileList.push(filePath);
                }
            }
        }
    }
    if (_fileList.length) getImportedFileSet(_fileList, set);
    return set;
}

const getExportRegs = () => {
    // TODO: 无法检测运行时生成的路径
    return [
        // export const/class/function/var/default/- {xxx}/{xxx as yyy}
        /export\s+(const|var|let|function|class|default)?\s*{(?<provide>[\w\W]+?)}/g,
        // export const/class/function/var/default/- xxx TODO: provide 不能为 const var function 等
        /export\s+(const|var|let|function|class|default)?\s*(?<provide>[\w-]+)/g
    ]
}
// TODO: 未来改用词法分析 + 语法分析
const getExportInfo = (fileList) => {
    const exportInfo = {};
    for (const file of fileList) {
        if (path.extname(file) === '.js') {
            const content = fs.readFileSync(file, {
                encoding: 'utf-8'
            });
            const provideList = [];
            const regReferences = getExportRegs();
            for (const reg of regReferences) {
                let matchResult;
                while ((matchResult = reg.exec(content))) {
                    let { provide } = matchResult.groups;
                    // const|var|let|function|class|default
                    if (provide == 'default') {
                        provide = UNNAMED_DEFAULT;
                    } else if (provide == 'function') {
                        provide = UNNAMED_FUNCTION;
                    } else if (DECONSTRUCTION_STATEMENT_SYMBOLS.has(provide)) {
                        continue;
                    }
                    provideList.push(...provide.split(',').map(item => {
                        const temp = item.split(' as ');
                        if (temp[1]) {
                            return temp[1].replace(/\s/g, '');
                        } else {
                            return temp[0].replace(/\s/g, '');
                        }
                    }));
                }
            }
            exportInfo[file] = provideList;
        } else if (path.extname(file) === '.vue') {
            exportInfo[file] = VUE_MODULE;
        }
    }
    return exportInfo;
}

// TODO: be abandoned
// const getImportRegs = () => {
//     // TODO: 无法检测此情况的无效导出
//     // 1. export xxx; xxx = {a, b} 暂时无法支持
//     // import { a } from 'xxxx';
//     // 2. export { a, b} 可以支持
//     // import all from 'xxx';
//     return [
//         // import {xxx|xxx as yyy} form  xxxxxx
//         /import\s+{(?<provide>[\w\W]+?)}\s+from\s+['"](?<modulePath>.+?)['"]/g,
//         // import xxx|xxx as yyy form  xxxxxx
//         /import\s+(?<provide>[^{}]+?)\s+from\s+['"](?<modulePath>.+?)['"]/g
//     ]
// }

const getImportInfo = (fileList) => {
    const importInfo = {};
    for (const file of fileList) {
        const content = fs.readFileSync(file, {
            encoding: 'utf-8'
        });
        let matchResult;
        const deconstructionReg = /import\s+{(?<provide>[\w\W]+?)}\s+from\s+['"](?<modulePath>.+?)['"]/g;
        const constructionReg = /import\s+(?<provide>[^{}]+?)\s+from\s+['"](?<modulePath>.+?)['"]/g;
        // 解构
        while ((matchResult = deconstructionReg.exec(content))) {
            const { provide, modulePath } = matchResult.groups;
            const filePath = speculatePath(modulePath, file);
            if (filePath) {
                const provideList = provide.split(',').map(item => item.split(' as ')[0].replace(/\s/g, ''))
                if (!importInfo[filePath]) {
                    importInfo[filePath] = new Set(provideList);
                } else if (importInfo[filePath] != IMPORT_ALL) {
                    importInfo[filePath].add(...provideList);
                }
            }
        }
        // 非解构
        while ((matchResult = constructionReg.exec(content))) {
            const { modulePath } = matchResult.groups;
            const filePath = speculatePath(modulePath, file);
            if (filePath) {
                importInfo[filePath] = IMPORT_ALL;
            }
        }
    }
    return importInfo;
}

const getRelationshipMapNodes = (fileList, rootBusinessPath) => {
    const rootPath = getProjectRoot();
    const bufferLeft = 50;
    const bufferTop = 50;
    let rootFile = '';
    const componentFileList = [];
    const noncomponentFileList = [];
    fileList.forEach(file => {
        if (file == rootBusinessPath) {
            rootFile = file;
        } else if (path.extname(file) === '.vue') {
            componentFileList.push(file);
        } else {
            let category = 'Other';
            if (file.startsWith(`${rootPath}/constant`)) {
                category = 'Constant';
            } else if(file.startsWith(`${rootPath}/config`)) {
                category = 'Config';
            } else if(file.startsWith(`${rootPath}/service`)) {
                category = 'Service';
            } else if(file.startsWith(`${rootPath}/util`)) {
                category = 'Util';
            }
            noncomponentFileList.push({
                file,
                category
            })
        }
    });
    const nodes = [];
    if(!rootFile) return nodes;
    const columnCount = 10;
    const columnWidth = 1000 / columnCount;
    const rowHeight = 160;
    const getRandomPosition = (row, column) => {
        return {
            x: bufferLeft + (column + 0.3 + 0.4 * Math.random()) * columnWidth,
            y: bufferTop + (row + + 0.2 + 0.6 * Math.random()) * rowHeight
        }
    } 
    let maxColumn = 0;
    let row = 1;
    let column = 0;
    for(const file of componentFileList) {
        nodes.push({
            id: file,
            name: file.replace(rootPath, ''),
            path: file,
            category: 'VueComponent',
            ...getRandomPosition(row, column)
        })
        if(column == columnCount - 1) row ++; 
        maxColumn = Math.max(column, maxColumn);
        column = (column + 1) % columnCount
    };
    if(column != 0) row ++;
    column = 0;
    for(const fileInfo of noncomponentFileList) {
        nodes.push({
            id: fileInfo.file,
            name: fileInfo.file.replace(rootPath, ''),
            path: fileInfo.file,
            category: fileInfo.category,
            ...getRandomPosition(row, column)
        })
        if(column == columnCount - 1) row ++; 
        maxColumn = Math.max(column, maxColumn);
        column = (column + 1) % columnCount
    };
    nodes.push({
        id: rootFile,
        name: rootFile.replace(rootPath, ''),
        path: rootFile,
        category: 'Root',
        x: bufferLeft + maxColumn * columnWidth / 2,
        y: bufferTop + rowHeight / 2 
    });
    return nodes;
}

const getRelationshipMapLinkInfo = (fileList) => {
    const links = [];
    const fileValueMap = new Map();
    for (const targetFile of fileList) {
        const content = fs.readFileSync(targetFile, {
            encoding: 'utf-8'
        });
        const regReferences = getImportPathRegs();
        let value = 0;
        for (const reg of regReferences) {
            let matchResult;
            while ((matchResult = reg.exec(content))) {
                const { modulePath } = matchResult.groups;
                const sourceFile = speculatePath(modulePath, targetFile);
                if(!sourceFile) continue;
                value ++;
                links.push({
                    source: sourceFile,
                    target: targetFile,
                })
            }
        }
        fileValueMap.set(targetFile, value);
    }
    return { links, fileValueMap };
}

module.exports = {
    getProjectRoot,
    getBusinessFileList,
    getBusinessRootFileList,
    getFileLineCount,
    getImportedFileSet,
    getIconUri,
    getExportInfo,
    getImportInfo,
    getRelationshipMapNodes,
    getRelationshipMapLinkInfo
}