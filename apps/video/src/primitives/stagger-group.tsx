import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";

type StaggerGroupProps = {
  children: React.ReactNode;
  stagger?: number;
  delay?: number;
  duration?: number;
  direction?: "up" | "down" | "left" | "right";
  distance?: number;
  style?: React.CSSProperties;
  itemStyle?: React.CSSProperties;
};

export const StaggerGroup: React.FC<StaggerGroupProps> = ({
  children,
  stagger = 6,
  delay = 0,
  duration = 20,
  direction = "up",
  distance = 20,
  style,
  itemStyle,
}) => {
  const frame = useCurrentFrame();
  const items = React.Children.toArray(children);

  return (
    <div style={style}>
      {items.map((child, i) => {
        const itemDelay = delay + i * stagger;
        const adjustedFrame = frame - itemDelay;

        const opacity = interpolate(adjustedFrame, [0, duration], [0, 1], {
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const translateMap = {
          up: `translateY(${interpolate(adjustedFrame, [0, duration], [distance, 0], { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
          down: `translateY(${interpolate(adjustedFrame, [0, duration], [-distance, 0], { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
          left: `translateX(${interpolate(adjustedFrame, [0, duration], [distance, 0], { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
          right: `translateX(${interpolate(adjustedFrame, [0, duration], [-distance, 0], { easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
        };

        return (
          <div
            key={`stagger-${i}`}
            style={{
              opacity,
              transform: translateMap[direction],
              ...itemStyle,
            }}
          >
            {child}
          </div>
        );
      })}
    </div>
  );
};
