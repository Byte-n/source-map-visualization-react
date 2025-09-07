import React from 'react';
import { TopBarProps } from './index';

export interface DefaultTopBarProps extends TopBarProps {
  prefixCls: string;
  minifyRow: number;
  minifyCol: number;
  onMinifyRowChange: (value: number) => void;
  onMinifyColChange: (value: number) => void;
  onToMinify: (row: number, col: number) => void;
}

const DefaultTopBar: React.FC<DefaultTopBarProps> = ({
  selectedFile,
  filesList,
  onSelectFile,
  prefixCls,
  minifyRow,
  minifyCol,
  onMinifyRowChange,
  onMinifyColChange,
  onToMinify,
}) => {
  return (
    <>
      <div className={`${prefixCls}-source`}>
        <span>source</span>
        <select
          className={`${prefixCls}-default-select`}
          value={selectedFile}
          onChange={(e) => {
            onSelectFile(e.target.selectedIndex);
          }}
        >
          {filesList
            ? filesList.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))
            : 'loading...'}
        </select>
      </div>
      <div className={`${prefixCls}-minify`}>
        <span>minify</span>
        <label>
          row
          <input
            type="number"
            value={minifyRow}
            onChange={(e) => onMinifyRowChange(Number(e.target.value))}
            placeholder="行号"
            style={{ width: '60px', marginInline: '5px' }}
          />
        </label>
        <label>
          col
          <input
            type="number"
            value={minifyCol}
            onChange={(e) => onMinifyColChange(Number(e.target.value))}
            placeholder="列号"
            style={{ width: '60px', marginInline: '5px' }}
          />
        </label>
        <button onClick={() => onToMinify(minifyRow, minifyCol)}>
          go
        </button>
      </div>
    </>
  );
};

export default DefaultTopBar;
