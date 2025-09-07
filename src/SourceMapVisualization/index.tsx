import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import init, { CodeHover, CodeMapStyle, Instance, SourceCodeHover } from './init';
import useStyle from './useStyle';
import DefaultTopBar from './DefaultTopBar';
import DefaultBottomBar from './DefaultBottomBar';

export interface SourceMapVisualizationProps {
  code?: string;
  codeMap: string;
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
    const [minifyRow, setMinifyRow] = useState<number>(28);
    const [minifyCol, setMinifyCol] = useState<number>(16);

    const codeMapRef = useRef<Instance>();
    useEffect(() => {
      canvasRef.current.width = canvasRef.current.parentElement.clientWidth;
      canvasRef.current.height = canvasRef.current.parentElement.clientHeight;
      codeMapRef.current = init({
        code: code ? code : '',
        codeMap: codeMap ? codeMap : '',
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
            <DefaultTopBar
              selectedFile={selectedFile}
              filesList={filesList}
              onSelectFile={(value) => {
                codeMapRef.current?.selectSourceFile(value);
                setSelectedFile(value);
              }}
              prefixCls={prefixCls}
              minifyRow={minifyRow}
              minifyCol={minifyCol}
              onMinifyRowChange={setMinifyRow}
              onMinifyColChange={setMinifyCol}
              onToMinify={(row, col) => {
                codeMapRef.current?.toMinify(row, col);
              }}
            />
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
             <DefaultBottomBar
              sourceCodeHover={sourceCodeHover}
              otherHover={otherHover}
              minifyCodeHover={minifyCodeHover}
              prefixCls={prefixCls}
             />
            )
          }
        </div>
      </div>,
    );
  },
);
