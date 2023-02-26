const { TreeItem, window, TreeItemCollapsibleState, ThemeIcon } = require('vscode');
const { getProjectSrc } = require('../utils/common');
class Node extends TreeItem {
    constructor(label, collapsibleState, options = {}) {
        const { icon, path } = options;
        super(label, collapsibleState);
        this.iconPath = new ThemeIcon(icon);
        if(path) {
            this.path = path;
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
class UnusedExportViewProvider {
    constructor(unusedExport) {
        const rootPath = getProjectSrc();
        this.unusedExport = unusedExport;
        this.unusedExportList = Object.keys(unusedExport).map(filePath => {
            return {
                label: filePath.replace(rootPath, ''),
                path: filePath,
                unusedExportList: unusedExport[filePath],
                count: unusedExport[filePath].length
            }
        })
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if(!element) {
            return [
                new Node('心灵需要净土，代码也是', TreeItemCollapsibleState['None'], { icon: 'quote'}),
                ...this.unusedExportList.map(item => {
                    return new Node(`${item.label}（共${item.count}条无效导出）`, TreeItemCollapsibleState['Expanded'], { path: item.path, icon: 'file'});
                })
            ]
        } else {
            return this.unusedExport[element.path].map(exportItem => new Node(exportItem, TreeItemCollapsibleState['None'], { path: element.path, icon: 'stop'}))
        }
    }

    static initTreeView(unusedExport) {
        const unusedFileViewProvider = new UnusedExportViewProvider(unusedExport);
        window.createTreeView('refactorView-main', {
            treeDataProvider: unusedFileViewProvider
        });
    }
}

module.exports = {
    UnusedExportViewProvider
}

