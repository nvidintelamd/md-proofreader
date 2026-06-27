# MD 小节校对工具

基于 Electron + React + Zustand 的 Markdown 校对桌面应用，用于校对从 PDF 拆分出的多份 .md 文件。

## 快速开始

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build          # 构建
npm run build:win      # Windows x64 安装包
npm run build:arm      # Windows ARM64 安装包
```

## 核心功能

- **多文件管理**：批量打开 MD 文件，左栏文件列表，可拖拽排序
- **逐篇校对**：一篇一篇校对，"完成本篇校对"自动跳下一篇
- **Vim 风格导航**：hjkl 移动、v 选区、PageUp/Down 翻页
- **编辑弹窗**：双击/v/Enter 进入编辑，支持 Tab 缩进、LaTeX 工具栏
- **正则替换**：Ctrl+F 查找替换，支持多行正则（gms flag）
- **正则管理器**：编辑(E)菜单 → 批量导入规则、排序组打包为单按钮
- **HTML 表格**：自动美化/压缩，"表转MD"一键转换
- **MD 渲染**：标题、粗体、斜体、代码、删除线、高亮、链接、引用、列表、数学公式（KaTeX）、图片、表格

## 配置文件位置

所有用户数据存储在系统 `%APPDATA%/md-proofreader/` 目录下：

| 文件 | 内容 |
|------|------|
| `session.json` | 会话状态：打开的文件列表、校对完成状态、底栏正则按钮、套用按钮 |
| `permanent.json` | 永久正则规则库 + 选配组（从正则管理器创建） |

### 恢复配置（换电脑/重装）

1. 克隆仓库：`git clone https://github.com/nvidintelamd/md-proofreader.git`
2. `npm install`
3. 将 `config/` 目录下的文件复制到 `%APPDATA%/md-proofreader/`：
   - `config/permanent.json` → `%APPDATA%/md-proofreader/permanent.json`
   - `config/session.json` → `%APPDATA%/md-proofreader/session.json`
4. `npm run dev`

> 仓库 `config/` 目录下的 JSON 文件是配置备份，程序运行时读取的是 `%APPDATA%` 下的文件。

## 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| Ctrl+F | 打开查找替换 |
| Ctrl+S | 保存当前文件 |
| Ctrl+Z | 撤销 |
| Ctrl+V | 粘贴（支持图片） |
| hjkl / 方向键 | 移动光标 |
| v / Enter | 进入选区/编辑模式 |
| ESC | 取消选区/退出编辑 |
| PageUp/Down | 翻页 |

## 技术栈

- Electron + React 18 + TypeScript
- Zustand（状态管理）
- Tailwind CSS（样式）
- KaTeX（数学公式渲染）
- markdown-it（已弃用，改为自定义逐行渲染）

## 项目结构

```
src/
├── main/           # Electron 主进程（文件读写、IPC）
├── preload/        # 预加载脚本（contextBridge）
└── renderer/       # React 应用
    ├── components/ # UI 组件
    ├── hooks/      # 自定义 hooks
    ├── lib/        # 工具函数
    ├── store/      # Zustand store
    └── styles/     # CSS
```
