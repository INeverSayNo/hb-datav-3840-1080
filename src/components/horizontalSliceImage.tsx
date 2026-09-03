import styled from "styled-components";

const Root = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
`;

const Slice = styled.svg<{
  $left?: number;
  $right?: number;
  $width?: number;
}>`
  position: absolute;
  top: 0;
  bottom: 0;
  left: ${({ $left }) => ($left === undefined ? "auto" : `${$left}px`)};
  right: ${({ $right }) => ($right === undefined ? "auto" : `${$right}px`)};
  width: ${({ $left, $right, $width }) => {
    if ($width !== undefined) return `${$width}px`;
    if ($left !== undefined && $right !== undefined) {
      return `calc(100% - ${$left + $right}px)`;
    }
    return "auto";
  }};
  height: 100%;
`;

export interface HorizontalSliceImageProps {
  className?: string;
  src: string;
  sourceWidth: number;
  sourceHeight: number;
  leftWidth: number;
  rightWidth: number;
}

function SliceImage({
  src,
  sourceWidth,
  sourceHeight,
}: Pick<HorizontalSliceImageProps, "src" | "sourceWidth" | "sourceHeight">) {
  return (
    <image
      href={src}
      x={0}
      y={0}
      width={sourceWidth}
      height={sourceHeight}
      preserveAspectRatio="none"
    />
  );
}

export default function HorizontalSliceImage({
  className,
  src,
  sourceWidth,
  sourceHeight,
  leftWidth,
  rightWidth,
}: HorizontalSliceImageProps) {
  const centerWidth = sourceWidth - leftWidth - rightWidth;

  return (
    <Root className={className} aria-hidden="true">
      <Slice
        $left={0}
        $width={leftWidth}
        viewBox={`0 0 ${leftWidth} ${sourceHeight}`}
        preserveAspectRatio="none"
      >
        <SliceImage
          src={src}
          sourceWidth={sourceWidth}
          sourceHeight={sourceHeight}
        />
      </Slice>
      <Slice
        $left={leftWidth}
        $right={rightWidth}
        viewBox={`${leftWidth} 0 ${centerWidth} ${sourceHeight}`}
        preserveAspectRatio="none"
      >
        <SliceImage
          src={src}
          sourceWidth={sourceWidth}
          sourceHeight={sourceHeight}
        />
      </Slice>
      <Slice
        $right={0}
        $width={rightWidth}
        viewBox={`${sourceWidth - rightWidth} 0 ${rightWidth} ${sourceHeight}`}
        preserveAspectRatio="none"
      >
        <SliceImage
          src={src}
          sourceWidth={sourceWidth}
          sourceHeight={sourceHeight}
        />
      </Slice>
    </Root>
  );
}
