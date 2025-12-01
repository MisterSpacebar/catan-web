import React, { useMemo } from "react";
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
import { LeaderboardRow as UILeaderboardRow } from "./ui/RankBadge";
import { PlayerLabel } from "./ui/PlayerChip";

// Use modular rank colors from colors.js

// Custom tooltip for charts
function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-lg px-3 py-2 rounded-lg shadow-xl border border-slate-800/50">
        <p className="text-xs text-slate-400 mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

CustomTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
  label: PropTypes.string,
};

// Stat card with animated bar
function StatBar({ label, value, max, color, icon: Icon }) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {Icon && <Icon size={12} className="text-slate-500" />}
          <span className="text-xs text-slate-400">{label}</span>
        </div>
        <span className="text-xs font-medium text-slate-300">{value}</span>
      </div>
      <div className="h-1.5 bg-slate-800/60 rounded-full overflow-hidden">
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
        "flex items-center gap-2 text-[12px] text-slate-300 min-w-0",
        className
      )}
    >
      <div
        className="w-8 h-8 rounded-lg bg-slate-900/70 flex items-center justify-center shadow-inner shadow-black/30 flex-shrink-0"
        style={{ border: `1px solid ${color}30` }}
      >
        {renderIcon()}
      </div>
      <div className="min-w-0 leading-tight">
        <div className="font-semibold truncate">
          {player?.providerName || providerId || (isHuman ? "Human" : "AI")}
        </div>
        {player?.providerModel && (
          <div className="text-[11px] text-slate-500 truncate">{player.providerModel}</div>
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
        name: prettyResource(resource) 
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
        <RechartsTooltip content={<CustomTooltip />} />
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
        <RechartsTooltip content={<CustomTooltip />} />
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
      </RadarChart>
    </ResponsiveContainer>
  );
}

PlayerRadarChart.propTypes = {
  player: PropTypes.object.isRequired,
  maxValues: PropTypes.object.isRequired,
};

// Resource pie chart
function ResourcePieChart({ player }) {
  const data = useMemo(() => {
    const resources = player.resources || {};
    return Object.entries(resources)
      .filter(([, v]) => v > 0)
      .map(([resource, value]) => ({
        name: prettyResource(resource),
        value,
        emoji: resourceEmoji(resource),
      }));
  }, [player]);

  const COLORS = ["#22c55e", "#ef4444", "#eab308", "#4ade80", "#6b7280"];

  if (data.length === 0) {
    return (
      <div className="h-[120px] flex items-center justify-center text-sm text-slate-500">
        No resources
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={120}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={25}
          outerRadius={45}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <RechartsTooltip 
          formatter={(value, name, props) => [
            `${props.payload.emoji} ${value}`,
            name
          ]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

ResourcePieChart.propTypes = {
  player: PropTypes.object.isRequired,
};

// Main Stats Dashboard
export function StatsDashboard({ players, gameStats }) {
  const sortedPlayers = useMemo(() => 
    [...players].sort((a, b) => (b.victoryPoints || 0) - (a.victoryPoints || 0)),
    [players]
  );

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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChartBar size={16} className="text-indigo-400" />
          <span className="text-[14px] font-semibold">Game Analytics</span>
        </CardTitle>
      </CardHeader>

      <CardContent
        className="flex-1 overflow-y-auto space-y-2.5 text-[13px] leading-relaxed pr-1 min-h-0"
      >
        {/* Overview Stats */}
        <Collapsible
          title="Overview Stats"
          icon={Target}
          badge={overallStats.totalTurns}
          defaultOpen={true}
          variant="elevated"
        >
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Total Turns", value: overallStats.totalTurns, icon: Target, color: "#6366f1" },
              { label: "Total Trades", value: overallStats.totalTrades, icon: Handshake, color: "#22c55e" },
              { label: "Buildings", value: overallStats.totalBuildings, icon: House, color: "#f59e0b" },
              { label: "Roads Built", value: overallStats.totalRoads, icon: Path, color: "#ef4444" },
            ].map((stat, idx) => (
              <div key={idx} className="p-3 rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/60 shadow-lg shadow-black/20">
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon size={14} style={{ color: stat.color }} />
                  <span className="text-[11px] text-slate-500">{stat.label}</span>
                </div>
                <div className="text-xl font-bold text-slate-200">{stat.value}</div>
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
            {sortedPlayers.map((player, idx) => (
              <UILeaderboardRow
                key={player.id}
                player={player}
                rank={idx + 1}
                compact={false}
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
      </CardContent>
    </Card>
  );
}

StatsDashboard.propTypes = {
  players: PropTypes.array.isRequired,
  gameStats: PropTypes.object,
};

export default StatsDashboard;
