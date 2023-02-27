const fs = require('fs');
const path = require('path');
const { DEFAULT, IMPORT_ALL, VUE_MODULE } = require('../constants/index');

const { getProjectSrc, getFileList, speculatePath, readFileAndIgnoreComments } = require('./common');

const getBusinessFileList = () => {
    const dirPath = getProjectSrc();
    if (!dirPath) return [];
    return getFileList(dirPath);
}

const getFileLineCount = (fileList) => {
    let lineCount = 0;
    const hugeFileList = []
    for (const file of fileList) {
        const content = fs.readFileSync(file, {
            encoding: 'utf-8'
        });
        const fileLineCount = content.split('\n').length
        if (fileLineCount >= 500) {
            hugeFileList.push({
                file,
                lineCount: fileLineCount
            })
        }
        lineCount += fileLineCount;
    }
    hugeFileList.sort((a, b) => b.lineCount - a.lineCount);
    return {
        lineCount,
        hugeFileList
    };
}

const getBusinessRootFileList = () => {
    const projectRoot = getProjectSrc();
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

const getImportPathRegs = () => {
    return [
        // import * from './example'
        /(?<statement>import\s+[\w\W]*?\s+from\s+['"](?<modulePath>.+?)['"])/g,
        // import('./example')
        /(?<statement>import\(['"](?<modulePath>.+?)['"]\))/g,
        // import './example'
        /(?<statement>import\s+['"](?<modulePath>.+?)['"])/g
    ]
}

const getEffectiveFileSet = (fileList, set = new Set([])) => {
    const _fileList = [];
    for (const file of fileList) {
        if (set.has(file)) {
            continue;
        }
        set.add(file);
        const content = readFileAndIgnoreComments(file);
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
    if (_fileList.length) getEffectiveFileSet(_fileList, set);
    return set;
}

// export default
// export default a;
// export default () => {};
// export default class {}
// export default function() {}
// export default { a: 1, b }
//  除了 export default { a: 1, b } 情况，不需要考虑其名称

// export 其他

// export const/let/var { a: A, b } = xxx
// export { a as A, b }

// export const/let/var a = xxx
// export function fn() {}
// export class A {}

// 总结: export default
// 总结: export const/let/var/class/function xxx
// 总结：export const/let/var {a: A, b} 取 A
// 总结：export default {a: A, b} 取 a
// 总结：export { a as A, b } 取 A

const defaultExortReg = /export\s+default\s+/g;
const normalExportReg = /export\s+(const|let|var|class|function)\s+(?<exported>[\w-]+)/g;
const normalObjectExportReg = /export\s+(const|let|var)\s+{(?<exported>[\w\W]+?)}/g;
const defaultObjectExportReg = /export\s+default\s+{(?<exported>[\w\W]+?)}/g;
const ObjectExportReg = /export\s+{(?<exported>[\w\W]+?)}/g;

const getExportInfo = (fileList) => {
    const exportInfo = {};
    for (const file of fileList) {
        const extname = path.extname(file);
        if (extname === '.vue') {
            exportInfo[file] = VUE_MODULE;
        } else if (extname === '.js') {
            const content = readFileAndIgnoreComments(file);
            const exportList = [];
            let matchResult;
            if (defaultExortReg.exec(content)) {
                exportList.push(DEFAULT);
            }
            while ((matchResult = normalExportReg.exec(content))) {
                let { exported } = matchResult.groups;
                exportList.push(exported);
            }
            while ((matchResult = normalObjectExportReg.exec(content))) {
                let { exported } = matchResult.groups;
                exportList.push(...exported.split(',').map(item => {
                    const temp = item.split(':');
                    if (temp[1]) {
                        return temp[1].replace(/\s/g, '');
                    } else {
                        return temp[0].replace(/\s/g, '');
                    }
                }).filter(item => item));
            }
            while ((matchResult = defaultObjectExportReg.exec(content))) {
                let { exported } = matchResult.groups;
                exportList.push(...exported.split(',').map(item => {
                    const temp = item.split(':');
                    return temp[0].replace(/\s/g, '');
                }).filter(item => item));
            }
            while ((matchResult = ObjectExportReg.exec(content))) {
                let { exported } = matchResult.groups;
                exportList.push(...exported.split(',').map(item => {
                    const temp = item.split(' as ');
                    if (temp[1]) {
                        return temp[1].replace(/\s/g, '');
                    } else {
                        return temp[0].replace(/\s/g, '');
                    }
                }).filter(item => item));
            }
            if(exportList.length) {
                exportInfo[file] = [...new Set(exportList)];
            }
        }
    }
    return exportInfo;
}

const getImportInfo = (fileList) => {
    const importInfo = {};
    for (const file of fileList) {
        const content = readFileAndIgnoreComments(file);
        let matchResult;
        // 解构
        const deconstructionReg = /import\s+{(?<provide>[\w\W]+?)}\s+from\s+['"](?<modulePath>.+?)['"]/g;
        while ((matchResult = deconstructionReg.exec(content))) {
            const { provide, modulePath } = matchResult.groups;
            const filePath = speculatePath(modulePath, file);
            if (filePath) {
                const provideList = provide.split(',').map(item => item.split(' as ')[0].replace(/\s/g, '')).filter(item => item);
                if (!importInfo[filePath]) {
                    importInfo[filePath] = new Set(provideList);
                } else if (importInfo[filePath] != IMPORT_ALL) {
                    provideList.forEach(item => importInfo[filePath].add(item));
                }
            }
        }
        // 不解构
        const constructionRegs = [
            /import\s+(?<provide>[\w-]+?)\s+from\s+['"](?<modulePath>.+?)['"]/g,
            // import('example')
            /import\(['"](?<modulePath>.+?)['"]\)/g,
            // import './example'
            /import\s+['"](?<modulePath>.+?)['"]/g
        ]
        for (const reg of constructionRegs) {
            let matchResult;
            while ((matchResult = reg.exec(content))) {
                const { modulePath } = matchResult.groups;
                const filePath = speculatePath(modulePath, file);
                if (filePath) {
                    importInfo[filePath] = IMPORT_ALL;
                }
            }
        }
    }
    return importInfo;
}

const getRelationshipMapNodes = (fileList, rootBusinessPath) => {
    const rootPath = getProjectSrc();
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
            } else if (file.startsWith(`${rootPath}/config`)) {
                category = 'Config';
            } else if (file.startsWith(`${rootPath}/service`)) {
                category = 'Service';
            } else if (file.startsWith(`${rootPath}/util`)) {
                category = 'Util';
            }
            noncomponentFileList.push({
                file,
                category
            })
        }
    });
    const nodes = [];
    if (!rootFile) return nodes;
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
    for (const file of componentFileList) {
        nodes.push({
            id: file,
            name: file.replace(rootPath, ''),
            path: file,
            category: 'VueComponent',
            ...getRandomPosition(row, column)
        })
        if (column == columnCount - 1) row++;
        maxColumn = Math.max(column, maxColumn);
        column = (column + 1) % columnCount
    };
    if (column != 0) row++;
    column = 0;
    for (const fileInfo of noncomponentFileList) {
        nodes.push({
            id: fileInfo.file,
            name: fileInfo.file.replace(rootPath, ''),
            path: fileInfo.file,
            category: fileInfo.category,
            ...getRandomPosition(row, column)
        })
        if (column == columnCount - 1) row++;
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
                if (!sourceFile) continue;
                value++;
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
    getBusinessFileList,
    getBusinessRootFileList,
    getFileLineCount,
    getEffectiveFileSet,
    getExportInfo,
    getImportInfo,
    getRelationshipMapNodes,
    getRelationshipMapLinkInfo
}