const { TreeItem, window, TreeItemCollapsibleState, ThemeIcon } = require('vscode');
const { getProjectSrc } = require('../utils/common');
class Node extends TreeItem {
    constructor(label, collapsibleState, options ={}) {
        super(label, collapsibleState);
        const { path, icon } = options;
        if(icon) this.iconPath = new ThemeIcon(icon);
        if(path) {
            this.iconPath = new ThemeIcon('stop');
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
    constructor(invalidFileList) {
        const rootPath = getProjectSrc();
        this.invalidFileList = invalidFileList.map(file => ({
            label: file.replace(rootPath, ''),
            path: file
        }));
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if(!element) {
            return [
                new Node('愿没有人是一座孤岛，代码文件也是', TreeItemCollapsibleState['None'], {icon: 'quote'}),
                new Node('统计信息为 src 目录下 .js 及 .vue 文件', TreeItemCollapsibleState['None'], {icon: 'alert'}),
                new Node(`无效文件总数：${this.invalidFileList.length} 个`, this.invalidFileList.length ? TreeItemCollapsibleState['Expanded'] : TreeItemCollapsibleState['None'])
            ];
        } else {
            return this.invalidFileList.map(file => new Node(file.label, TreeItemCollapsibleState['None'], {path: file.path}))
        }
    }

    static initTreeView(invalidFileList) {
        const unusedFileViewProvider = new UnusedFileViewProvider(invalidFileList);
        window.createTreeView('refactorView-main', {
            treeDataProvider: unusedFileViewProvider
        });
    }
}

module.exports = {
    UnusedFileViewProvider
}

