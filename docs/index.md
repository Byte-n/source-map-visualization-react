# SourceMapVisualization

一个用于可视化 Source Map 的 React 组件库，帮助开发者直观地查看和调试 JavaScript 代码的 Source Map 映射关系。

## 关于

本库参考自 [evanw/source-map-visualization](https://github.com/evanw/source-map-visualization) 项目，将其核心功能封装为
React 组件，方便在 React 项目中使用。

## 基础使用

```tsx
import SourceMapVisualization from '@byte.n/source-map-visualization-react';
import React from 'react';

const exampleJS = `// index.tsx
import { h as u, Fragment as l, render as c } from "preact";

// counter.tsx
import { h as t, Component as i } from "preact";
import { useState as a } from "preact/hooks";
var n = class extends i {
  constructor(e) {
    super(e);
    this.n = () => this.setState({ t: this.state.t + 1 });
    this.r = () => this.setState({ t: this.state.t - 1 });
    this.state.t = e.e;
  }
  render() {
    return t("div", {
      class: "counter"
    }, t("h1", null, this.props.label), t("p", null, t("button", {
      onClick: this.r
    }, "-"), " ", this.state.t, " ", t("button", {
      onClick: this.n
    }, "+")));
  }
}, s = (r) => {
  let [o, e] = a(r.e);
  return t("div", {
    class: "counter"
  }, t("h1", null, r.o), t("p", null, t("button", {
    onClick: () => e(o - 1)
  }, "-"), " ", o, " ", t("button", {
    onClick: () => e(o + 1)
  }, "+")));
};

// index.tsx
c(
  u(l, null, u(n, {
    o: "Counter 1",
    e: 100
  }), u(s, {
    o: "Counter 2",
    e: 200
  })),
  document.getElementById("root")
);
//# sourceMappingURL=example.js.map
`;
const exampleMap = `{
  "version": 3,
  "sources": ["index.tsx", "counter.tsx"],
  "sourcesContent": ["import { h, Fragment, render } from 'preact'\\nimport { CounterClass, CounterFunction } from './counter'\\n\\nrender(\\n  <>\\n    <CounterClass label_=\\"Counter 1\\" initialValue_={100} />\\n    <CounterFunction label_=\\"Counter 2\\" initialValue_={200} />\\n  </>,\\n  document.getElementById('root')!,\\n)\\n", "import { h, Component } from 'preact'\\nimport { useState } from 'preact/hooks'\\n\\ninterface CounterProps {\\n  label_: string\\n  initialValue_: number\\n}\\n\\ninterface CounterState {\\n  value_: number\\n}\\n\\nexport class CounterClass extends Component<CounterProps, CounterState> {\\n  state: CounterState\\n\\n  constructor(props: CounterProps) {\\n    super(props)\\n    this.state.value_ = props.initialValue_\\n  }\\n\\n  increment_ = () => this.setState({ value_: this.state.value_ + 1 })\\n  decrement_ = () => this.setState({ value_: this.state.value_ - 1 })\\n\\n  render() {\\n    return <div class=\\"counter\\">\\n      <h1>{this.props.label}</h1>\\n      <p>\\n        <button onClick={this.decrement_}>-</button>\\n        {' '}\\n        {this.state.value_}\\n        {' '}\\n        <button onClick={this.increment_}>+</button>\\n      </p>\\n    </div>\\n  }\\n}\\n\\nexport let CounterFunction = (props: CounterProps) => {\\n  let [value, setValue] = useState(props.initialValue_)\\n  return <div class=\\"counter\\">\\n    <h1>{props.label_}</h1>\\n    <p>\\n      <button onClick={() => setValue(value - 1)}>-</button>\\n      {' '}\\n      {value}\\n      {' '}\\n      <button onClick={() => setValue(value + 1)}>+</button>\\n    </p>\\n  </div>\\n}\\n"],
  "mappings": ";AAAA,SAAS,KAAAA,GAAG,YAAAC,GAAU,UAAAC,SAAc;;;ACApC,SAAS,KAAAC,GAAG,aAAAC,SAAiB;AAC7B,SAAS,YAAAC,SAAgB;AAWlB,IAAMC,IAAN,cAA2BF,EAAsC;AAAA,EAGtE,YAAYG,GAAqB;AAC/B,UAAMA,CAAK;AAIb,SAAAC,IAAa,MAAM,KAAK,SAAS,EAAEC,GAAQ,KAAK,MAAMA,IAAS,EAAE,CAAC;AAClE,SAAAC,IAAa,MAAM,KAAK,SAAS,EAAED,GAAQ,KAAK,MAAMA,IAAS,EAAE,CAAC;AAJhE,SAAK,MAAMA,IAASF,EAAMI;AAAA,EAC5B;AAAA,EAKA,SAAS;AACP,WAAOR,EAAC;AAAA,MAAI,OAAM;AAAA,OAChBA,EAAC,YAAI,KAAK,MAAM,KAAM,GACtBA,EAAC,WACCA,EAAC;AAAA,MAAO,SAAS,KAAKO;AAAA,OAAY,GAAC,GAClC,KACA,KAAK,MAAMD,GACX,KACDN,EAAC;AAAA,MAAO,SAAS,KAAKK;AAAA,OAAY,GAAC,CACrC,CACF;AAAA,EACF;AACF,GAEWI,IAAkB,CAACL,MAAwB;AACpD,MAAI,CAACM,GAAOC,CAAQ,IAAIT,EAASE,EAAMI,CAAa;AACpD,SAAOR,EAAC;AAAA,IAAI,OAAM;AAAA,KAChBA,EAAC,YAAII,EAAMQ,CAAO,GAClBZ,EAAC,WACCA,EAAC;AAAA,IAAO,SAAS,MAAMW,EAASD,IAAQ,CAAC;AAAA,KAAG,GAAC,GAC5C,KACAA,GACA,KACDV,EAAC;AAAA,IAAO,SAAS,MAAMW,EAASD,IAAQ,CAAC;AAAA,KAAG,GAAC,CAC/C,CACF;AACF;;;AD9CAG;AAAA,EACEC,EAAAC,GAAA,MACED,EAACE,GAAA;AAAA,IAAaC,GAAO;AAAA,IAAYC,GAAe;AAAA,GAAK,GACrDJ,EAACK,GAAA;AAAA,IAAgBF,GAAO;AAAA,IAAYC,GAAe;AAAA,GAAK,CAC1D;AAAA,EACA,SAAS,eAAe,MAAM;AAChC;",
  "names": ["h", "Fragment", "render", "h", "Component", "useState", "CounterClass", "props", "increment_", "value_", "decrement_", "initialValue_", "CounterFunction", "value", "setValue", "label_", "render", "h", "Fragment", "CounterClass", "label_", "initialValue_", "CounterFunction"]
}
`;

export default () => {
  return (
    <div style={{ height: 500 }}>
      <SourceMapVisualization
        code={exampleJS}
        codeMap={exampleMap}
        hoverRestoreDelayMs={2000}
      />
    </div>
  );
};
```

## 自定义工具栏样式

下面用到了 tailwindcss 类名, antd 的组件：

```jsx | pure
import React from 'react';
import SourceMapVisualization from '@byte.n/source-map-visualization-react';
import { Flex, Space, Typography } from 'antd';
import { EnhanceSelect } from '@byte.n/antd-ext';

<SourceMapVisualization
  renderTopBar={
    ({ filesList, onSelectFile, selectedFile }) =>
      <Flex justify='space-between' className='w-full'>
        <Space className='flex-1'>
          <Typography.Text>Source</Typography.Text>
          <EnhanceSelect<number> options={filesList} className='min-w-32' onChange={onSelectFile}
                                 value={selectedFile}/>
        </Space>
        <div className='flex-1'>
          <Typography.Text>Minify</Typography.Text>
        </div>
      </Flex>
  }
  renderBottomBar={
    ({ sourceCodeHover, otherHover, minifyCodeHover }) =>
      <Flex justify='space-between' className='w-full' style={{ height: 30 }}>
        <Typography.Text className='flex-1'>
          {sourceCodeHover &&
            `[${sourceCodeHover.row}:${sourceCodeHover.col}], ${sourceCodeHover.source}`}
        </Typography.Text>
        <Flex justify='space-between' className='w-full flex-1'>
          <Typography.Text>
            {otherHover
              ? `mouse: [${otherHover.row}:${otherHover.col}]`
              : ''}
          </Typography.Text>
          <Typography.Text>
            {minifyCodeHover &&
              `[${minifyCodeHover.row}:${minifyCodeHover.col}]`}
          </Typography.Text>
        </Flex>
      </Flex>
  }
  code={exampleJS} codeMap={exampleMap}
/>
```

## Props 属性说明

### 基础属性

| 属性名         | 类型                  | 必填 | 默认值             | 说明                      |
| -------------- | --------------------- | ---- | ------------------ | ------------------------- |
| `code`         | `string`              | ✅   | -                  | 压缩后的 JavaScript 代码  |
| `codeMap`      | `string`              | ❌   | -                  | Source Map 的 JSON 字符串 |
| `codeMapStyle` | `CodeMapStyle`        | ❌   | -                  | Source Map 的样式配置     |
| `hoverRestoreDelayMs` | `number`       | ❌   | `2000`             | `toMinify` 触发的临时高亮在该毫秒后恢复原 hover；设为 `0` 则立即恢复 |
| `prefixCls`    | `string`              | ❌   | `'source-map-vis'` | CSS 类名前缀              |
| `className`    | `string`              | ❌   | -                  | 根容器的 CSS 类名         |
| `style`        | `React.CSSProperties` | ❌   | -                  | 根容器的内联样式          |

### 样式相关属性

| 属性名       | 类型                                                                                                | 说明              |
| ------------ | --------------------------------------------------------------------------------------------------- | ----------------- |
| `classNames` | `{ topBar?: string; content?: string; bottomBar?: string; }`                                        | 各部分的 CSS 类名 |
| `styles`     | `{ topBar?: React.CSSProperties; content?: React.CSSProperties; bottomBar?: React.CSSProperties; }` | 各部分的内联样式  |

### 自定义渲染属性

| 属性名            | 类型                                         | 说明                     |
| ----------------- | -------------------------------------------- | ------------------------ |
| `renderTopBar`    | `(props: TopBarProps) => React.ReactNode`    | 自定义顶部工具栏渲染函数 |
| `renderBottomBar` | `(props: BottomBarProps) => React.ReactNode` | 自定义底部工具栏渲染函数 |

## 实例方法

### `toMinify(row, col)`

- 功能：滚动并高亮压缩代码面板中位置为 `(row, col)` 的代码块，若存在映射则联动滚动到对应的源代码位置并绘制连线。
- 坐标说明：`row` 为 1 基（从 1 开始），`col` 为 0 基（从 0 开始）。
- 高亮恢复：受 `hoverRestoreDelayMs` 控制，默认 2000ms 后若无新的鼠标移动或再次调用将自动恢复原来的 hover 状态。

### 其他实例方法

- `selectSourceFile(index: number)`: 选择源文件面板的索引。
- `wrap(enabled: boolean)`: 开关自动换行。
- `setStyle(style: CodeMapStyle)`: 动态更新样式。
- `resize()`: 手动触发画布尺寸与像素比更新。
- `destroy()`: 移除事件与观察器，释放资源。
