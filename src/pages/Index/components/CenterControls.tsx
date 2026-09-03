import styled from "styled-components";

import plannerImage from "@/assets/ai-solution-bg.webp";
import aiSolution from "@/assets/ai-animation.png";
import Modal from "@/components/modal";
import { useRef, useState } from "react";
import { AI_SOLUTION_URL, runtimeConfig } from "@/axios-config/request";
import { AccountLogin } from "@/api/modules/baseDataApi";
import { createPortal } from "react-dom";

const Center = styled.main`
  position: absolute;
  left: 50%;
  top: 235px;
  width: 2440px;
  height: 1810px;
  transform: translateX(-50%);
  z-index: 3;
  pointer-events: none;
`;

const Subtitle = styled.h2`
  margin: 40px 0;
  color: #f6fbff;
  line-height: 82px;
  font-weight: 500;
  text-align: center;
  text-shadow: 0 0 18px rgba(99, 205, 255, 0.28);

  letter-spacing: 10px;
  font-size: 60px;
`;

const Controls = styled.div`
  margin-top: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 42px;
  pointer-events: auto;
`;

// const SearchBox = styled.label`
//   width: 560px;
//   height: 96px;
//   display: flex;
//   align-items: center;
//   border: 4px solid #2ca9e8;
//   background: rgba(5, 36, 53, 0.9);
//   box-shadow: inset 0 0 26px rgba(34, 141, 201, 0.22), 0 0 9px rgba(45, 176, 238, 0.2);
// `;

// const SearchInput = styled.input`
//   min-width: 0;
//   flex: 1;
//   height: 100%;
//   padding: 0 18px 0 32px;
//   border: 0;
//   outline: 0;
//   background: transparent;
//   color: #e7f8ff;
//   font-family: inherit;
//   font-size: 31px;
//   letter-spacing: 1px;

//   &::placeholder {
//     color: #a6becb;
//     opacity: 1;
//   }
// `;

// const SearchIcon = styled.img`
//   width: 44px;
//   height: 44px;
//   margin-right: 24px;
// `;

const PlannerButton = styled.button`
    width: 500px;
    justify-content: center;
  position: relative;
  height: 100px;
  padding: 0 20px;
  border: 0;
  background: transparent;
  cursor: pointer;
  transition:
    filter 160ms ease,
    transform 160ms ease;
  display: flex;
  align-items: center;
  jusitify-content: cneter;
  &:hover,
  &:focus-visible {
    filter: brightness(1.18);
    outline: 2px solid rgba(99, 255, 220, 0.6);
    outline-offset: 5px;
  }

  &:active {
    transform: scale(0.98);
  }

  img {
    display: block;
    width: 500px;
    height: 120px;
  }
`;

const PlannerBackgroundImg = styled.img`
  position: absolute;
  left: 0;
  right: 0;
  z-index: -1;
`;

const PlannerAISolution = styled.img`
  width: 90px !important;
  height: 90px !important;
`;

const PlannerAIText = styled.span`
  font-size: 48px;
  color: white;
  margin-left: 10px;
`;

const ErrorTip = styled.div`
  margin-top: 18px;
  padding: 10px 16px;
  border: 1px solid rgba(255, 120, 120, 0.5);
  background: rgba(120, 20, 35, 0.28);
  color: #ffdfe5;
  font-size: 24px;
  line-height: 1.5;
  border-radius: 8px;
  text-align: center;
`;
const FullscreenLoadingOverlay = styled.div<{ $visible: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: rgba(4, 20, 30, 0.5);
  backdrop-filter: blur(3px);
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  pointer-events: ${({ $visible }) => ($visible ? "auto" : "none")};
  transition: opacity 240ms ease;
`;
const LoadingSpinner = styled.div`
  width: 36px;
  height: 36px;
  border: 2px solid rgba(32, 219, 219, 0.18);
  border-top-color: #20dbdb;
  border-radius: 50%;
  animation: map-spin 0.9s linear infinite;
  box-shadow: 0 0 28px rgba(32, 219, 219, 0.35);

  @keyframes map-spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const LoadingText = styled.div`
  color: rgba(232, 250, 255, 0.92);
  font-size: 12px;
  letter-spacing: 6px;
  text-shadow: 0 0 4px rgba(32, 219, 219, 0.65);
`;

export default function CenterControls() {
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [isLoading, setLoading] = useState(false);

  const [aiSolutionIframeUrl, setAiSolutionIframeUrl] = useState("");

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openAiSolutionModal = async () => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    setLoading(true);
    setErrorMessage("");
    setAiSolutionIframeUrl("");
    const [err, data] = await AccountLogin({
      username: runtimeConfig?.request.userName ?? "13667184155",
      password: runtimeConfig?.request.password ?? "13667184155279",
    });
    if (!err && data && data.access_token) {
      localStorage.setItem("JsToken", data.access_token);
      setAiSolutionIframeUrl(AI_SOLUTION_URL + `?token=${data.access_token}`);
      setAiModalOpen(true);
    } else {
      setErrorMessage(
        "AI 物流规划师暂时无法打开，请稍后重试，或检查网络连接后再试。",
      );
      timerRef.current = setTimeout(() => {
        setErrorMessage("");
        timerRef.current = null;
      }, 2000);
    }
  };

  const onLoadIframe = () => {
    setLoading(false);
  };

  return (
    <Center>
      <Subtitle>服务长江经济带核心节点</Subtitle>
      <Controls>
        {/* <SearchBox>
          <SearchInput
            aria-label="站点搜索"
            placeholder="站点名称/站点编号模糊查询"
          />
          <SearchIcon src={searchIcon} alt="" />
        </SearchBox> */}
        <PlannerButton
          type="button"
          aria-label="AI物流规划师"
          onClick={() => openAiSolutionModal()}
        >
          <PlannerBackgroundImg src={plannerImage} alt="AI物流规划师" />
          <PlannerAISolution src={aiSolution} />
          <PlannerAIText>AI 物流规划师</PlannerAIText>
        </PlannerButton>
      </Controls>
      {errorMessage && <ErrorTip role="alert">{errorMessage}</ErrorTip>}
      {aiModalOpen && aiSolutionIframeUrl && (
        <Modal
          open
          onClose={() => setAiModalOpen(false)}
          width="68vw"
          height="80vh"
        >
          <iframe
            src={aiSolutionIframeUrl}
            title="AI物流规划师"
            style={{ width: "100%", height: "100%", border: 0 }}
            onLoad={onLoadIframe}
          />
        </Modal>
      )}
      {createPortal(
        <FullscreenLoadingOverlay $visible={isLoading}>
          <LoadingSpinner />
          <LoadingText>功能启动中</LoadingText>
        </FullscreenLoadingOverlay>,
        document.body,
      )}
    </Center>
  );
}
