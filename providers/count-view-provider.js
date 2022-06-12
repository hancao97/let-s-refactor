const { TreeItem, window, TreeItemCollapsibleState } = require('vscode');
const { getIconUri } = require('../utils/index');
const nodeConfigs = {
    fileCount: {
        title: '业务文件数',
        unit: '个',
        icon: 'file'
    },
    lineCount: {
        title: '业务代码行数',
        unit: '行',
        icon: 'code'
    }
}
class Node extends TreeItem {
    constructor(label, collapsibleState, icon) {
        super(label, collapsibleState);
        this.iconPath = getIconUri(icon);
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
                return new Node(
                    `${config.title}:  ${this.countInfo[key]} ${config.unit}`,
                    TreeItemCollapsibleState['None'],
                    config.icon
                )
            })
            return items;
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

