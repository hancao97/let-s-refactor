const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { includedFileSubfixes, excludedDirs } = require('../configs/index');

const isDir = (path) => {
  const state = fs.statSync(path);
  return !state.isFile();
}

const getProjectSrc = () => {
  const rootInfo = vscode.workspace.workspaceFolders[0];
  if (!rootInfo) {
      vscode.window.showInformationMessage('no root!');
      return '';
  }
  const srcPath = path.join(rootInfo.uri.fsPath, '/src');
  if(!fs.existsSync(srcPath)) {
    vscode.window.showInformationMessage('no src directory!');
      return '';
  }
  return srcPath;
}

const getFileList = (dirPath) => {
  let dirSubItems = fs.readdirSync(dirPath);
  const fileList = [];
  for (const item of dirSubItems) {
      const childPath = path.join(dirPath, item);
      if (isDir(childPath) && !excludedDirs.has(item)) {
          fileList.push(...getFileList(childPath));
      } else if (!isDir(childPath) && includedFileSubfixes.has(path.extname(item))) {
          fileList.push(childPath);
      }
  }
  return fileList;
}

const speculatePath = (source, basicPath) => {
  let _source;
  if (source.startsWith('@/')) {
      const srcPath = getProjectSrc();
      _source = `${srcPath}${source.replace('@', '')}`
  } else {
      _source = path.join(path.dirname(basicPath), source);
  }
  if (fs.existsSync(_source) && !isDir(_source)) {
      return _source;
  }
  let speculatedPath;
  if (fs.existsSync(_source) && isDir(_source)) {
      speculatedPath = path.join(_source, '/index.js');
      if (fs.existsSync(speculatedPath)) {
          return speculatedPath;
      }
      speculatedPath = path.join(_source, '/index.vue');
      if (fs.existsSync(speculatedPath)) {
          return speculatedPath;
      }
      return null;
  }
  if (!fs.existsSync(_source)) {
    speculatedPath = `${_source}.js`;
      if (fs.existsSync(speculatedPath)) {
          return speculatedPath;
      }
      speculatedPath = `${_source}.vue`;
      if (fs.existsSync(speculatedPath)) {
          return speculatedPath;
      }
      return null;
  }
  return null;
}

const readFileAndIgnoreComments = (file) => {
  const lines = [];
  const content = fs.readFileSync(file, {
    encoding: 'utf-8'
  });
  const contentLines = content.split('\n')
  for(const line of contentLines) {
    if(!/\/\//.test(line)) {
      lines.push(line);
    } else {
      const formattedLine = line.replace(/\/\/.+/, '')
      if(!/^\s*$/.test(formattedLine)) {
        lines.push(formattedLine);
      }
    }
  }
  return lines.join('\n');
}

module.exports = {
  isDir,
  getProjectSrc,
  getFileList,
  speculatePath,
  readFileAndIgnoreComments
}