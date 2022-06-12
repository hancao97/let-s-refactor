const { window } = require('vscode');
const { fileCategories } = require('../configs/index')
let webviewPanel;
function createWebView(context, viewColumn, { nodes, links }) {
    if (webviewPanel === undefined) {
        webviewPanel = window.createWebviewPanel(
            'spelling-check-statistics',
            'spelling-check-statistics',
            viewColumn,
            {
                retainContextWhenHidden: true,
                enableScripts: true
            }
        )
    } else {
        webviewPanel.reveal();
    }
    webviewPanel.webview.html = getHtml({ nodes, links });
    webviewPanel.onDidDispose(() => {
        webviewPanel = undefined;
    });
    return webviewPanel;
}

function getHtml({ nodes, links }) {
    const _height = Math.max(...nodes.map(node => node.y));
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document</title>
    </head>
    <body style="background: #fff;">
        <div id="test"></div>
        <div style="width: 100%;height: ${_height}px;;overflow: auto;">
            <div id="main" style="min-width: 100%;height: ${_height}px;"></div>
        </div>
        <script src="https://cdn.jsdelivr.net/npm/echarts@5.3.2/dist/echarts.min.js"></script>
        <script>
            var chartDom = document.getElementById('main');
            var myChart = echarts.init(chartDom);
            var option;
            option = {
                color: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'],
                legend: [
                    {
                      data: ${JSON.stringify(fileCategories)}.map(function (a) {
                        return a.name;
                      })
                    }
                ],
                tooltip: {
                    show: true,
                    trigger: 'item',
                    valueFormatter: (value) => value.importCount
                },
                animationDuration: 1500,
                animationEasingUpdate: 'quinticInOut',
                series: [
                  {
                    type: 'graph',
                    nodes: ${JSON.stringify(nodes)},
                    links: ${JSON.stringify(links)},
                    categories: ${JSON.stringify(fileCategories)},
                    label: {
                      show: true,
                      position: "bottom",
                      formatter: function (params) {
                        return params.value.baseName;
                    }
                    },
                    autoCurveness: 0.01, //多条边的时候，自动计算曲率
                    edgeSymbol: ["none", "arrow"], //边两边的类型
                    force: {
                        repulsion: 100,
                        gravity:0.01,
                        edgeLength:200
                    },
                    lineStyle: {
                        color: 'source',
                        curveness: 0.2,
                    },
                    emphasis: {
                        focus: 'adjacency',
                        lineStyle: {
                          width: 10
                        }
                      }
                  },
                ],
              };
            option && myChart.setOption(option);
        </script>
    </body>
    </html>
    `
}

module.exports = {
    createWebView
}