# Source Map Visualization React

一个基于 React 的 Source Map 可视化组件库，用于分析 JavaScript 源码映射数据。

- demo 地址：https://byte-n.github.io/source-map-visualization-react

## 关于

本库参考并基于 [evanw/source-map-visualization](https://github.com/evanw/source-map-visualization) 项目进行开发，将原有的 JavaScript 实现封装为 React 组件，提供了更好的集成性和可定制性。

### 本库特色

- 🎨 **React 组件化**: 提供完整的 React 组件封装
- 🎯 **高度可定制**: 支持自定义样式、渲染函数和主题
- 🌙 **主题支持**: 内置 Ant Design 主题系统，支持亮色/暗色主题切换
- 🎨 **Ant Design 集成**: 提供基于 Ant Design 的完整示例
- 📱 **响应式设计**: 自适应不同屏幕尺寸
- ⚡ **高性能**: 继承原项目的高性能特性，支持大型 Source Map

## 安装

```bash
npm install @byte.n/source-map-visualization-react
```

## 快速开始

```tsx
import React, { useRef } from 'react';
import SourceMapVisualization, {
  type SourceMapVisualizationProps,
} from '@byte.n/source-map-visualization-react';

export default () => {
  const ref = useRef<{ ele: HTMLDivElement }>(null);
  return (
    <div style={{ width: 800, height: 600 }}>
      <SourceMapVisualization
        ref={ref as any}
        code={'/* minified code here */'}
        codeMap={'/* source map string or data url */'}
      />
    </div>
  );
};
```

- **最小必需属性**: `code`
- **可选属性**: `codeMap`、`codeMapStyle`、`hoverRestoreDelayMs`、`prefixCls`、`className`、`classNames`、`style`、`styles`、`renderTopBar`、`renderBottomBar`

## 类型

`@types` 已内置，无需额外安装：

```ts
import type {
  SourceMapVisualizationProps,
  TopBarProps,
  BottomBarProps,
  CodeHover,
  SourceCodeHover,
  CodeMapStyle,
  Instance,
} from '@byte.n/source-map-visualization-react';
```

## 文档

详细的 API 文档和使用示例请参考 [文档站点](https://byte-n.github.io/source-map-visualization-react/)。

## 许可证

MIT License
