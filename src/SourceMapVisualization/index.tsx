import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import init, { CodeHover, CodeMapStyle, Instance, SourceCodeHover } from './init';
import useStyle from './useStyle';

export interface SourceMapVisualizationProps {
  code: string;
  codeMap?: string;
  codeMapStyle?: CodeMapStyle;
  hoverRestoreDelayMs?: number;
  prefixCls?: string;
  className?: string;
  classNames?: {
    topBar?: string;
    content?: string;
    bottomBar?: string;
  };
  style?: React.CSSProperties;
  styles?: {
    topBar?: React.CSSProperties;
    content?: React.CSSProperties;
    bottomBar?: React.CSSProperties;
  };
  renderTopBar?: (props: TopBarProps) => React.ReactNode;
  renderBottomBar?: (props: BottomBarProps) => React.ReactNode;
}

export interface TopBarProps {
  selectedFile: number | null;
  filesList: { label: string; value: number }[] | null;
  onSelectFile: (value: number) => void;
}

export interface BottomBarProps {
  sourceCodeHover: SourceCodeHover | null;
  otherHover: CodeHover | null;
  minifyCodeHover: CodeHover | null;
}

export default forwardRef(
  (
    props: SourceMapVisualizationProps,
    ref: React.Ref<Instance & { ele: HTMLDivElement }>,
  ) => {
    const {
      code,
      codeMap,
      codeMapStyle,
      hoverRestoreDelayMs,
      prefixCls = 'source-map-vis',
      className,
      classNames,
      style,
      styles,
      renderTopBar,
      renderBottomBar,
    } = props;
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [filesList, setFilesList] =
      useState<{ label: string; value: number }[]>(null);
    const [selectedFile, setSelectedFile] = useState<number>();
    const [sourceCodeHover, setSourceCodeHover] =
      useState<SourceCodeHover | null>(null);
    const [minifyCodeHover, setMinifyCodeHover] = useState<CodeHover | null>(
      null,
    );
    const [otherHover, setOtherHover] = useState<CodeHover | null>(null);

    const codeMapRef = useRef<Instance>();
    useEffect(() => {
      canvasRef.current.width = canvasRef.current.parentElement.clientWidth;
      canvasRef.current.height = canvasRef.current.parentElement.clientHeight;
      codeMapRef.current = init({
        code,
        codeMap,
        canvas: canvasRef.current!,
        resize: true,
        hoverRestoreDelayMs,
        style: codeMapStyle,
        onSourceFileSelected: setSelectedFile,
        onSourceFileListChange: setFilesList,
        onSourceCodeHover: setSourceCodeHover,
        onMinifyCodeHover: setMinifyCodeHover,
        onOtherHover: setOtherHover,
      });
    }, []);

    useEffect(() => {
      if (!codeMapStyle) {
        return;
      }
      codeMapRef.current?.setStyle(codeMapStyle);
    }, [JSON.stringify(codeMapStyle)]);

    const styleRegister = useStyle(prefixCls);
    const boxRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(ref, () => ({
      ...codeMapRef.current!,
      ele: boxRef.current!,
    }));
    return styleRegister(
      <div className={`${prefixCls} ${className}`} style={style} ref={boxRef}>
        <div
          className={`${prefixCls}-top-bar ${classNames?.topBar}`}
          style={styles?.topBar}
        >
          {renderTopBar ? (
            renderTopBar({
              selectedFile,
              filesList,
              onSelectFile: setSelectedFile,
            })
          ) : (
            <>
              <div className={`${prefixCls}-source`}>
                <span>source</span>
                <select
                  className={`${prefixCls}-default-select`}
                  value={selectedFile}
                  onChange={(e) => {
                    codeMapRef.current.selectSourceFile(e.target.selectedIndex);
                    setSelectedFile(e.target.selectedIndex);
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
                <span>
                  minify
                </span>
                <button onClick={() => {
                  codeMapRef.current?.toMinify(28, 16);
                }}>
                  toMinify
                </button>
              </div>
            </>
          )}
        </div>
        <div
          className={`${prefixCls}-content ${classNames?.content}`}
          style={styles?.content}
        >
          <canvas ref={canvasRef}></canvas>
        </div>
        <div
          className={`${prefixCls}-bottom-bar ${classNames?.bottomBar}`}
          style={styles?.bottomBar}
        >
          {renderBottomBar ? (
            renderBottomBar({
              sourceCodeHover,
              otherHover,
              minifyCodeHover,
            })
          ) : (
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
          )}
        </div>
      </div>,
    );
  },
);
