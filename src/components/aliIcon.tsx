import type { CSSProperties, SVGProps } from "react";

export interface DcIconProps extends Omit<SVGProps<SVGSVGElement>, "width" | "height"> {
  /** 图标名称 */
  name: string;
  /** 宽度（单位 rem） */
  width?: number | string;
  /** 高度（单位 rem） */
  height?: number | string;
  /** 自定义 className，默认 "dc-mobile-icon" */
  className?: string;
  style?: CSSProperties;
}

export default function DcIcon(props: DcIconProps) {
  const {
    name,
    width = 60,
    height = 60,
    className = "dc-mobile-icon",
    ...rest
  } = props;

  return (
    <svg
      className={className}
      aria-hidden="true"
      width={`${width}px`}
      height={`${height}px`}
      {...rest}
    >
      <use xlinkHref={`#${className}-${name}`} />
    </svg>
  );
}