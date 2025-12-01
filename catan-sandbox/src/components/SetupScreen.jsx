import React, { useState } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Shuffle,
  Users,
  Robot,
  User,
  CaretDown,
  Check,
  Hexagon,
  Gear,
  CaretRight,
  Desktop,
  Globe,
  Sparkle,
  GameController,
  Key,
  WarningCircle,
  Crown,
  Lightning,
  Cube,
} from "@phosphor-icons/react";
import { cn, resourceColor } from "../lib/utils";
import { getPlayerColor } from "../lib/colors";
import { TILE_SIZE, hexCorner } from "../../shared/board.js";
import {
  PROVIDER_ICONS,
  PROVIDER_COLORS,
  LLM_CATEGORIES,
  WHITE_LOGO_PROVIDERS,
} from "../lib/providers";
import { Card, CardContent } from "./ui/Card";
import { Collapsible } from "./ui/Collapsible";
import { Button } from "./ui/Button";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
  "http://localhost:4000";

// ============================================
// Provider Logo with Real Icons
// ============================================
export function ProviderLogo({ providerId, size = 20 }) {
  const IconComponent = PROVIDER_ICONS[providerId];
  const color = PROVIDER_COLORS[providerId] || "#666";
  const useWhiteLogo = WHITE_LOGO_PROVIDERS.includes(providerId);
  
  if (IconComponent) {
    // Try to use Color variant for non-white-logo providers
    if (!useWhiteLogo && IconComponent.Color) {
      return (
        <div className="flex-shrink-0 flex items-center justify-center">
          <IconComponent.Color size={size} />
        </div>
      );
    }
    
    // For white logo providers or providers without Color variant
    const iconStyle = useWhiteLogo 
      ? { color: "#ffffff", fill: "#ffffff" } 
      : { color, fill: color };
    
    return (
      <div className="flex-shrink-0 flex items-center justify-center">
        <IconComponent size={size} style={iconStyle} />
      </div>
    );
  }
  
  return (
    <div
      className="rounded-md flex items-center justify-center font-bold text-white text-[9px] flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: color,
      }}
    >
      {providerId?.slice(0, 2).toUpperCase() || "??"}
    </div>
  );
}

ProviderLogo.propTypes = {
  providerId: PropTypes.string,
  size: PropTypes.number,
};

// Helpers for looking up provider metadata
function findProvider(categoryId, providerId) {
  const category = LLM_CATEGORIES[categoryId];
  if (!category) return null;
  return category.providers.find((p) => p.id === providerId) || null;
}

function providerRequiresApiKey(categoryId, providerId) {
  const provider = findProvider(categoryId, providerId);
  if (!provider) return false;
  if (provider.local) return false;
  return true;
}

function getApiKeyValidation(categoryId, providerId, apiKey) {
  const required = providerRequiresApiKey(categoryId, providerId);
  const trimmed = (apiKey || "").trim();

  if (!required) {
    return { required: false, isValid: true, message: "" };
  }

  if (!trimmed) {
    return { required: true, isValid: false, message: "API key required for this provider." };
  }

  if (trimmed.length < 10) {
    return { required, isValid: false, message: "API key looks too short." };
  }

  return { required, isValid: true, message: "API key format looks okay." };
}

