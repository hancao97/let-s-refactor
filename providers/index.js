const { CountViewProvider } = require('./count-view-provider');
const { UnusedFileViewProvider } = require('./unused-file-view-provider');
const { UnusedExportViewProvider } = require('./unused-export-view-provider');
const { ArchitectureViewProvider } = require('./architecture-view-provider');
const { createWebView } = require('./web-view-provider');
module.exports = {
    CountViewProvider,
    UnusedFileViewProvider,
    UnusedExportViewProvider,
    ArchitectureViewProvider,
    createWebView
}