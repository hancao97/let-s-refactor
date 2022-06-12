# let-s-refactor
> 作者：寒草  
> 微信：hancao97

当我们接手一个项目，可能会存在以下问题：

- 无效的历史文件堆积
- 无效的 export 难以清理
- 项目内引用关系凌乱难以梳理
- ...

项目历史越悠久，迭代版本越多以上问题便更加凸显，在插件作者经历过项目重构并最终删除项目中 48% 代码的经历下，将人肉扫描文件并删除无效代码或文件的过程自动化，并实现以下功能：

- 查看本项目的业务文件数以及代码行数
- 展示项目内的无效文件
- 展示项目的无效 es-module 导出
- 展示项目内依赖关系图







