import React, { useState, useMemo } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  MapPin, 
  House, 
  Buildings, 
  Path, 
  Info,
  Crosshair,
} from "@phosphor-icons/react";
import { cn, resourceColor, prettyResource, resourceEmoji } from "../lib/utils";
import { getPlayerColor } from "../lib/colors";

const TILE_SIZE = 48;

function hexCorner(center, size, i) {
  const angleDeg = 60 * i - 30;
  const angleRad = (Math.PI / 180) * angleDeg;
  return {
    x: center.x + size * Math.cos(angleRad),
    y: center.y + size * Math.sin(angleRad),
  };
}

function hexPolygonPath(center, size) {
  const pts = Array.from({ length: 6 }, (_, i) => hexCorner(center, size, i));
  return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";
}

// Probability dots for number tokens
const PROBABILITY_DOTS = {
  2: 1, 12: 1,
  3: 2, 11: 2,
  4: 3, 10: 3,
  5: 4, 9: 4,
  6: 5, 8: 5,
};

// Get tile colors with gradients
function getTileColors(resource) {
  const colors = {
    wood: { base: "#16a34a", light: "#22c55e", dark: "#15803d" },
    brick: { base: "#dc2626", light: "#ef4444", dark: "#b91c1c" },
    wheat: { base: "#eab308", light: "#facc15", dark: "#ca8a04" },
    sheep: { base: "#4ade80", light: "#86efac", dark: "#22c55e" },
    ore: { base: "#6b7280", light: "#9ca3af", dark: "#4b5563" },
    desert: { base: "#d4a574", light: "#e5c9a8", dark: "#b8956b" },
    water: { base: "#2563eb", light: "#3b82f6", dark: "#1d4ed8" },
  };
  return colors[resource] || colors.desert;
}

