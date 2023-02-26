const { TreeItem, window, TreeItemCollapsibleState, ThemeIcon } = require('vscode');
const { getProjectSrc } = require('../utils/common');
class Node extends TreeItem {
    constructor(label, collapsibleState, path) {
        super(label, collapsibleState);
        if(path) {
            this.iconPath = new ThemeIcon('file');
            this.command = {
                title: String(label),
                command: 'viewArchitecture', 
                tooltip: String(label),  
                arguments: [  
                    path
                ]
            }
        } else {
            this.iconPath = new ThemeIcon('preview');
        }
    } 
}
class ArchitectureViewProvider {
    constructor(rootFileList) {
        const rootPath = getProjectSrc();
        this.rootFileList = rootFileList.map(file => ({
            label: file.replace(rootPath, ''),
            path: file
        }))
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if(!element) {
            return [new Node('点击根业务文件以查看其架构', TreeItemCollapsibleState['Expanded'])];
        } else {
            return this.rootFileList.map(file => new Node(file.label, TreeItemCollapsibleState['None'], file.path));
        }
    }

    static initTreeView(rootFileList) {
        const architectureViewProvider = new ArchitectureViewProvider(rootFileList);
        window.createTreeView('refactorView-main', {
            treeDataProvider: architectureViewProvider
        });
    }
}

module.exports = {
    ArchitectureViewProvider
}

