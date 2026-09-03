import type { ComponentProps } from "react";
import styled from "styled-components";

const TitleWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 85px;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 5;
`;

export default function Headder(props: ComponentProps<typeof TitleWrapper>) {
  return <TitleWrapper {...props} />;
}
