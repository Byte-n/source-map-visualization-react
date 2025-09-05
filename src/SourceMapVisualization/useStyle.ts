import { Theme, useStyleRegister } from '@ant-design/cssinjs';
const theme = new Theme((designToken) => designToken);

export default (prefixCls: string) => {
  return useStyleRegister(
    {
      theme,
      token: {},
      path: [prefixCls],
    },
    () => ({
      // 基础样式
      [`.${prefixCls}`]: {
        display: 'flex',
        flexDirection: 'column',
        flexWrap: 'nowrap',
        gap: 6,
        width: '100%',
        height: '100%',

        [`.${prefixCls}-top-bar`]: {
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'nowrap',
          justifyContent: 'space-between',
          gap: 6,
          [`.${prefixCls}-source, .${prefixCls}-minify`]: {
            flex: 1,
            display: 'flex',
            gap: 6,
            flexDirection: 'row',
            flexWrap: 'nowrap',
          },
        },

        // 消除字体在垂直方向占的空隙，避免 resize -> flex 高度变化 -> resize -> ....
        [`.${prefixCls}-content`]: {
          flex: 1,
          display: 'flex',
          fontSize: 0,
        },

        [`.${prefixCls}-bottom-bar`]: {
          display: 'flex',
          gap: 6,

          [`.${prefixCls}-bottom-bar-default-left`]: {
            flex: 1,
          },

          [`.${prefixCls}-bottom-bar-default-right`]: {
            flex: 1,
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'nowrap',
          },
        },

        [`.${prefixCls}-default-select`]: {
          minWidth: '100px',
        },
      },
    }),
  );
};
