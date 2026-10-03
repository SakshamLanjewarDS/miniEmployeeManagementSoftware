"use client";

import React from "react";
import { CustomFieldDefinition } from "@/server/modules/custom-fields/repository";
import { Check, X, ExternalLink } from "lucide-react";

interface DynamicCardFieldsProps {
  fields: CustomFieldDefinition[];
  values?: Record<string, any> | null;
}

export function DynamicCardFields({ fields, values }: DynamicCardFieldsProps) {
  if (!fields || !values || fields.length === 0) return null;

  // Filter only fields marked to be displayed on cards that have a defined value
  const cardFields = fields.filter((f) => {
    if (!f.showOnCard) return false;
    const v = values[f.key];
    return v !== undefined && v !== null && v !== "" && v !== false;
  });

  if (cardFields.length === 0) return null;

  return (
    <div className="pt-2 border-t border-[#E2E6F0] space-y-1.5">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
        Custom Attributes
      </span>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        {cardFields.map((f) => {
          const val = values[f.key];

          return (
            <div key={f.id} className="flex items-center justify-between text-[11px] py-0.5">
              <span className="text-slate-500 font-medium truncate mr-1.5">{f.label}:</span>
              <span className="font-bold text-slate-800 text-right truncate">
                {f.type === "boolean" ? (
                  val ? (
                    <span className="inline-flex items-center gap-0.5 text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-semibold text-[10px]">
                      <Check className="w-2.5 h-2.5" /> Yes
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded font-semibold text-[10px]">
                      <X className="w-2.5 h-2.5" /> No
                    </span>
                  )
                ) : f.type === "url" ? (
                  <a
                    href={String(val)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#4865F6] hover:underline inline-flex items-center gap-1"
                  >
                    <span>View Link</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                ) : f.type === "date" ? (
                  new Date(val).toLocaleDateString("en-IN")
                ) : f.type === "number" ? (
                  Number(val).toLocaleString("en-IN")
                ) : (
                  String(val)
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
