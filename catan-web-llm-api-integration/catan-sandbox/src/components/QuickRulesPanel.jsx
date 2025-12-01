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
    <Card className="h-full flex flex-col overflow-hidden shadow-2xl shadow-black/35">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 xl:gap-3">
          <Book size={14} className="text-emerald-400 xl:scale-125" />
          <span className="text-[14px] lg:text-base xl:text-lg font-semibold">Quick Rules</span>
        </CardTitle>
      </CardHeader>

      <CardContent
        className="flex-1 overflow-y-auto space-y-2.5 xl:space-y-3 2xl:space-y-4 text-[13px] lg:text-sm xl:text-base leading-relaxed pr-1 min-h-0"
      >
        {/* Added spacing between collapsibles with space-y-3 */}
        <div className="space-y-3 xl:space-y-4">
          {/* How to play - Collapsible */}
          <Collapsible 
            title="How to Play" 
            icon={ListChecks}
            defaultOpen={true}
            variant="elevated"
          >
            <div className="space-y-2 xl:space-y-3">
              {steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3 xl:gap-4 p-3 xl:p-4 rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/60 shadow-lg shadow-black/20">
                  <span className="flex-shrink-0 w-6 h-6 xl:w-8 xl:h-8 rounded-full bg-gradient-to-br from-emerald-500/25 to-emerald-600/15 text-emerald-300 text-[13px] lg:text-sm xl:text-base font-bold flex items-center justify-center shadow-inner shadow-emerald-500/10">
                    {idx + 1})
                  </span>
                  <div>
                    <div className="text-[13px] lg:text-sm xl:text-base text-slate-100 font-semibold">{step.title}</div>
                    <div className="text-[12px] lg:text-[13px] xl:text-sm text-slate-400 mt-0.5 leading-relaxed">{step.desc}</div>
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
            <div className="grid grid-cols-2 gap-1.5 xl:gap-2">
              {["wood", "brick", "wheat", "sheep", "ore"].map((key) => (
                <div key={key} className="flex items-center gap-2.5 xl:gap-3 px-3 xl:px-4 py-2.5 xl:py-3 rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/70 shadow-md shadow-black/20 hover:from-slate-800/60 hover:to-slate-900/80 transition-all duration-150">
                  <span className="text-base xl:text-lg 2xl:text-xl drop-shadow-sm">{resourceEmoji(key)}</span>
                  <span className="text-[13px] lg:text-sm xl:text-base text-slate-200 capitalize font-medium">{key}</span>
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
            <div className="space-y-1.5 xl:space-y-2">
              {buildCosts.map((row) => (
                <div key={row.name} className="flex items-center justify-between p-3 xl:p-4 rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/60 shadow-lg shadow-black/20">
                  <span className="text-[13px] lg:text-sm xl:text-base font-semibold text-slate-100">{row.name}</span>
                  <div className="flex items-center gap-1 xl:gap-1.5">
                    {row.cost.map((c, i) => (
                      <div
                        key={`${row.name}-${c.resource}-${i}`}
                        className="flex items-center gap-1 xl:gap-1.5 px-2 xl:px-3 py-1 xl:py-1.5 rounded-full bg-gradient-to-br from-slate-700/60 to-slate-800/80 shadow-sm shadow-black/20"
                      >
                        <span className="text-[13px] xl:text-base drop-shadow-sm">{resourceEmoji(c.resource)}</span>
                        <span className="text-[11px] lg:text-xs xl:text-sm font-semibold text-slate-200">{c.amount}</span>
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

