import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import styled from "styled-components";

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.65);
`;

const Content = styled.div<{ $width?: string; $height?: string }>`
  position: relative;
  width: ${({ $width }) => $width ?? "80vw"};
  height: ${({ $height }) => $height ?? "80vh"};
  display: flex;
  flex-direction: column;
  background: #0a2433;
  box-shadow: 0 0 40px rgba(45, 176, 238, 0.35);
  overflow: hidden;
  border-radius: 6px
`;

const Header = styled.header`
  flex-shrink: 0;
  height: 34px;
  padding: 0 20px 0 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(5, 36, 53, 0.9);
  border-bottom: 2px solid rgba(44, 169, 232, 0.4);
`;

const Title = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 3px;
  color: #f6fbff;
  text-shadow: 0 0 14px rgba(99, 205, 255, 0.35);
`;

const CloseButton = styled.button`
  width: 18px;
  height: 18px;
  border: 2px solid #2ca9e8;
  border-radius: 50%;
  background: #06202f;
  color: #e7f8ff;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  transition: filter 160ms ease, transform 160ms ease;
  display: flex;
    align-items: center;
    justify-content: center;

  &:hover,
  &:focus-visible {
    filter: brightness(1.25);
    outline: none;
  }

  &:active {
    transform: scale(0.94);
  }
`;

const Body = styled.div`
  flex: 1;
  min-height: 0;
`;

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: string;
  height?: string;
  title?: string;
}

export default function Modal({
  open,
  onClose,
  children,
  width,
  height,
  title = "AI物流规划师",
}: ModalProps) {
  useEffect(() => {
    if (!open) return;

    // 1. 背景滚动锁定
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // 2. Esc 关闭
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <Overlay >
      <Content $width={width} $height={height} onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>{title}</Title>
          <CloseButton onClick={onClose} aria-label="关闭">
            ×
          </CloseButton>
        </Header>
        <Body>{children}</Body>
      </Content>
    </Overlay>,
    document.body
  );
}