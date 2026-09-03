import styled from "styled-components";

const CONTENT =
  "公路网：以“十三纵九横四环”高速公路主骨架网络为设计基础，公路总运营里程达312113公里，其中高速公路运营里程达8488公里。铁路网：以“四纵两横”铁路网为基础，全省铁路运营里程约5820公里，其中物流货运运营里程约3320公里。水运网：以“一横（长江干流）一纵（汉江）”为主轴，已建成内河航道通航运营里程8667公里，其中高等级航道2213公里。航空网：航空货运航线100+条（国内59、国际45），花湖机场货邮吞吐量迈百万吨级，建成国内轴辐式货运网。";

const Wrapper = styled.div`
  position: relative;
  flex: 1;
  min-width: 0;
  max-width: 2050px;
  display: flex;
  align-items: center;
  overflow: hidden;

  /* 左右渐入渐出遮罩：内容从边缘滑入/滑出时自然淡出，不突兀截断 */
  mask-image: linear-gradient(
    to right,
    transparent 0,
    #000 80px,
    #000 calc(100% - 80px),
    transparent 100%
  );
  -webkit-mask-image: linear-gradient(
    to right,
    transparent 0,
    #000 80px,
    #000 calc(100% - 80px),
    transparent 100%
  );
`;

const Marquee = styled.div`
  display: flex;
  align-items: center;
  gap: 64px;
  white-space: nowrap;
  will-change: transform;
  animation: notice-marquee 42s linear infinite;

  @keyframes notice-marquee {
    from {
      transform: translateX(0);
    }
    to {
      transform: translateX(-50%);
    }
  }
`;

const NoticeItem = styled.span`
  color: #e6f2f7;
  font-size: 48px;
  line-height: 60px;
  letter-spacing: 1px;
`;

export default function NoticeBar() {
  return (
    <Wrapper role="marquee" aria-label="交通基础设施概况">
      <Marquee>
        {/* 内容渲染两遍：滚动一半宽度后立即复位，视觉上无缝隙连续循环 */}
        <NoticeItem>{CONTENT}</NoticeItem>
        <NoticeItem>{CONTENT}</NoticeItem>
      </Marquee>
    </Wrapper>
  );
}
