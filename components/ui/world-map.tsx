"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import DottedMap from "dotted-map";

import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { TextAnimate } from "@/components/ui/text-animate";

interface MapProps {
  dots?: Array<{
    start: { lat: number; lng: number; label?: string };
    end: { lat: number; lng: number; label?: string };
  }>;
  lineColor?: string;
}

interface HoveredPoint {
  x: number;
  y: number;
  label: string;
  type: "start" | "end";
  index: number;
}

export default function WorldMap({
  dots = [],
  lineColor = "#0ea5e9",
}: MapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const map = new DottedMap({ height: 100, grid: "diagonal" });
  const [hoveredPoint, setHoveredPoint] = useState<HoveredPoint | null>(null);

  const { theme } = useTheme();

  const svgMap = map.getSVG({
    radius: 0.22,
    color: theme === "dark" ? "#FFFFFF40" : "#00000040",
    shape: "circle",
    backgroundColor: theme === "dark" ? "black" : "white",
  });

  const projectPoint = (lat: number, lng: number) => {
    const x = (lng + 180) * (800 / 360);
    const y = (90 - lat) * (400 / 180);
    return { x, y };
  };

  const createCurvedPath = (
    start: { x: number; y: number },
    end: { x: number; y: number }
  ) => {
    const midX = (start.x + end.x) / 2;
    const midY = Math.min(start.y, end.y) - 50;
    return `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`;
  };

  const handlePointMouseEnter = (
    e: React.MouseEvent<SVGCircleElement>,
    point: { lat: number; lng: number; label?: string },
    type: "start" | "end",
    index: number
  ) => {
    if (!point.label || !containerRef.current) return;
    
    const projectedPoint = projectPoint(point.lat, point.lng);
    
    // Calculate position relative to container
    const containerWidth = containerRef.current.offsetWidth;
    const containerHeight = containerRef.current.offsetHeight;
    const xPercent = (projectedPoint.x / 800) * 100;
    const yPercent = (projectedPoint.y / 400) * 100;
    
    setHoveredPoint({
      x: (xPercent / 100) * containerWidth,
      y: (yPercent / 100) * containerHeight,
      label: point.label,
      type,
      index,
    });
  };

  const handlePointMouseLeave = () => {
    setHoveredPoint(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hoveredPoint || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const relativeX = e.clientX - containerRect.left;
    const relativeY = e.clientY - containerRect.top;
    
    setHoveredPoint({
      ...hoveredPoint,
      x: relativeX,
      y: relativeY,
    });
  };

  // Calculate card position to avoid overflow
  const getCardPosition = () => {
    if (!hoveredPoint || !containerRef.current) return { left: 0, top: 0, transform: "" };
    
    const containerRect = containerRef.current.getBoundingClientRect();
    // Use responsive card dimensions based on container width
    const isMobile = containerRect.width < 640; // sm breakpoint
    const cardWidth = isMobile ? 240 : 280; // max-w-[240px] sm:max-w-[280px]
    const cardHeight = isMobile ? 80 : 100; // approximate height
    const offset = 12;
    
    let left = hoveredPoint.x + offset;
    let top = hoveredPoint.y + offset;
    let transform = "";
    
    // Check right edge overflow
    if (left + cardWidth > containerRect.width) {
      left = hoveredPoint.x - cardWidth - offset;
      transform = "translateX(-100%)";
    }
    
    // Check left edge overflow (after potential right adjustment)
    if (left < 0) {
      left = offset;
      transform = "";
    }
    
    // Check bottom edge overflow
    if (top + cardHeight > containerRect.height) {
      top = Math.max(offset, hoveredPoint.y - cardHeight - offset);
    }
    
    // Check top edge overflow
    if (top < 0) {
      top = offset;
    }
    
    return { left, top, transform };
  };

  return (
    <div 
      ref={containerRef}
      className="w-full max-w-2xl aspect-[2/1] dark:bg-black bg-white rounded-lg relative font-sans mx-auto items-center justify-center overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={handlePointMouseLeave}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`data:image/svg+xml;utf8,${encodeURIComponent(svgMap)}`}
        className="h-full w-full [mask-image:linear-gradient(to_bottom,transparent,white_10%,white_90%,transparent)] pointer-events-none select-none"
        alt="world map"
        height="495"
        width="1056"
        draggable={false}
      />
      <svg
        ref={svgRef}
        viewBox="0 0 800 400"
        className="w-full h-full absolute inset-0 select-none"
      >
        {dots.map((dot, i) => {
          const startPoint = projectPoint(dot.start.lat, dot.start.lng);
          const endPoint = projectPoint(dot.end.lat, dot.end.lng);
          return (
            <g key={`path-group-${i}`}>
              <motion.path
                d={createCurvedPath(startPoint, endPoint)}
                fill="none"
                stroke="url(#path-gradient)"
                strokeWidth="1"
                initial={{
                  pathLength: 0,
                }}
                animate={{
                  pathLength: 1,
                }}
                transition={{
                  duration: 1,
                  delay: 0.5 * i,
                  ease: "easeOut",
                }}
                key={`start-upper-${i}`}
              ></motion.path>
            </g>
          );
        })}

        <defs>
          <linearGradient id="path-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="5%" stopColor={lineColor} stopOpacity="1" />
            <stop offset="95%" stopColor={lineColor} stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>

        {dots.map((dot, i) => {
          const startPoint = projectPoint(dot.start.lat, dot.start.lng);
          const endPoint = projectPoint(dot.end.lat, dot.end.lng);
          
          return (
            <g key={`points-group-${i}`}>
              <g key={`start-${i}`}>
                <circle
                  cx={startPoint.x}
                  cy={startPoint.y}
                  r="4"
                  fill={lineColor}
                  className="cursor-pointer"
                  onMouseEnter={(e) => handlePointMouseEnter(e, dot.start, "start", i)}
                  onMouseLeave={handlePointMouseLeave}
                  style={{ pointerEvents: "auto" }}
                />
                <circle
                  cx={startPoint.x}
                  cy={startPoint.y}
                  r="2"
                  fill={lineColor}
                  opacity="0.5"
                >
                  <animate
                    attributeName="r"
                    from="2"
                    to="8"
                    dur="1.5s"
                    begin="0s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    from="0.5"
                    to="0"
                    dur="1.5s"
                    begin="0s"
                    repeatCount="indefinite"
                  />
                </circle>
              </g>
              <g key={`end-${i}`}>
                <circle
                  cx={endPoint.x}
                  cy={endPoint.y}
                  r="4"
                  fill={lineColor}
                  className="cursor-pointer"
                  onMouseEnter={(e) => handlePointMouseEnter(e, dot.end, "end", i)}
                  onMouseLeave={handlePointMouseLeave}
                  style={{ pointerEvents: "auto" }}
                />
                <circle
                  cx={endPoint.x}
                  cy={endPoint.y}
                  r="2"
                  fill={lineColor}
                  opacity="0.5"
                >
                  <animate
                    attributeName="r"
                    from="2"
                    to="8"
                    dur="1.5s"
                    begin="0s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    from="0.5"
                    to="0"
                    dur="1.5s"
                    begin="0s"
                    repeatCount="indefinite"
                  />
                </circle>
              </g>
            </g>
          );
        })}
      </svg>

      {/* Hover Card */}
      <AnimatePresence>
        {hoveredPoint && (() => {
          const cardPosition = getCardPosition();
          return (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={cn(
                "absolute pointer-events-none z-50",
                "bg-white/95 dark:bg-neutral-950/95",
                "backdrop-blur-lg",
                "rounded-xl",
                "px-3 py-2.5 sm:px-4 sm:py-3",
                "min-w-[180px] max-w-[240px] sm:min-w-[200px] sm:max-w-[280px]",
                "shadow-[0_10px_40px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.05)]",
                "dark:shadow-[0_10px_40px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.1)]",
                "border border-neutral-200/50 dark:border-neutral-800/50"
              )}
              style={{
                left: `${cardPosition.left}px`,
                top: `${cardPosition.top}px`,
                transform: cardPosition.transform,
              }}
            >
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                <div
                  className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: "#006948" }}
                />
                <TextAnimate
                  as="span"
                  animation="fadeIn"
                  by="word"
                  startOnView={false}
                  className="text-[10px] sm:text-xs uppercase tracking-[0.25em] sm:tracking-[0.3em] text-[#006948] dark:text-[#00A36C] font-semibold"
                >
                  {hoveredPoint.type === "start" ? "Origin" : "Destination"}
                </TextAnimate>
              </div>
              <TextAnimate
                as="h3"
                animation="slideUp"
                by="word"
                startOnView={false}
                className="text-sm sm:text-base font-semibold text-neutral-900 dark:text-neutral-100 tracking-[-0.02em] leading-tight"
              >
                {hoveredPoint.label}
              </TextAnimate>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
