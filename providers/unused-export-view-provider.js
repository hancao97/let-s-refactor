const { TreeItem, window, TreeItemCollapsibleState, ThemeIcon } = require('vscode');
const { getProjectSrc } = require('../utils/common');
class Node extends TreeItem {
    constructor(label, collapsibleState, path) {
        super(label, collapsibleState);
        if(path) {
            this.iconPath = new ThemeIcon('file');
            this.path = path;
            this.command = {
                title: String(label),
                command: 'openFile', 
                tooltip: String(label),  
                arguments: [  
                    path
                ]
            }
        } else {
            this.iconPath = new ThemeIcon('stop');
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
            return this.unusedExportList.map(item => {
                return new Node(`${item.label}（共${item.count}条无效导出）`, TreeItemCollapsibleState['Expanded'], item.path);
            })
        } else {
            return this.unusedExport[element.path].map(exportItem => new Node(exportItem, TreeItemCollapsibleState['None'], element.path))
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

