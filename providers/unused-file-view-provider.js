const { TreeItem, window, TreeItemCollapsibleState } = require('vscode');
const { getProjectRoot, getIconUri } = require('../utils/index');
class Node extends TreeItem {
    constructor(label, collapsibleState, path) {
        super(label, collapsibleState);
        if(path) {
            this.iconPath = getIconUri('unused');
            this.command = {
                title: String(label),
                command: 'openFile', 
                tooltip: String(label),  
                arguments: [  
                    path
                ]
            }
        }
    }
}
class UnusedFileViewProvider {
    constructor(unusedFileList) {
        const rootPath = getProjectRoot();
        this.unusedFileList = unusedFileList.map(file => ({
            label: file.replace(rootPath, ''),
            path: file
        }));
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if(!element) {
            return [new Node(`无效业务文件总数：${this.unusedFileList.length} 个`, TreeItemCollapsibleState['Expanded'])];
        } else {
            return this.unusedFileList.map(file => new Node(file.label, TreeItemCollapsibleState['None'], file.path))
        }
    }

    static initTreeView(unusedFileList) {
        const unusedFileViewProvider = new UnusedFileViewProvider(unusedFileList);
        window.createTreeView('refactorView-main', {
            treeDataProvider: unusedFileViewProvider
        });
    }
}

module.exports = {
    UnusedFileViewProvider
}