// Floating tooltip with glassmorphism
function TileTooltip({ tile, position, onClose, isSticky }) {
  const isHot = tile.number === 6 || tile.number === 8;
  const probDots = PROBABILITY_DOTS[tile.number] || 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.96 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={cn(
        "absolute z-50 pointer-events-auto",
        isSticky && "ring-1 ring-indigo-500/40"
      )}
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-50%, -100%)",
        marginTop: -10,
      }}
    >
      <div className="relative min-w-[180px] rounded-xl overflow-hidden shadow-2xl shadow-black/50">
        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl" />
        
        <div className="relative p-3">
          {isSticky && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="absolute -top-1 -right-1 p-1 rounded-full bg-slate-700/80 hover:bg-slate-600 text-slate-400 hover:text-white transition-colors"
            >
              <X size={10} weight="bold" />
            </button>
          )}

          {/* Header with resource info */}
          <div className="flex items-center gap-2.5 mb-2.5">
            <div
              className="w-9 h-9 rounded-lg shadow-lg flex items-center justify-center text-lg"
              style={{ 
                background: `linear-gradient(135deg, ${getTileColors(tile.resource).light}, ${getTileColors(tile.resource).dark})`,
              }}
            >
              {resourceEmoji(tile.resource)}
            </div>
            <div>
              <div className="text-slate-200 font-medium text-sm">{prettyResource(tile.resource)}</div>
              <div className="text-slate-500 text-xs">Resource Tile</div>
            </div>
          </div>

          {/* Roll number section */}
          {tile.number && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-black/30 mb-2">
              <div className="flex items-center gap-1.5">
                <Crosshair size={14} className={isHot ? "text-red-400" : "text-slate-500"} />
                <span className="text-slate-500 text-xs">Roll</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "text-xl font-bold font-mono",
                  isHot ? "text-red-400" : "text-slate-200"
                )}>
                  {tile.number}
                </span>
                <div className="flex gap-0.5">
                  {Array.from({ length: probDots }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-1 h-1 rounded-full",
                        isHot ? "bg-red-400" : "bg-slate-500"
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {tile.number && (
            <div className="text-[10px] text-slate-600 text-center">
              {((probDots / 36) * 100).toFixed(1)}% chance
            </div>
          )}

          {tile.hasRobber && (
            <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-amber-500/10 text-amber-400 mt-2">
              <MapPin size={14} />
              <span className="text-xs font-medium">Robber Here</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

TileTooltip.propTypes = {
  tile: PropTypes.object.isRequired,
  position: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  isSticky: PropTypes.bool,
};

// Main GameBoard Component
export function GameBoard({
  board,
  players,
  mode,
  selection,
  onClickHex,
  onClickNode,
  onClickEdge,
  bbox,
}) {
  const [hoveredTile, setHoveredTile] = useState(null);
  const [stickyTile, setStickyTile] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const { minX, minY, width, height } = bbox;

  const handleTileHover = (tile, idx, event) => {
    if (!stickyTile) {
      const rect = event.target.ownerSVGElement.getBoundingClientRect();
      const svgPoint = {
        x: ((tile.center.x - minX) / width) * rect.width,
        y: ((tile.center.y - minY) / height) * rect.height,
      };
      setTooltipPosition(svgPoint);
      setHoveredTile({ ...tile, idx });
    }
  };

  const handleTileClick = (tile, idx, event) => {
    if (stickyTile?.idx === idx) {
      setStickyTile(null);
      setHoveredTile(null);
    } else {
      const rect = event.target.ownerSVGElement.getBoundingClientRect();
      const svgPoint = {
        x: ((tile.center.x - minX) / width) * rect.width,
        y: ((tile.center.y - minY) / height) * rect.height,
      };
      setTooltipPosition(svgPoint);
      setStickyTile({ ...tile, idx });
    }
    onClickHex(idx);
  };

  const activeTile = stickyTile || hoveredTile;

  const svgDefs = useMemo(() => (
    <defs>
      <filter id="tileShadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.35" />
      </filter>
      
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>

      <linearGradient id="waterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1d4ed8" />
        <stop offset="50%" stopColor="#2563eb" />
        <stop offset="100%" stopColor="#3b82f6" />
      </linearGradient>

      {["wood", "brick", "wheat", "sheep", "ore", "desert"].map(resource => {
        const colors = getTileColors(resource);
        return (
          <linearGradient key={resource} id={`${resource}Gradient`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.light} />
            <stop offset="100%" stopColor={colors.dark} />
          </linearGradient>
        );
      })}

      <pattern id="desertPattern" width="8" height="8" patternUnits="userSpaceOnUse">
        <circle cx="4" cy="4" r="0.6" fill="rgba(0,0,0,0.06)" />
      </pattern>
      
      <filter id="tokenShadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000" floodOpacity="0.4" />
      </filter>
    </defs>
  ), []);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="relative w-full h-full">
        <svg
          width="100%"
          height="100%"
          viewBox={`${minX} ${minY} ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          className="block"
          style={{ cursor: mode === "move-robber" ? "crosshair" : "default" }}
        >
          {svgDefs}

          {/* Tiles */}
          {board.tiles.map((t, idx) => {
            const isSelected = selection?.type === "hex" && selection?.id === idx;
            const isHovered = activeTile?.idx === idx;
            const isHot = t.number === 6 || t.number === 8;
            
            return (
              <g
                key={idx}
                onClick={(e) => handleTileClick(t, idx, e)}
                onMouseEnter={(e) => handleTileHover(t, idx, e)}
                onMouseLeave={() => !stickyTile && setHoveredTile(null)}
                style={{ cursor: "pointer" }}
              >
                <path
                  d={hexPolygonPath(t.center, TILE_SIZE)}
                  fill={t.resource === "water" ? "url(#waterGradient)" : `url(#${t.resource}Gradient)`}
                  stroke={isHovered || isSelected ? "#6366f1" : "rgba(0,0,0,0.3)"}
                  strokeWidth={isHovered || isSelected ? 2 : 1.5}
                  filter="url(#tileShadow)"
                  className="transition-all duration-150"
                  style={{ opacity: isSelected ? 0.9 : 1 }}
                />
                
                {t.resource === "desert" && (
                  <path
                    d={hexPolygonPath(t.center, TILE_SIZE)}
                    fill="url(#desertPattern)"
                    pointerEvents="none"
                  />
                )}

                {t.number && !t.hasRobber && (
                  <g className="pointer-events-none" filter="url(#tokenShadow)">
                    <circle
                      cx={t.center.x}
                      cy={t.center.y}
                      r={14}
                      fill="#1e293b"
                      stroke={isHot ? "rgba(239,68,68,0.5)" : "rgba(51,65,85,0.5)"}
                      strokeWidth={1}
                    />
                    <text
                      x={t.center.x}
                      y={t.center.y + 1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={13}
                      fontWeight={600}
                      fontFamily="Outfit, sans-serif"
                      fill={isHot ? "#ef4444" : "#e2e8f0"}
                    >
                      {t.number}
                    </text>
                    <g>
                      {Array.from({ length: PROBABILITY_DOTS[t.number] || 0 }).map((_, dotIdx) => {
                        const total = PROBABILITY_DOTS[t.number];
                        const spacing = 3;
                        const startX = t.center.x - ((total - 1) * spacing) / 2;
                        return (
                          <circle
                            key={dotIdx}
                            cx={startX + dotIdx * spacing}
                            cy={t.center.y + 9}
                            r={1}
                            fill={isHot ? "#ef4444" : "#64748b"}
                          />
                        );
                      })}
                    </g>
                  </g>
                )}

                {t.hasRobber && (
                  <g className="pointer-events-none">
                    <motion.circle
                      cx={t.center.x}
                      cy={t.center.y}
                      r={12}
                      fill="#1f2937"
                      stroke="#fbbf24"
                      strokeWidth={1.5}
                      filter="url(#tokenShadow)"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", bounce: 0.5 }}
                    />
                    <text
                      x={t.center.x}
                      y={t.center.y + 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={10}
                      fill="#fbbf24"
                    >
                      🥷
                    </text>
                  </g>
                )}

                {t.harbor && (
                  <g className="pointer-events-none" filter="url(#tokenShadow)">
                    <circle
                      cx={t.center.x}
                      cy={t.center.y}
                      r={12}
                      fill="#f8fafc"
                      stroke="#3b82f6"
                      strokeWidth={1.5}
                    />
                    <text
                      x={t.center.x}
                      y={t.center.y + 2}
                      textAnchor="middle"
                      fontSize={7}
                      fontWeight="600"
                      fontFamily="Outfit, sans-serif"
                      fill="#1e40af"
                    >
                      {t.harbor.type}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Roads */}
          {board.edges.map((e) => {
            const n1 = board.nodes[e.n1];
            const n2 = board.nodes[e.n2];
            const hasOwner = e.ownerId != null;
            const playerColor = hasOwner ? getPlayerColor(e.ownerId) : null;
            const isSelected = selection?.type === "edge" && selection?.id === e.id;
            const canBuildHere = mode === "build-road" && !hasOwner;

            return (
              <g
                key={e.id}
                onClick={() => onClickEdge(e.id)}
                style={{ cursor: canBuildHere ? "pointer" : hasOwner ? "default" : "pointer" }}
              >
                {hasOwner && (
                  <line
                    x1={n1.x}
                    y1={n1.y}
                    x2={n2.x}
                    y2={n2.y}
                    stroke={playerColor.glow}
                    strokeWidth={12}
                    strokeLinecap="round"
                    opacity={0.35}
                    pointerEvents="none"
                  />
                )}
                
                <line
                  x1={n1.x}
                  y1={n1.y}
                  x2={n2.x}
                  y2={n2.y}
                  stroke={hasOwner ? playerColor.primary : "#334155"}
                  strokeWidth={hasOwner ? 6 : 3}
                  strokeLinecap="round"
                  opacity={hasOwner ? 1 : canBuildHere ? 0.5 : 0.2}
                  className={cn(
                    "transition-all duration-150",
                    isSelected && "stroke-[#6366f1]",
                    canBuildHere && "hover:opacity-70"
                  )}
                />

                <line
                  x1={n1.x}
                  y1={n1.y}
                  x2={n2.x}
                  y2={n2.y}
                  stroke="transparent"
                  strokeWidth={16}
                  strokeLinecap="round"
                />
              </g>
            );
          })}

          {/* Nodes */}
          {board.nodes.map((n) => {
            const isSelected = selection?.type === "node" && selection?.id === n.id;
            const b = n.building;
            const hasBuilding = !!b;
            const playerColor = hasBuilding ? getPlayerColor(b.ownerId) : null;
            const isCity = b?.type === "city";
            const radius = isCity ? 10 : hasBuilding ? 8 : 4;
            const canBuildHere = (mode === "build-town" || mode === "build-city") && n.canBuild;

            return (
              <g
                key={n.id}
                onClick={() => onClickNode(n.id)}
                style={{ cursor: "pointer" }}
              >
                {hasBuilding && (
                  <motion.circle
                    cx={n.x}
                    cy={n.y}
                    r={radius + 6}
                    fill={playerColor.glow}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.4 }}
                    transition={{ duration: 0.2 }}
                  />
                )}

                <circle
                  cx={n.x}
                  cy={n.y + 1.5}
                  r={radius}
                  fill="rgba(0,0,0,0.3)"
                />

                {isCity ? (
                  <g>
                    <rect
                      x={n.x - radius}
                      y={n.y - radius}
                      width={radius * 2}
                      height={radius * 2}
                      rx={3}
                      fill={playerColor.primary}
                      stroke="rgba(255,255,255,0.8)"
                      strokeWidth={isSelected ? 2 : 1.5}
                    />
                    <text
                      x={n.x}
                      y={n.y + 1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={9}
                      fill="#fff"
                    >
                      🏛️
                    </text>
                  </g>
                ) : hasBuilding ? (
                  <g>
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={radius}
                      fill={playerColor.primary}
                      stroke="rgba(255,255,255,0.8)"
                      strokeWidth={isSelected ? 2 : 1.5}
                    />
                    <text
                      x={n.x}
                      y={n.y + 1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={7}
                      fill="#fff"
                    >
                      🏠
                    </text>
                  </g>
                ) : (
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={radius}
                    fill={n.canBuild ? "#1e293b" : "#0f172a"}
                    stroke={isSelected ? "#6366f1" : canBuildHere ? "#4f46e5" : "transparent"}
                    strokeWidth={isSelected ? 2 : canBuildHere ? 1.5 : 0}
                    opacity={n.canBuild ? (canBuildHere ? 0.8 : 0.5) : 0.2}
                    className={cn(
                      "transition-all duration-150",
                      canBuildHere && "hover:opacity-100"
                    )}
                  />
                )}

                <circle
                  cx={n.x}
                  cy={n.y}
                  r={14}
                  fill="transparent"
                />
              </g>
            );
          })}
        </svg>

        <AnimatePresence>
          {activeTile && (
            <TileTooltip
              tile={activeTile}
              position={tooltipPosition}
              onClose={() => {
                setStickyTile(null);
                setHoveredTile(null);
              }}
              isSticky={!!stickyTile}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Mode indicator */}
      <AnimatePresence>
        {mode !== "select" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2"
          >
            <div className="px-4 py-2 rounded-lg bg-slate-900/80 backdrop-blur-lg shadow-lg">
              <div className="flex items-center gap-2 text-slate-300 text-xs font-medium">
                {mode === "build-road" && (
                  <>
                    <Path size={14} className="text-blue-400" />
                    <span>Click edge for <span className="text-blue-400">road</span></span>
                  </>
                )}
                {mode === "build-town" && (
                  <>
                    <House size={14} className="text-emerald-400" />
                    <span>Click node for <span className="text-emerald-400">settlement</span></span>
                  </>
                )}
                {mode === "build-city" && (
                  <>
                    <Buildings size={14} className="text-purple-400" />
                    <span>Click settlement for <span className="text-purple-400">city</span></span>
                  </>
                )}
                {mode === "move-robber" && (
                  <>
                    <MapPin size={14} className="text-amber-400" />
                    <span>Click tile for <span className="text-amber-400">robber</span></span>
                  </>
                )}
                {mode === "trade" && (
                  <>
                    <Info size={14} className="text-cyan-400" />
                    <span className="text-cyan-400">Trading</span>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

GameBoard.propTypes = {
  board: PropTypes.object.isRequired,
  players: PropTypes.array.isRequired,
  mode: PropTypes.string.isRequired,
  selection: PropTypes.object,
  onClickHex: PropTypes.func.isRequired,
  onClickNode: PropTypes.func.isRequired,
  onClickEdge: PropTypes.func.isRequired,
  bbox: PropTypes.object.isRequired,
};

export default GameBoard;
