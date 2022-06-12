const includedFileSubfixes = new Set([
    '.vue',
    '.js'
]);

const excludedDirs = new Set([
    'node_modules',
    '.git'
]);

const fileCategories = [
    { name: 'Root'},
    { name: 'VueComponent'},
    { name: 'Constant'},
    { name: 'Config'},
    { name: 'Service'},
    { name: 'Util'},
    { name: 'Other'},
] 

module.exports = {
    includedFileSubfixes,
    excludedDirs,
    fileCategories
}