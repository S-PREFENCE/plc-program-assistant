# 掌上移动PLC编程助手 - H5在线版

<div align="center">
  <img src="https://img.shields.io/badge/Platform-H5-blue" alt="Platform">
  <img src="https://img.shields.io/badge/Framework-uni--app-007ACC" alt="Framework">
  <img src="https://img.shields.io/badge/Status-Online-green" alt="Status">
</div>

## 🌐 在线访问

**立即访问**: https://plc-assistant.github.io/plc-program-assistant

> 📱 推荐在微信内置浏览器中打开，可获得最佳体验

## ✨ 功能特性

### 📝 梯形图编程
- 🎯 Canvas图形化编辑器
- ✋ 触屏拖拽元件
- ↩️ 撤销/重做支持
- 🔀 分支结构支持

### ⚡ PLC仿真引擎
- 🖥️ 虚拟PLC实时仿真
- ⏱️ 定时器 (TON/TOF/TP/TONR)
- 🔢 计数器 (CTU/CTD/CTUD)
- 🔣 位逻辑 (NO/NC/Coil/边沿)

### 📊 在线监控
- 🌊 能流可视化动画
- 📱 输入状态模拟
- 💪 强制置位功能
- 📈 实时数据监控

### 🛠️ 工具集
- 📐 模拟量换算
- 🔄 进制转换
- ⏰ 定时器计算
- 📖 指令速查手册

## 🚀 快速开始

### 方式一：在线使用（推荐）
直接在微信或手机浏览器中访问上方链接即可使用

### 方式二：本地开发

```bash
# 克隆项目
git clone https://github.com/plc-assistant/plc-program-assistant.git
cd plc-program-assistant

# 安装依赖
npm install

# 运行开发服务器
npm run dev:h5

# 构建生产版本
npm run build:h5
```

## 📂 项目结构

```
plc-program-assistant/
├── src/
│   ├── pages/
│   │   ├── index/          # 首页
│   │   ├── projects/       # 项目列表
│   │   ├── editor/         # 梯形图编辑器
│   │   ├── monitor/        # 在线监控
│   │   ├── tools/          # 工具集
│   │   └── profile/        # 我的/变量表
│   ├── components/         # 公共组件
│   ├── engine/             # PLC仿真引擎
│   │   └── instructions/   # 指令实现
│   ├── store/              # 状态管理
│   ├── utils/              # 工具函数
│   └── styles/             # 样式文件
├── public/                 # 静态资源
├── .github/               # GitHub配置
│   └── workflows/          # CI/CD配置
└── package.json
```

## 🛠️ 技术栈

| 技术 | 说明 |
|------|------|
| [uni-app](https://uniapp.dcloud.net.cn/) | 跨平台框架 |
| Vue 3 | 前端框架 |
| TypeScript | 类型安全 |
| Pinia | 状态管理 |
| Canvas 2D | 梯形图渲染 |
| Vite | 构建工具 |

## 📱 支持平台

- ✅ 微信内置浏览器
- ✅ 手机浏览器
- ✅ 桌面浏览器
- ⚠️ 小程序（需另行编译）

## 🔧 部署说明

本项目配置了GitHub Actions自动部署到GitHub Pages。

每次推送到 `main` 分支都会自动触发构建和部署。

手动部署：
```bash
npm run build:h5
# 上传 dist/build/h5 目录到你的服务器
```

## 📄 License

MIT License

---

** Made with ❤️ for PLC programmers **
