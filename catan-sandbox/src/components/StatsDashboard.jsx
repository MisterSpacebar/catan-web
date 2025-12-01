import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import {
  Trophy,
  Crown,
  Medal,
  TrendUp,
  ChartBar,
  ChartLine,
  Target,
  Handshake,
  House,
  Path,
  Buildings,
  Lightning,
  Cube,
  Users,
  Robot,
  User,
} from "@phosphor-icons/react";
import { cn, resourceEmoji, prettyResource } from "../lib/utils";
import { getPlayerColor, getRankColor } from "../lib/colors";
import {
  PROVIDER_ICONS,
  PROVIDER_COLORS,
  WHITE_LOGO_PROVIDERS,
} from "../lib/providers";
import { Card, CardHeader, CardTitle, CardContent, CardSection } from "./ui/Card";
import { Collapsible } from "./ui/Collapsible";
import { LeaderboardRow as UILeaderboardRow, calculateRanksWithTies } from "./ui/RankBadge";
import { PlayerLabel } from "./ui/PlayerChip";

// Use modular rank colors from colors.js

// Provider Avatar component for tooltips
function ProviderAvatar({ providerId, size = 14 }) {
  const IconComponent = PROVIDER_ICONS[providerId];
  const color = PROVIDER_COLORS[providerId] || "#666";
  const useWhiteLogo = WHITE_LOGO_PROVIDERS.includes(providerId);
  
  if (IconComponent) {
    if (!useWhiteLogo && IconComponent.Color) {
      return <IconComponent.Color size={size} />;
    }
    return <IconComponent size={size} style={{ color: useWhiteLogo ? "#ffffff" : color }} />;
  }
  
  return (
    <div
      className="rounded flex items-center justify-center font-bold text-white text-[8px]"
      style={{ width: size, height: size, background: color }}
    >
      {providerId?.slice(0, 2).toUpperCase() || "AI"}
    </div>
  );
}

ProviderAvatar.propTypes = {
  providerId: PropTypes.string,
  size: PropTypes.number,
};

