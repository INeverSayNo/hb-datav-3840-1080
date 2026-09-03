import styled from "styled-components";

import type { RecommendRoute } from "../recommendLineRoutes";

const Group = styled.div`
  position: absolute;
  left: 40px;
  top: 210px;
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 28px;
`;

const RouteButton = styled.button<{ $active: boolean }>`
  padding: 14px 34px;
  border-radius: 8px;
  border: 2px solid ${({ $active }) => ($active ? "#15CBFF" : "#004F74")};
  background: ${({ $active }) =>
    $active
      ? "linear-gradient(180deg, #081920, #1D6F87)"
      : "rgba(3, 27, 40, 0.5)"};
  color: ${({ $active }) => ($active ? "#f2f9fc" : "#9fc4d8")};
  font-size: 32px;
  line-height: 44px;
  letter-spacing: 2px;
  white-space: nowrap;
  cursor: pointer;
  transition:
    border-color 180ms ease,
    background 180ms ease,
    color 180ms ease;

  &:disabled {
    cursor: wait;
    opacity: 0.78;
  }
`;

export type RouteButtonsProps = {
  activeRoute: string;
  disabled?: boolean;
  routes: readonly RecommendRoute[];
  onRouteChange: (route: RecommendRoute) => void;
  onRouteIntent?: (route: RecommendRoute) => void;
};

export default function RouteButtons({
  activeRoute,
  disabled = false,
  routes,
  onRouteChange,
  onRouteIntent,
}: RouteButtonsProps) {

  return (
    <Group aria-label="精品线路选择" aria-busy={disabled}>
      {routes.map((route) => (
        <RouteButton
          key={route.label}
          type="button"
          $active={activeRoute === route.label}
          disabled={disabled}
          aria-pressed={activeRoute === route.label}
          onFocus={() => onRouteIntent?.(route)}
          onPointerEnter={() => onRouteIntent?.(route)}
          onClick={() => onRouteChange(route)}
        >
          {route.label}
        </RouteButton>
      ))}
    </Group>
  );
}
