import React from 'react';
import { BottomBarProps } from './index';

export interface DefaultBottomBarProps extends BottomBarProps {
  prefixCls: string;
}

const DefaultBottomBar: React.FC<DefaultBottomBarProps> = ({
  sourceCodeHover,
  otherHover,
  minifyCodeHover,
  prefixCls,
}) => {
  return (
    <>
      <div className={`${prefixCls}-bottom-bar-default-left`}>
        {sourceCodeHover &&
          `[${sourceCodeHover.row}:${sourceCodeHover.col}], ${sourceCodeHover.source}`}
      </div>
      <div className={`${prefixCls}-bottom-bar-default-right`}>
        <div>
          {otherHover
            ? `mouse: [${otherHover.row}:${otherHover.col}]`
            : ''}
        </div>
        <div>
          {minifyCodeHover &&
            `[${minifyCodeHover.row}:${minifyCodeHover.col}]`}
        </div>
      </div>
    </>
  );
};

export default DefaultBottomBar;