// ============================================
// LLM Provider Dropdown (Improved)
// ============================================
function LLMProviderDropdown({ config, onChange, onClose }) {
  const defaultCategory = config.providerCategory || Object.keys(LLM_CATEGORIES)[0] || null;
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory);

  const updateProviderState = (categoryId, provider, extra = {}) => {
    const fallbackModel = provider.models?.[0] || "";
    const fallbackEndpoint = provider.endpoints?.[0]?.url || "";
    const sameProvider = config.provider === provider.id;
    const resolvedModel =
      extra.model ?? (sameProvider ? config.model : null) ?? fallbackModel;
    const resolvedEndpoint =
      extra.apiEndpoint ?? (sameProvider ? config.apiEndpoint : null) ?? fallbackEndpoint;

    onChange({
      ...config,
      providerCategory: categoryId,
      provider: provider.id,
      providerName: provider.name,
      model: resolvedModel,
      apiEndpoint: resolvedEndpoint,
      apiKey: config.apiKey || "",
      apiKeyStatus: sameProvider ? config.apiKeyStatus || "idle" : "idle",
      apiKeyMessage: sameProvider ? config.apiKeyMessage || "" : "",
    });
  };

  const handleProviderSelect = (categoryId, provider) => {
    updateProviderState(categoryId, provider);
    onClose(); // Close dropdown after selecting provider
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className="mt-2 w-full z-[40] rounded-2xl overflow-hidden shadow-2xl shadow-black/60"
      style={{
        background: "linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.95))",
        border: "1px solid rgba(71, 85, 105, 0.3)",
      }}
    >
      <div className="max-h-[380px] overflow-y-auto">
        {Object.entries(LLM_CATEGORIES).map(([categoryId, category]) => (
          <div key={categoryId}>
            {/* Category Header */}
            <button
              onClick={() =>
                setSelectedCategory(selectedCategory === categoryId ? null : categoryId)
              }
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-1.5 h-6 rounded-full"
                  style={{ background: `linear-gradient(180deg, ${category.color}, ${category.color}80)` }}
                />
                <span className="text-sm font-semibold text-slate-200">
                  {category.label}
                </span>
                <span className="text-[11px] text-slate-500">
                  ({category.providers.length})
                </span>
              </div>
              <CaretRight
                size={14}
                weight="bold"
                className={cn(
                  "text-slate-500 transition-transform duration-200",
                  selectedCategory === categoryId && "rotate-90 text-slate-300"
                )}
              />
            </button>

            {/* Providers */}
            <AnimatePresence>
              {selectedCategory === categoryId && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <div className="px-2 pb-2 space-y-1">
                    {category.providers.map((provider) => (
                      <button
                        key={provider.id}
                        onClick={() => handleProviderSelect(categoryId, provider)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150",
                          "hover:bg-white/[0.05]",
                          config.provider === provider.id && "bg-indigo-500/10 ring-1 ring-indigo-500/30"
                        )}
                      >
                        <ProviderLogo providerId={provider.id} size={18} />
                        <span className="text-sm text-slate-200 flex-1 text-left font-medium">
                          {provider.name}
                        </span>
                        {provider.local ? (
                          <span className="text-[10px] text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Desktop size={10} />
                            Local
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-400/70 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Globe size={10} />
                            Online
                          </span>
                        )}
                        {config.provider === provider.id && (
                          <Check size={14} weight="bold" className="text-indigo-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

LLMProviderDropdown.propTypes = {
  config: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

// ============================================
// Player Configuration Card
// ============================================
function PlayerConfigCard({ playerId, config, onChange }) {
  const color = getPlayerColor(playerId);
  const [showDropdown, setShowDropdown] = useState(false);

  const apiKey = config.apiKey || "";
  const apiKeyStatus = config.apiKeyStatus || "idle";
  const apiKeyStatusMessage = config.apiKeyMessage || "";
  const isVerifying = apiKeyStatus === "checking";
  const { required: apiKeyRequired, isValid: apiKeyValid, message: apiKeyMessage } =
    getApiKeyValidation(config.providerCategory, config.provider, apiKey);
  const showApiKeySection =
    config.type === "llm" && config.provider && providerRequiresApiKey(config.providerCategory, config.provider);
  const providerMeta = config.providerCategory && config.provider
    ? findProvider(config.providerCategory, config.provider)
    : null;
  const endpointOptions = providerMeta?.endpoints || [];
  const effectiveEndpoint =
    config.apiEndpoint || (endpointOptions.length > 0 ? endpointOptions[0].url : "");
  const modelOptions = providerMeta?.models || [];
  const selectedModel = config.model || (modelOptions[0] || "");

  const handleTypeToggle = (type) => {
    onChange({
      ...config,
      type,
      provider: type === "human" ? null : config.provider,
      model: type === "human" ? null : config.model,
    });
    if (type === "human") setShowDropdown(false);
  };

  const handleVerifyApiKey = async () => {
    if (!config.provider) {
      onChange({
        ...config,
        apiKeyStatus: "invalid",
        apiKeyMessage: "Select a provider before verifying.",
      });
      return;
    }

    if (!apiKey && apiKeyRequired) {
      onChange({
        ...config,
        apiKeyStatus: "invalid",
        apiKeyMessage: "Enter an API key to verify.",
      });
      return;
    }

    onChange({
      ...config,
      apiKeyStatus: "checking",
      apiKeyMessage: "Verifying key with provider...",
    });

    try {
      const res = await fetch(`${API_BASE}/api/llm/verify-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: config.provider,
          apiKey,
          apiEndpoint: effectiveEndpoint,
        }),
      });
      const data = await res.json();

      if (data.ok) {
        onChange({
          ...config,
          apiKeyStatus: "valid",
          apiKeyMessage: data.message || "API key verified successfully.",
        });
      } else {
        onChange({
          ...config,
          apiKeyStatus: "invalid",
          apiKeyMessage: data.error || "Verification failed.",
        });
      }
    } catch (err) {
      onChange({
        ...config,
        apiKeyStatus: "invalid",
        apiKeyMessage: "Network error while verifying.",
      });
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: playerId * 0.05 }}
      className="rounded-2xl overflow-hidden transition-all"
      style={{
        background: `linear-gradient(135deg, ${color.primary}12, ${color.primary}05)`,
        boxShadow: `0 4px 20px ${color.primary}08, inset 0 1px 0 rgba(255,255,255,0.03)`,
      }}
    >
      {/* Left accent bar */}
      <div className="flex">
        <div 
          className="w-1 flex-shrink-0"
          style={{ background: `linear-gradient(180deg, ${color.primary}, ${color.dark})` }}
        />
        
        <div className="flex-1 p-4">
          {/* Header row */}
          <div className="flex items-center gap-3">
            {/* Player Badge */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shadow-lg flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${color.primary}, ${color.dark})`,
                color: "white",
                boxShadow: `0 4px 12px ${color.primary}40`,
              }}
            >
              {playerId + 1}
            </div>

            {/* Player Info */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-slate-100">Player {playerId + 1}</div>
              <div className="text-[12px] text-slate-400 truncate mt-0.5">
                {config.type === "human" 
                  ? "Human Player" 
                  : config.provider 
                    ? `${config.providerName || config.provider} · ${config.model}`
                    : "Select AI Provider"
                }
              </div>
            </div>

            {/* Type Toggle */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/60 flex-shrink-0">
              <button
                onClick={() => handleTypeToggle("human")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-200",
                  config.type === "human"
                    ? "bg-slate-700/80 text-slate-100 shadow-md"
                    : "text-slate-500 hover:text-slate-300"
                )}
              >
                <User size={14} weight={config.type === "human" ? "fill" : "regular"} />
                Human
              </button>
              <button
                onClick={() => handleTypeToggle("llm")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-200",
                  config.type === "llm"
                    ? "bg-indigo-500/25 text-indigo-200 shadow-md ring-1 ring-indigo-400/30"
                    : "text-slate-500 hover:text-slate-300"
                )}
              >
                <Robot size={14} weight={config.type === "llm" ? "fill" : "regular"} />
                AI
              </button>
            </div>
          </div>

          {/* LLM Configuration */}
          <AnimatePresence>
            {config.type === "llm" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-visible mt-4"
              >
                <div className="relative">
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left group"
                    style={{
                      background: "linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(30, 41, 59, 0.6))",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.03)",
                    }}
                  >
                    {config.provider ? (
                      <div className="flex items-center gap-3">
                        <ProviderLogo providerId={config.provider} size={22} />
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-200">
                            {config.providerName || config.provider}
                          </span>
                          <span className="text-[11px] text-slate-500">{config.model}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">Select AI Provider...</span>
                    )}
                    <CaretDown
                      size={16}
                      weight="bold"
                      className={cn(
                        "text-slate-500 transition-all duration-200 group-hover:text-slate-300",
                        showDropdown && "rotate-180 text-indigo-400"
                      )}
                    />
                  </button>

                  <AnimatePresence>
                    {showDropdown && (
                      <LLMProviderDropdown
                        config={config}
                        onChange={onChange}
                        onClose={() => setShowDropdown(false)}
                      />
                    )}
                  </AnimatePresence>
                </div>

                {/* Endpoint & API key configuration */}
                {showApiKeySection && (
                  <div className="mt-3 space-y-3">
                    {/* Model selector */}
                    {modelOptions.length > 0 && (
                      <div>
                        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                          Model
                        </div>
                        <div className="relative">
                          {config.provider && (
                            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 flex items-center z-10 bg-slate-800/50 rounded-md p-0.5">
                              <ProviderLogo providerId={config.provider} size={16} />
                            </div>
                          )}
                          <select
                            value={selectedModel}
                            onChange={(e) =>
                              onChange({
                                ...config,
                                model: e.target.value,
                              })
                            }
                            className={cn(
                              "w-full px-3 py-2.5 rounded-xl bg-slate-900/90 text-[13px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 appearance-none transition-all cursor-pointer",
                              "shadow-[inset_0_0_0_1px_rgba(71,85,105,0.3)]",
                              config.provider && "pl-11"
                            )}
                          >
                            {modelOptions.map((model) => (
                              <option key={model} value={model} className="bg-slate-900">
                                {model}
                              </option>
                            ))}
                          </select>
                          <CaretDown
                            size={12}
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                          />
                        </div>
                      </div>
                    )}

                    {/* Endpoint selector */}
                    {endpointOptions.length > 0 && (
                      <div>
                        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                          Endpoint
                        </div>
                        <div className="relative">
                          <select
                            value={effectiveEndpoint}
                            onChange={(e) =>
                              onChange({
                                ...config,
                                apiEndpoint: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl bg-slate-900/80 text-[13px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 appearance-none transition-all shadow-[inset_0_0_0_1px_rgba(71,85,105,0.3)]"
                          >
                            {endpointOptions.map((opt) => (
                              <option key={opt.id} value={opt.url} className="bg-slate-900">
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <CaretDown
                            size={12}
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                          />
                        </div>
                      </div>
                    )}

                    {/* API key field */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                          API Key
                        </span>
                        {(apiKeyStatus !== "idle" || apiKey) && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]",
                              apiKeyStatus === "valid" && "bg-emerald-500/15 text-emerald-300",
                              apiKeyStatus === "invalid" && "bg-amber-500/15 text-amber-300",
                              apiKeyStatus === "checking" && "bg-indigo-500/15 text-indigo-200",
                              apiKeyStatus === "idle" && "bg-slate-800/60 text-slate-400"
                            )}
                          >
                            <Key size={10} />
                            {apiKeyStatusMessage ||
                              (apiKeyStatus === "valid"
                                ? "Verified"
                                : apiKeyStatus === "invalid"
                                  ? "Check key"
                                  : apiKeyStatus === "checking"
                                    ? "Verifying..."
                                    : apiKeyValid
                                      ? "Looks good"
                                      : "Enter key")}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          autoComplete="off"
                          value={apiKey}
                          onChange={(e) =>
                            onChange({
                              ...config,
                              apiKey: e.target.value,
                              apiKeyStatus: "idle",
                              apiKeyMessage: "",
                            })
                          }
                          placeholder="Paste your API key"
                          className="flex-1 px-3 py-2 rounded-xl bg-slate-900/80 text-[13px] text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-[inset_0_0_0_1px_rgba(71,85,105,0.3)]"
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleVerifyApiKey}
                          disabled={isVerifying || (!apiKey && apiKeyRequired) || !config.provider}
                        >
                          <Key size={12} />
                          {isVerifying ? "..." : "Verify"}
                        </Button>
                      </div>
                      {apiKeyRequired && (
                        <p
                          className={cn(
                            "mt-1.5 text-[11px]",
                            apiKeyValid ? "text-emerald-400/80" : "text-amber-300/80"
                          )}
                        >
                          {apiKeyStatusMessage || apiKeyMessage}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

PlayerConfigCard.propTypes = {
  playerId: PropTypes.number.isRequired,
  config: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
};

// ============================================
// Board Preview Component
// ============================================
function BoardPreview({ board, bbox, onRerandomize }) {
  return (
    <div className="h-full flex flex-col">
      {/* Board container */}
      <div
        className="relative w-full rounded-2xl overflow-hidden flex-1"
        style={{
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.6), rgba(30, 41, 59, 0.4))",
          minHeight: "280px",
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`${bbox.minX} ${bbox.minY} ${bbox.width} ${bbox.height}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 w-full h-full"
        >
          <defs>
            <filter id="hexShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.35" />
            </filter>
          </defs>
          {board.tiles.map((t, idx) => {
            const pts = Array.from({ length: 6 }, (_, i) => hexCorner(t.center, TILE_SIZE, i));
            const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";
            const isHot = t.number === 6 || t.number === 8;
            return (
              <g key={idx}>
                <path
                  d={path}
                  fill={resourceColor(t.resource)}
                  stroke="rgba(0,0,0,0.35)"
                  strokeWidth={1}
                  filter="url(#hexShadow)"
                />
                {t.number && t.resource !== "desert" && (
                  <>
                    <circle
                      cx={t.center.x}
                      cy={t.center.y}
                      r={10}
                      fill="#0f172a"
                      stroke={isHot ? "rgba(239,68,68,0.5)" : "rgba(51,65,85,0.4)"}
                      strokeWidth={1}
                    />
                    <text
                      x={t.center.x}
                      y={t.center.y + 1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={isHot ? "#ef4444" : "#e2e8f0"}
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="system-ui, sans-serif"
                    >
                      {t.number}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Shuffle button */}
      <div className="flex justify-center mt-3">
        <Button variant="secondary" size="sm" onClick={onRerandomize}>
          <Shuffle size={14} />
          Shuffle Board
        </Button>
      </div>
    </div>
  );
}

BoardPreview.propTypes = {
  board: PropTypes.object.isRequired,
  bbox: PropTypes.object.isRequired,
  onRerandomize: PropTypes.func.isRequired,
};

// ============================================
// Main Setup Screen Component
// ============================================
export function SetupScreen({ 
  numPlayers, 
  setNumPlayers, 
  playerConfigs = [], 
  setPlayerConfigs, 
  onStart, 
  onRerandomize, 
  board, 
  bbox 
}) {
  const MIN_PLAYERS = 2;
  const MAX_PLAYERS = 4;

  const configs = playerConfigs.length >= numPlayers 
    ? playerConfigs 
    : Array.from({ length: numPlayers }, (_, i) => 
        playerConfigs[i] || {
          type: "human",
          provider: null,
          providerCategory: null,
          model: null,
          apiKey: "",
          apiEndpoint: "",
          apiKeyStatus: "idle",
          apiKeyMessage: "",
        }
      );

  const handlePlayerCountChange = (count) => {
    setNumPlayers(count);
    const newConfigs = Array.from({ length: count }, (_, i) => 
      configs[i] || {
        type: "human",
        provider: null,
        providerCategory: null,
        model: null,
        apiKey: "",
        apiEndpoint: "",
        apiKeyStatus: "idle",
        apiKeyMessage: "",
      }
    );
    setPlayerConfigs?.(newConfigs);
  };

  const handlePlayerConfigChange = (index, config) => {
    const newConfigs = [...configs];
    newConfigs[index] = config;
    setPlayerConfigs?.(newConfigs);
  };

  const aiCount = configs.filter(c => c?.type === "llm").length;
  const humanCount = numPlayers - aiCount;

  const canStart = configs.every((c) => {
    if (!c || c.type !== "llm") return true;
    if (!c.provider || !c.model) return false;
    const { required, isValid } = getApiKeyValidation(
      c.providerCategory,
      c.provider,
      c.apiKey
    );
    return !required || isValid;
  });

  return (
    <div className="min-h-screen p-4 lg:p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-amber-500/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-500/[0.04] rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-6xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center gap-3 mb-2"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <Hexagon size={20} weight="fill" className="text-white" />
            </div>
            <h1 className="text-xl lg:text-2xl font-bold text-slate-100">Settlers of Catan</h1>
          </motion.div>
          <p className="text-slate-500 text-sm">Configure your game and players</p>
        </div>

        {/* Main Layout */}
        <div className="flex flex-col gap-5">
          {/* Configuration */}
          <Card>
            <CardContent className="p-4 lg:p-5 space-y-4">
              {/* Player Count Section */}
              <Collapsible
                title="Number of Players"
                icon={Users}
                defaultOpen={true}
                variant="elevated"
              >
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => MIN_PLAYERS + i).map((n) => (
                    <button
                      key={n}
                      onClick={() => handlePlayerCountChange(n)}
                      className={cn(
                        "py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
                        numPlayers === n
                          ? "bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-500/40 shadow-lg shadow-indigo-500/10"
                          : "bg-slate-800/40 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                      )}
                    >
                      {n} Players
                    </button>
                  ))}
                </div>
              </Collapsible>

              {/* Player Configuration Section */}
              <Collapsible
                title="Player Configuration"
                icon={Gear}
                badge={numPlayers}
                defaultOpen={true}
                variant="elevated"
              >
                <div className="space-y-3">
                  {Array.from({ length: numPlayers }, (_, i) => (
                    <PlayerConfigCard
                      key={i}
                      playerId={i}
                      config={configs[i] || { type: "human", provider: null, providerCategory: null, model: null }}
                      onChange={(config) => handlePlayerConfigChange(i, config)}
                    />
                  ))}
                </div>
              </Collapsible>

              {/* Game Summary & Start */}
              <div className="pt-2">
                {/* Summary */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/50 text-[12px]">
                    <GameController size={14} className="text-slate-400" />
                    <span className="text-slate-300 font-medium">{numPlayers} players</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/50 text-[12px]">
                    <User size={14} className="text-blue-400" />
                    <span className="text-slate-300 font-medium">{humanCount} human</span>
                  </div>
                  {aiCount > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/15 text-[12px]">
                      <Robot size={14} className="text-indigo-400" />
                      <span className="text-indigo-300 font-medium">{aiCount} AI</span>
                    </div>
                  )}
                </div>

                {!canStart && aiCount > 0 && (
                  <div className="flex items-start gap-2 mb-3 text-[12px] text-amber-300/90 p-3 rounded-xl bg-amber-500/10">
                    <WarningCircle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <span>Configure provider, model, and API key for all AI players to start.</span>
                  </div>
                )}

                {/* Start Button */}
                <Button
                  variant="success"
                  size="lg"
                  onClick={onStart}
                  disabled={!canStart}
                  className="w-full"
                >
                  <Play size={18} weight="fill" />
                  Start Game
                  <Sparkle size={16} weight="fill" className="text-emerald-200" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Board Preview */}
          <Card>
            <CardContent className="p-4 lg:p-5">
              <Collapsible
                title="Board Preview"
                icon={Hexagon}
                defaultOpen={true}
                variant="elevated"
              >
                <BoardPreview board={board} bbox={bbox} onRerandomize={onRerandomize} />
              </Collapsible>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}

SetupScreen.propTypes = {
  numPlayers: PropTypes.number.isRequired,
  setNumPlayers: PropTypes.func.isRequired,
  playerConfigs: PropTypes.array,
  setPlayerConfigs: PropTypes.func,
  onStart: PropTypes.func.isRequired,
  onRerandomize: PropTypes.func.isRequired,
  board: PropTypes.object.isRequired,
  bbox: PropTypes.object.isRequired,
};

export default SetupScreen;
