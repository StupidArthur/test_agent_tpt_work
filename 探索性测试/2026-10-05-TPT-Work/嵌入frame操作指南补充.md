# 操作指南补充（待审核）

拟合并至：02-测试方法与技术参考/portable-agent-exe-ui-api-guide.md，第 2.4 节。审核状态：待审核。

#### Electron 页面中的嵌入 frame

部分“更多”模块的内容运行在 iframe 内。若外层 page.locator("body").innerText() 只看到侧栏或文字不全，先枚举 page.frames()，记录各 frame 的 URL 并读取对应 frame 的正文；确认目标后使用该 Frame 或 page.frameLocator(...) 定位控件。只有目标 frame 自身的内容也为空或报错、且等待与重查后仍如此，才判为页面加载异常。不要把跨 frame 的 locator 当作页面级 locator 使用。

