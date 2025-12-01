import React from "react";
import PropTypes from "prop-types";
import {
  Book,
  ListChecks,
  Sparkle,
  Hammer,
} from "@phosphor-icons/react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/Card";
import { Collapsible } from "./ui/Collapsible";
import { resourceEmoji } from "../lib/utils";

// ============================================
// Quick Rules Panel Component
// ============================================
export function QuickRulesPanel() {
  const steps = [
    { title: "Roll & Produce", desc: "Tiles with matching numbers produce resources." },
    { title: "Trade Smart", desc: "Use harbors or 4:1 bank trades." },
    { title: "Build & Expand", desc: "Roads → settlements → cities." },
    { title: "End Turn", desc: "Pass after building/trading." },
  ];

  const buildCosts = [
    { name: "Road", cost: [{ resource: "wood", amount: 1 }, { resource: "brick", amount: 1 }] },
    { name: "Settlement", cost: [{ resource: "wood", amount: 1 }, { resource: "brick", amount: 1 }, { resource: "wheat", amount: 1 }, { resource: "sheep", amount: 1 }] },
    { name: "City", cost: [{ resource: "ore", amount: 3 }, { resource: "wheat", amount: 2 }] },
    { name: "Dev Card", cost: [{ resource: "ore", amount: 1 }, { resource: "wheat", amount: 1 }, { resource: "sheep", amount: 1 }] },
  ];

  return (
    <Card className="h-full overflow-hidden shadow-2xl shadow-black/35">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Book size={14} className="text-emerald-400" />
          <span className="text-[14px] font-semibold">Quick Rules</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="overflow-y-auto" style={{ maxHeight: "calc(100% - 56px)" }}>
        {/* Added spacing between collapsibles with space-y-3 */}
        <div className="space-y-3">
          {/* How to play - Collapsible */}
          <Collapsible 
            title="How to Play" 
            icon={ListChecks}
            defaultOpen={true}
            variant="elevated"
          >
            <div className="space-y-2">
              {steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/60 shadow-lg shadow-black/20">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500/25 to-emerald-600/15 text-emerald-300 text-[13px] font-bold flex items-center justify-center shadow-inner shadow-emerald-500/10">
                    {idx + 1})
                  </span>
                  <div>
                    <div className="text-[13px] text-slate-100 font-semibold">{step.title}</div>
                    <div className="text-[12px] text-slate-400 mt-0.5 leading-relaxed">{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Collapsible>

          {/* Resources - Collapsible */}
          <Collapsible 
            title="Resources" 
            icon={Sparkle}
            defaultOpen={true}
            variant="elevated"
          >
            <div className="grid grid-cols-2 gap-1.5">
              {["wood", "brick", "wheat", "sheep", "ore"].map((key) => (
                <div key={key} className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/70 shadow-md shadow-black/20 hover:from-slate-800/60 hover:to-slate-900/80 transition-all duration-150">
                  <span className="text-base drop-shadow-sm">{resourceEmoji(key)}</span>
                  <span className="text-[13px] text-slate-200 capitalize font-medium">{key}</span>
                </div>
              ))}
            </div>
          </Collapsible>

          {/* Build costs - Collapsible */}
          <Collapsible 
            title="Build Costs" 
            icon={Hammer}
            defaultOpen={true}
            variant="elevated"
          >
            <div className="space-y-1.5">
              {buildCosts.map((row) => (
                <div key={row.name} className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/60 shadow-lg shadow-black/20">
                  <span className="text-[13px] font-semibold text-slate-100">{row.name}</span>
                  <div className="flex items-center gap-1">
                    {row.cost.map((c, i) => (
                      <div
                        key={`${row.name}-${c.resource}-${i}`}
                        className="flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-br from-slate-700/60 to-slate-800/80 shadow-sm shadow-black/20"
                      >
                        <span className="text-[13px] drop-shadow-sm">{resourceEmoji(c.resource)}</span>
                        <span className="text-[11px] font-semibold text-slate-200">{c.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Collapsible>
        </div>
      </CardContent>
    </Card>
  );
}

export default QuickRulesPanel;

