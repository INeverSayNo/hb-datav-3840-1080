import styled from "styled-components";

import leftRail from "@/assets/child-title-left-bg.webp";
import rightRail from "@/assets/child-title-right-bg.webp";

const Wrapper = styled.div<{ $align: "left" | "right" }>`
  position: relative;
  height: 112px;
  width: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: ${({ $align }) =>
    $align === "right" ? "flex-end" : "flex-start"};
`;

const Rail = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 98px;
  object-fit: fill;
  pointer-events: none;
`;


const Title = styled.h2<{ $align: "left" | "right" }>`
  position: relative;
  z-index: 1;
  margin: -15px ${({ $align }) => ($align === "right" ? 130 : 128)}px 0;
  color: #fff;
  font-family: "YouSheBiaoTiHei", "Microsoft YaHei", sans-serif;
  font-size: 80px;
  font-weight: 400;
  line-height: 82px;
  letter-spacing: 6px;
  white-space: nowrap;
  text-shadow: 0 5px 7px rgba(0, 0, 0, 0.62), 0 0 14px rgba(83, 218, 255, 0.5);
`;

export default function SectionTitle({
  children,
  align = "left",
}: {
  children: string;
  align?: "left" | "right";
}) {
  return (
    <Wrapper $align={align}>
      <Rail src={align === "right" ? rightRail : leftRail} alt="" />
      <Title $align={align}>{children}</Title>
    </Wrapper>
  );
}
