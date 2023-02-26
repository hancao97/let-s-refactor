const { TreeItem, window, TreeItemCollapsibleState, ThemeIcon } = require('vscode');
const { getProjectSrc } = require('../utils/common');
const None = TreeItemCollapsibleState['None'];
const nodeConfigs = {
    fileCount: {
        title: '文件数',
        unit: '个',
        icon: 'file',
        state: 'None'
    },
    lineCount: {
        title: '代码行数',
        unit: '行',
        icon: 'code',
        state: 'None'
    },
    hugeFileList: {
        title: '大文件数',
        unit: '个',
        icon: 'files',
        state: 'Expanded'
    }
}
class Node extends TreeItem {
    constructor(label, collapsibleState, icon, info) {
        super(label, collapsibleState);
        this.iconPath = new ThemeIcon(icon);
        if(info) {
            this.command = {
                title: String(label),
                command: 'openFile', 
                tooltip: String(label),  
                arguments: [  
                    info.file
                ]
            }
        }
    }
}
class CountViewProvider {
    constructor(countInfo) {
        this.countInfo = countInfo;
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if(!element) {
            const keys = Object.keys(nodeConfigs);
            const items = keys.map(key => {
                const config = nodeConfigs[key];
                const count = this.countInfo[key].length || this.countInfo[key] || 0;
                return new Node(
                    `${config.title}:  ${count} ${config.unit}`,
                    count ? TreeItemCollapsibleState[config.state] : None,
                    config.icon
                )
            })
            return [
                new Node('虽然我减肥失败，但是代码不能减肥失败！', None, 'quote'),
                ...items,
                new Node('统计信息为 src 目录下 .js 及 .vue 文件', None, 'alert'),
                new Node('大文件为文件行数 >= 500 行的文件', None, 'alert'),
            ];
        } else {
            const srcPath = getProjectSrc();
            return this.countInfo['hugeFileList'].map(info => {
                return new Node(
                    `(${info.lineCount}行) ${info.file.replace(srcPath, '')}`,
                    TreeItemCollapsibleState['None'],
                    'file',
                    info
                )
            })
        }
    }

    static initTreeView(tree) {
        const countViewProvider = new CountViewProvider(tree);
        window.createTreeView('refactorView-main', {
            treeDataProvider: countViewProvider
        });
    }
}

module.exports = {
    CountViewProvider
}

