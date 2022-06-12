const vscode = require('vscode');
const { getBusinessFileList, getBusinessRootFileList, getFileLineCount, getImportedFileSet, getExportInfo, getImportInfo, getRelationshipMapNodes, getRelationshipMapLinkInfo } = require('./utils/index');
const { CountViewProvider, UnusedFileViewProvider, UnusedExportViewProvider, ArchitectureViewProvider, createWebView } = require('./providers/index');
const { IMPORT_ALL, VUE_MODULE } = require('./constants/index');
const { basename } = require('path');
function activate(context) {
	const count = vscode.commands.registerCommand('let-s-refactor.count', () => {
		const fileList = getBusinessFileList();
		const fileCount = fileList.length;
		const lineCount = getFileLineCount(fileList);
		CountViewProvider.initTreeView({
			fileCount,
			lineCount
		});
	});

	const unusedFile = vscode.commands.registerCommand('let-s-refactor.unusedFile', () => {
		const businessFileList = getBusinessFileList();
		const businessRootFileList = getBusinessRootFileList();
		const importedFileSet = getImportedFileSet(businessRootFileList);
		const unusedFileList = businessFileList.filter(file => !importedFileSet.has(file));
		UnusedFileViewProvider.initTreeView(unusedFileList)
	})

	const unusedExport = vscode.commands.registerCommand('let-s-refactor.unusedExport', () => {
		const businessFileList = getBusinessFileList();
		const businessRootFileList = getBusinessRootFileList();
		const businessRootFileSet = new Set(businessRootFileList);
		const exportProviderList  = businessFileList.filter(file => !businessRootFileSet.has(file));
		// 全量 export
		const exportInfo = getExportInfo(exportProviderList);
		const importedFileSet = getImportedFileSet(businessRootFileList);
		const usedFileList = businessFileList.filter(file => importedFileSet.has(file));
		// 全量有效的import
		const importInfo = getImportInfo(usedFileList);
		const unusedExport = {};
		Object.keys(exportInfo).forEach(key => {
			if(exportInfo[key] === VUE_MODULE) {
				if(importInfo[key] !== IMPORT_ALL) unusedExport[key] = [VUE_MODULE];
			} else {
				if(!importInfo[key]) {
					unusedExport[key] = exportInfo[key];
				} else if(importInfo[key] != IMPORT_ALL) {
					const unusedExportList =  exportInfo[key].filter(exportItem => {
						return !importInfo[key].has(exportItem);
					})
					if(unusedExportList.length > 0) unusedExport[key] = unusedExportList; 
				}
			}
		});
		UnusedExportViewProvider.initTreeView(unusedExport);
	})

	const viewProjectArchitecture = vscode.commands.registerCommand('let-s-refactor.viewProjectArchitecture', () => {
		const businessRootFileList = getBusinessRootFileList();
		ArchitectureViewProvider.initTreeView(businessRootFileList);
	});

	const viewArchitecture  = vscode.commands.registerCommand('viewArchitecture', (path) => {
		if(!path) return;
		const importedFileList = [...getImportedFileSet([path])];
		const { links, fileValueMap } = getRelationshipMapLinkInfo(importedFileList);	
		const nodes = getRelationshipMapNodes(importedFileList, path).map(node => {
			const importCount = fileValueMap.get(node.path);
			return{
				...node,
				value: {
					importCount,
					baseName: basename(node.path)
				},
				symbolSize: 10 +  3 * importCount
			}
		});
		const webView = createWebView(context, vscode.ViewColumn.Active, {
			nodes,
			links
		});
		context.subscriptions.push(webView);
	});

	const openFile = vscode.commands.registerCommand('openFile', (path) => {
		if(!path) return;
		vscode.window.showTextDocument(vscode.Uri.file(path))
	});

	context.subscriptions.push(...[count, unusedFile, unusedExport, viewProjectArchitecture, viewArchitecture, openFile]);
}

function deactivate() {}
module.exports = {
	activate,
	deactivate
}