// Custom tooltip for charts with player info
function CustomTooltip({ active, payload, label, players, labelPrefix }) {
  if (active && payload && payload.length) {
    // Check for custom tooltipLabel in payload, otherwise use label with optional prefix
    const customLabel = payload[0]?.payload?.tooltipLabel;
    const formattedLabel = customLabel || (labelPrefix ? `${labelPrefix}${label}` : label);
    
    return (
      <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/50" style={{
        background: "linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.95))",
        border: "1px solid rgba(71, 85, 105, 0.4)",
        backdropFilter: "blur(12px)",
      }}>
        {/* Header */}
        <div className="px-3 py-2 border-b border-slate-700/50">
          <p className="text-xs font-semibold text-slate-300">{formattedLabel}</p>
        </div>
        
        {/* Player entries */}
        <div className="px-3 py-2 space-y-2">
          {payload.map((entry, index) => {
            const player = players?.find(p => p.name === entry.name);
            const playerColor = getPlayerColor(player?.id ?? index);
            
            return (
              <div 
                key={index} 
                className="flex items-center gap-2 p-2 rounded-xl"
                style={{
                  background: `linear-gradient(135deg, ${playerColor.primary}15, ${playerColor.primary}08)`,
                  border: `1px solid ${playerColor.primary}25`,
                }}
              >
                {/* Left accent */}
                <div 
                  className="w-1 h-8 rounded-full flex-shrink-0"
                  style={{ background: `linear-gradient(180deg, ${playerColor.primary}, ${playerColor.primary}80)` }}
                />
                
                {/* Player info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {/* Player label chip - FIRST */}
                    <div 
                      className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0"
                      style={{ 
                        background: `linear-gradient(135deg, ${playerColor.primary}30, ${playerColor.primary}20)`,
                        color: playerColor.primary,
                      }}
                    >
                      {playerColor.label}
                    </div>
                    
                    {/* Provider icon - SECOND */}
                    {player?.provider && (
                      <div className="w-5 h-5 rounded-md bg-slate-800/80 flex items-center justify-center flex-shrink-0">
                        <ProviderAvatar providerId={player.provider} size={12} />
                      </div>
                    )}
                    
                    {/* Player name */}
                    <span className="text-xs font-medium text-slate-200 truncate">{entry.name}</span>
                  </div>
                  
                  {/* Provider model */}
                  {player?.providerModel && (
                    <div className="flex items-center gap-1 mt-0.5 ml-7">
                      <Robot size={10} className="text-indigo-400" />
                      <span className="text-[10px] text-indigo-400/80 truncate">{player.providerModel}</span>
                    </div>
                  )}
                </div>
                
                {/* Value */}
                <div 
                  className="text-sm font-bold flex-shrink-0"
                  style={{ color: playerColor.primary }}
                >
                  {entry.value}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
}

CustomTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
  label: PropTypes.string,
  players: PropTypes.array,
  labelPrefix: PropTypes.string,
};

// Stat card with animated bar
function StatBar({ label, value, max, color, icon: Icon }) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  
  return (
    <div className="space-y-1.5 xl:space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 xl:gap-2">
          {Icon && <Icon size={12} className="text-slate-500 xl:scale-125" />}
          <span className="text-xs lg:text-[13px] xl:text-sm text-slate-400">{label}</span>
        </div>
        <span className="text-xs lg:text-[13px] xl:text-sm font-medium text-slate-300">{value}</span>
      </div>
      <div className="h-1.5 xl:h-2 bg-slate-800/60 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

StatBar.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  max: PropTypes.number.isRequired,
  color: PropTypes.string.isRequired,
  icon: PropTypes.elementType,
};

// Provider/meta chip similar to PlayerDashboard "Player Information"
function ProviderBadge({ player, className }) {
  const providerId = player?.provider;
  if (!providerId) return null;
  const IconComponent = PROVIDER_ICONS[providerId];
  const color = PROVIDER_COLORS[providerId] || "#94a3b8";
  const useWhite = WHITE_LOGO_PROVIDERS.includes(providerId);
  const isHuman = player?.model === "human" || player?.type === "human";

  const renderIcon = () => {
    if (!providerId && isHuman) return <User size={14} className="text-slate-400" />;
    if (IconComponent?.Color && !useWhite) return <IconComponent.Color size={16} />;
    if (IconComponent) return <IconComponent size={16} style={{ color: useWhite ? "#ffffff" : color }} />;
    return <Robot size={14} className="text-indigo-300" />;
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 xl:gap-3 text-[12px] lg:text-[13px] xl:text-sm text-slate-300 min-w-0",
        className
      )}
    >
      <div
        className="w-8 h-8 xl:w-9 xl:h-9 2xl:w-10 2xl:h-10 rounded-lg bg-slate-900/70 flex items-center justify-center shadow-inner shadow-black/30 flex-shrink-0"
        style={{ border: `1px solid ${color}30` }}
      >
        {renderIcon()}
      </div>
      <div className="min-w-0 leading-tight">
        <div className="font-semibold truncate">
          {player?.providerName || providerId || (isHuman ? "Human" : "AI")}
        </div>
        {player?.providerModel && (
          <div className="text-[11px] lg:text-xs xl:text-sm text-slate-500 truncate">{player.providerModel}</div>
        )}
      </div>
    </div>
  );
}

ProviderBadge.propTypes = {
  player: PropTypes.object,
  className: PropTypes.string,
};

// Resource distribution chart
function ResourceDistributionChart({ players }) {
  const data = useMemo(() => {
    const resources = ["wood", "brick", "wheat", "sheep", "ore"];
    return resources.map(resource => {
      const entry = { 
        resource: resourceEmoji(resource), 
        name: prettyResource(resource),
        tooltipLabel: `${prettyResource(resource)} (${resourceEmoji(resource)})`,
      };
      players.forEach(player => {
        entry[player.name] = player.resources?.[resource] || 0;
      });
      return entry;
    });
  }, [players]);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
        <XAxis 
          dataKey="resource" 
          tick={{ fill: "#94a3b8", fontSize: 14 }}
          axisLine={{ stroke: "#334155" }}
          tickLine={false}
        />
        <YAxis 
          tick={{ fill: "#64748b", fontSize: 10 }}
          axisLine={{ stroke: "#334155" }}
          tickLine={false}
        />
        <RechartsTooltip content={<CustomTooltip players={players} />} />
        {players.map((player, idx) => (
          <Bar
            key={player.id}
            dataKey={player.name}
            fill={getPlayerColor(player.id).primary}
            radius={[2, 2, 0, 0]}
            stackId="a"
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

ResourceDistributionChart.propTypes = {
  players: PropTypes.array.isRequired,
};

// VP Progress chart
function VPProgressChart({ players, gameStats }) {
  const data = useMemo(() => {
    const turnNumber = gameStats?.turn || 1;
    const current = { turn: turnNumber };

    players.forEach((player) => {
      current[player.name] = player.victoryPoints || player.vp || 0;
    });

    const previous = { ...current, turn: Math.max(0, turnNumber - 1) };
    return [previous, current];
  }, [players, gameStats]);

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
        <XAxis 
          dataKey="turn" 
          tick={{ fill: "#64748b", fontSize: 10 }}
          axisLine={{ stroke: "#334155" }}
          tickLine={false}
        />
        <YAxis 
          tick={{ fill: "#64748b", fontSize: 10 }}
          axisLine={{ stroke: "#334155" }}
          tickLine={false}
          domain={[0, 10]}
        />
        <RechartsTooltip content={<CustomTooltip players={players} labelPrefix="Turn: " />} />
        {players.map((player) => (
          <Line
            key={player.id}
            type="monotone"
            dataKey={player.name}
            stroke={getPlayerColor(player.id).primary}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

VPProgressChart.propTypes = {
  players: PropTypes.array.isRequired,
  gameStats: PropTypes.object,
};

// Player efficiency radar
// Custom tooltip for radar chart
function RadarTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div 
        className="px-3 py-2 rounded-xl shadow-xl"
        style={{
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.95))",
          border: "1px solid rgba(71, 85, 105, 0.4)",
          backdropFilter: "blur(12px)",
        }}
      >
        <span className="text-xs font-medium text-slate-200">{data.stat}: </span>
        <span className="text-sm font-bold text-slate-100">{data.value}</span>
      </div>
    );
  }
  return null;
}

RadarTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
};

function PlayerRadarChart({ player, maxValues }) {
  const data = useMemo(() => [
    { stat: "VP", value: player.victoryPoints || 0, fullMark: maxValues.vp },
    { stat: "Resources", value: Object.values(player.resources || {}).reduce((a, b) => a + b, 0), fullMark: maxValues.resources },
    { stat: "Towns", value: player.towns || 0, fullMark: maxValues.towns },
    { stat: "Cities", value: player.cities || 0, fullMark: maxValues.cities },
    { stat: "Roads", value: player.roads || 0, fullMark: maxValues.roads },
  ], [player, maxValues]);

  const playerColor = getPlayerColor(player.id);

  return (
    <ResponsiveContainer width="100%" height={160}>
      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
        <PolarGrid stroke="#334155" />
        <PolarAngleAxis 
          dataKey="stat" 
          tick={{ fill: "#64748b", fontSize: 10 }} 
        />
        <PolarRadiusAxis 
          angle={90} 
          tick={{ fill: "#64748b", fontSize: 8 }} 
          axisLine={false}
        />
        <Radar
          name={player.name}
          dataKey="value"
          stroke={playerColor.primary}
          fill={playerColor.primary}
          fillOpacity={0.3}
          strokeWidth={2}
        />
        <RechartsTooltip content={<RadarTooltip />} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

PlayerRadarChart.propTypes = {
  player: PropTypes.object.isRequired,
  maxValues: PropTypes.object.isRequired,
};

// Resource pie chart
// Resource colors for pie chart
const RESOURCE_PIE_COLORS = {
  wood: "#22c55e",    // Green
  brick: "#ef4444",   // Red
  wheat: "#eab308",   // Yellow
  sheep: "#4ade80",   // Light green
  ore: "#6b7280",     // Gray
};

function ResourcePieChart({ player }) {
  const data = useMemo(() => {
    const resources = player.resources || {};
    const resourceOrder = ["wood", "brick", "wheat", "sheep", "ore"];
    return resourceOrder
      .filter(resource => (resources[resource] || 0) > 0)
      .map(resource => ({
        key: resource,
        name: prettyResource(resource),
        value: resources[resource] || 0,
        emoji: resourceEmoji(resource),
        color: RESOURCE_PIE_COLORS[resource],
      }));
  }, [player]);

  if (data.length === 0) {
    return (
      <div className="h-[120px] flex items-center justify-center text-sm text-slate-500">
        No resources
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {/* Pie Chart */}
      <div className="flex-shrink-0" style={{ width: 80, height: 80 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={18}
              outerRadius={35}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry) => (
                <Cell key={entry.key} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {/* Legend */}
      <div className="flex-1 grid grid-cols-1 gap-1">
        {data.map((item) => (
          <div key={item.key} className="flex items-center gap-1.5">
            <div 
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[11px]">{item.emoji}</span>
            <span className="text-[10px] text-slate-400 flex-1 truncate">{item.name}</span>
            <span className="text-[11px] font-semibold text-slate-200">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

ResourcePieChart.propTypes = {
  player: PropTypes.object.isRequired,
};

// Main Stats Dashboard
export function StatsDashboard({ players, gameStats }) {
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(true);
  
  const { sortedPlayers, rankMap } = useMemo(() => {
    const sorted = [...players].sort((a, b) => (b.victoryPoints || 0) - (a.victoryPoints || 0));
    const ranks = calculateRanksWithTies(players);
    return { sortedPlayers: sorted, rankMap: ranks };
  }, [players]);

  const playerStats = useMemo(() => {
    const stats = {};
    players.forEach(p => {
      stats[p.id] = {
        towns: p.towns || 0,
        cities: p.cities || 0,
        roads: p.roads || 0,
        trades: p.trades || 0,
        devCards: Array.isArray(p.devCards) ? p.devCards.length : (p.devCards || 0),
      };
    });
    return stats;
  }, [players]);

  const maxValues = useMemo(() => {
    const resourcesTotals = players.map(p => Object.values(p.resources || {}).reduce((a, b) => a + b, 0));
    const towns = players.map(p => p.towns || 0);
    const cities = players.map(p => p.cities || 0);
    const roads = players.map(p => p.roads || 0);
    const safeMax = (arr, fallback = 0) => (arr.length ? Math.max(...arr, fallback) : fallback);

    return {
      vp: 10,
      resources: safeMax(resourcesTotals, 0),
      towns: safeMax(towns, 0),
      cities: safeMax(cities, 0),
      roads: safeMax(roads, 0),
    };
  }, [players]);

  const overallStats = useMemo(() => {
    const totals = Object.values(playerStats).reduce(
      (acc, s) => ({
        trades: acc.trades + (s.trades || 0),
        buildings: acc.buildings + (s.towns || 0) + (s.cities || 0),
        roads: acc.roads + (s.roads || 0),
      }),
      { trades: 0, buildings: 0, roads: 0 }
    );

    return {
      totalTurns: gameStats?.turn || 1,
      totalTrades: totals.trades,
      totalBuildings: totals.buildings,
      totalRoads: totals.roads,
    };
  }, [gameStats, playerStats]);

  return (
    <Card className="h-full flex flex-col overflow-hidden shadow-2xl shadow-black/35">
      <CardContent
        className="flex-1 overflow-y-auto space-y-2.5 xl:space-y-3 2xl:space-y-4 text-[13px] lg:text-sm xl:text-base leading-relaxed pr-1 min-h-0 pt-4 xl:pt-5 2xl:pt-6"
      >
        {/* Game Analytics Section */}
        <Collapsible
          title="Game Analytics"
          icon={ChartBar}
          defaultOpen={isAnalyticsOpen}
          onOpenChange={setIsAnalyticsOpen}
          variant="elevated"
          className="!bg-transparent !shadow-none !p-0"
          headerClassName="!bg-gradient-to-br !from-slate-800/50 !to-slate-900/60 !rounded-2xl !shadow-lg !shadow-black/20"
        >
          <div className="space-y-2.5 pt-2">
        {/* Overview Stats */}
        <Collapsible
          title="Overview Stats"
          icon={Target}
          badge={overallStats.totalTurns}
          defaultOpen={true}
          variant="elevated"
        >
          <div className="grid grid-cols-2 gap-2 xl:gap-3">
            {[
              { label: "Total Turns", value: overallStats.totalTurns, icon: Target, color: "#6366f1" },
              { label: "Total Trades", value: overallStats.totalTrades, icon: Handshake, color: "#22c55e" },
              { label: "Buildings", value: overallStats.totalBuildings, icon: House, color: "#f59e0b" },
              { label: "Roads Built", value: overallStats.totalRoads, icon: Path, color: "#ef4444" },
            ].map((stat, idx) => (
              <div key={idx} className="p-3 xl:p-4 rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/60 shadow-lg shadow-black/20">
                <div className="flex items-center gap-2 xl:gap-3 mb-1 xl:mb-2">
                  <stat.icon size={14} style={{ color: stat.color }} className="xl:scale-125" />
                  <span className="text-[11px] lg:text-xs xl:text-sm text-slate-500">{stat.label}</span>
                </div>
                <div className="text-xl lg:text-2xl xl:text-3xl font-bold text-slate-200">{stat.value}</div>
              </div>
            ))}
          </div>
        </Collapsible>

        {/* Leaderboard */}
        <Collapsible
          title="Leaderboard"
          icon={Trophy}
          defaultOpen={true}
          variant="elevated"
        >
          <div className="space-y-1.5">
            {sortedPlayers.map((player) => (
              <UILeaderboardRow
                key={player.id}
                player={player}
                rank={rankMap.get(player.id) || 1}
                compact={true}
              />
            ))}
          </div>
        </Collapsible>

        {/* VP Progress Chart */}
        <Collapsible
          title="Victory Point Progress"
          icon={ChartLine}
          defaultOpen={true}
          variant="elevated"
        >
          <div className="p-3 rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/60 shadow-lg shadow-black/20">
            <VPProgressChart players={players} gameStats={gameStats} />
          </div>
        </Collapsible>

        {/* Resource Distribution */}
        <Collapsible
          title="Resource Distribution"
          icon={Cube}
          defaultOpen={true}
          variant="elevated"
        >
          <div className="p-3 rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/60 shadow-lg shadow-black/20">
            <ResourceDistributionChart players={players} />
          </div>
        </Collapsible>

        {/* Player Strategy Analysis */}
        <Collapsible
          title="Player Strategy Analysis"
          icon={TrendUp}
          badge={players.length}
          defaultOpen={false}
          variant="elevated"
        >
          <div className="grid grid-cols-1 gap-2">
            {players.map((player) => {
              const playerColor = getPlayerColor(player.id);
              const stats = playerStats[player.id];
              const maxStatValue = Math.max(stats.towns * 2, stats.cities * 3, stats.roads, stats.trades);
              
              return (
                <div key={player.id} className="rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/60 shadow-lg shadow-black/20 overflow-hidden">
                  <div 
                    className="p-2.5 border-b border-slate-700/30 flex items-center gap-2"
                    style={{ background: `${playerColor.primary}08` }}
                  >
                    <PlayerLabel playerId={player.id} size="sm" />
                    <ProviderBadge player={player} />
                  </div>
                  
                  <div className="p-2.5 space-y-2">
                    <StatBar 
                      label="Settlements" 
                      value={stats.towns} 
                      max={maxStatValue || 5}
                      color="#22c55e"
                      icon={House}
                    />
                    <StatBar 
                      label="Cities" 
                      value={stats.cities} 
                      max={maxStatValue || 4}
                      color="#8b5cf6"
                      icon={Buildings}
                    />
                    <StatBar 
                      label="Roads" 
                      value={stats.roads} 
                      max={maxStatValue || 15}
                      color="#f59e0b"
                      icon={Path}
                    />
                    <StatBar 
                      label="Trades" 
                      value={stats.trades} 
                      max={maxStatValue || 10}
                      color="#06b6d4"
                      icon={Handshake}
                    />
                    <StatBar 
                      label="Dev Cards" 
                      value={stats.devCards} 
                      max={maxStatValue || 5}
                      color="#ec4899"
                      icon={Lightning}
                    />
                  </div>

                  <div className="px-2.5 pb-2.5">
                    <div className="text-[10px] text-slate-500 mb-1">Resource Split</div>
                    <ResourcePieChart player={player} />
                  </div>
                </div>
              );
            })}
          </div>
        </Collapsible>

        {/* Performance Comparison */}
        <Collapsible
          title="Performance Comparison"
          icon={Users}
          defaultOpen={false}
          variant="elevated"
        >
          <div className="grid grid-cols-2 gap-2">
            {players.map((player) => (
              <div key={player.id} className="p-2.5 rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/60 shadow-lg shadow-black/20">
                <div className="flex items-center gap-2 mb-2">
                  <PlayerLabel playerId={player.id} size="sm" />
                  <ProviderBadge player={player} />
                </div>
                <PlayerRadarChart player={player} maxValues={maxValues} />
              </div>
            ))}
          </div>
        </Collapsible>
          </div>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

StatsDashboard.propTypes = {
  players: PropTypes.array.isRequired,
  gameStats: PropTypes.object,
};

export default StatsDashboard;
