# Heart Notes ❤️

一个温馨浪漫的便签墙应用，185张彩色便签优雅地组成爱心形状。

## ✨ 特性

- **爱心布局** - 185张便签精确排列成爱心形状
- **粒子光环** - 加载完成后的梦幻粒子波浪动画效果
- **拖拽交互** - 支持拖动、全屏、最小化等操作
- **主题切换** - 深色/浅色主题自由切换
- **背景音乐** - 可选的背景音乐播放功能
- **响应式设计** - 完美适配桌面端和移动端
- **温馨文案** - 70+ 条暖心祝福语
- **彩蛋惊喜** - 最后两张卡片藏有特殊文案

## 🎨 效果预览

- 爱心形状的便签墙布局
- 优雅的引导页设计
- 波浪式粒子光环动画
- 流畅的拖拽和交互体验

## 🛠️ 技术栈

- **纯原生开发** - Vanilla JavaScript (ES6 模块化)
- **现代CSS** - CSS3 动画和过渡效果
- **Canvas动画** - 粒子效果使用Canvas绘制
- **模块化架构** - 清晰的代码组织结构

## 📦 项目结构

```
Heart-Notes/
├── index.html                 # 主HTML文件
├── public/
│   ├── favicon.ico           # 网站图标
│   └── music.mp3             # 背景音乐
├── src/
│   ├── css/
│   │   └── styles.css        # 样式文件
│   └── js/
│       ├── app.js            # 应用入口
│       ├── cardManager.js    # 卡片管理
│       ├── particleEffect.js # 粒子动画效果
│       ├── audioManager.js   # 音频管理
│       ├── musicControlManager.js # 音乐控制
│       ├── themeManager.js   # 主题管理
│       ├── fullscreenManager.js # 全屏管理
│       ├── stateManager.js   # 状态管理
│       ├── config.js         # 配置文件
│       └── utils.js          # 工具函数
└── README.md
```

## 🚀 本地运行

```bash
# 使用Python
python -m http.server 8000

# 或使用Node.js
npx http-server -p 8000
```

然后访问 `http://localhost:8000`

## 🎯 核心功能

### 卡片交互
- 拖拽移动卡片位置
- 点击关闭按钮删除卡片
- 点击卡片自动置顶
- 支持最小化和全屏操作

### 视觉效果
- 爱心形状自动布局
- 卡片入场动画
- 粒子光环波浪效果
- 平滑的过渡动画

### 用户体验
- 优雅的引导页
- 主题自动适配
- 移动端友好设计
- 背景音乐氛围营造

## 📝 配置说明

可在 `src/js/config.js` 中自定义：
- 卡片数量和尺寸
- 动画速度和时长
- 文案内容
- 颜色主题
- 性能参数

## 📄 开源协议

MIT License

---

Designed & Maintained by [Luzhenhua](https://luzhenhua.cn/)
