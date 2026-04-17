"use client";

import { startTransition, useState } from "react";
import { saveAskAiSettingsAction, updateAskAiPlanLimitAction } from "@/app/admin/actions";
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminPageIntro,
  AdminSwitch,
  AdminTextarea,
  FieldLabel,
  StatusPill,
} from "@/components/admin/ui";
import { useToast } from "@/components/ui/ToastProvider";
import { DEFAULT_ASK_AI_NAME, getYearlySavings } from "@/lib/site";
import { formatPrice } from "@/lib/utils";

type AskAiSettings = {
  enabled: boolean;
  assistantLabel: string;
  systemPrompt: string;
};

type AskAiPlan = {
  id: string;
  name: string;
  slug: string;
  price: number;
  yearlyPrice?: number | null;
  currency: string;
  askAiLimit: number;
  isActive: boolean;
};

export function AskAiManager({
  initialSettings,
  plans,
}: {
  initialSettings: AskAiSettings;
  plans: AskAiPlan[];
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [planLimits, setPlanLimits] = useState<Record<string, number>>(
    Object.fromEntries(plans.map((plan) => [plan.id, plan.askAiLimit]))
  );
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingPlanId, setSavingPlanId] = useState<string | null>(null);
  const { toast } = useToast();

  function saveSettings() {
    setSavingSettings(true);
    startTransition(async () => {
      const result = await saveAskAiSettingsAction(settings);
      setSavingSettings(false);
      toast(result.message, result.success ? "success" : "error");
    });
  }

  function savePlanLimit(planId: string) {
    setSavingPlanId(planId);
    startTransition(async () => {
      const result = await updateAskAiPlanLimitAction({
        planId,
        askAiLimit: planLimits[planId] ?? 0,
      });
      setSavingPlanId(null);
      toast(result.message, result.success ? "success" : "error");
    });
  }

  return (
    <div className="space-y-6">
      <AdminPageIntro
        title="Ask AI"
        description="Control the Ask AI assistant experience, toggle platform access, and tune monthly plan limits from one place."
        actions={
          <AdminButton onClick={saveSettings} busy={savingSettings}>
            Save Ask AI Settings
          </AdminButton>
        }
      />

      <AdminCard className="grid gap-5 p-6 md:grid-cols-2">
        <div className="md:col-span-2">
          <AdminSwitch
            checked={settings.enabled}
            onChange={(value) => setSettings((current) => ({ ...current, enabled: value }))}
            label="Enable Ask AI"
            hint="Turn the assistant on or off across course and classroom experiences."
          />
        </div>
        <div>
          <FieldLabel>Assistant Label</FieldLabel>
          <AdminInput
            value={settings.assistantLabel}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                assistantLabel: event.target.value || DEFAULT_ASK_AI_NAME,
              }))
            }
            placeholder={DEFAULT_ASK_AI_NAME}
          />
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-300">Behavior</p>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Ask AI stays course-aware and uses plan-based monthly quotas. When disabled, learners will still see their saved usage state, but the assistant entry points should stay hidden.
          </p>
        </div>
        <div className="md:col-span-2">
          <FieldLabel>System Prompt Override</FieldLabel>
          <AdminTextarea
            rows={6}
            value={settings.systemPrompt}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                systemPrompt: event.target.value,
              }))
            }
            placeholder="Optional global instructions to prepend to Ask AI responses."
          />
        </div>
      </AdminCard>

      <AdminCard className="p-6">
        <div className="mb-5 flex flex-col gap-2">
          <h3 className="text-xl font-black text-white">Plan Limits</h3>
          <p className="text-sm text-slate-400">
            Adjust how many Ask AI requests each plan receives per month. This applies to both monthly and yearly subscribers on the same plan tier.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {plans.map((plan) => {
            const savings = getYearlySavings(plan.price, plan.yearlyPrice);

            return (
              <div
                key={plan.id}
                className="rounded-[24px] border border-white/10 bg-black/30 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-black text-white">{plan.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">{plan.slug}</p>
                  </div>
                  <StatusPill tone={plan.isActive ? "success" : "neutral"}>
                    {plan.isActive ? "Active" : "Inactive"}
                  </StatusPill>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <p className="text-sm font-semibold text-slate-200">
                    {formatPrice(plan.price, plan.currency)}/month
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {plan.yearlyPrice
                      ? `${formatPrice(plan.yearlyPrice, plan.currency)}/year`
                      : "No yearly price configured"}
                  </p>
                  {savings ? (
                    <p className="mt-2 text-xs font-semibold text-cyan-300">
                      Saves {savings.savingsPercent}% yearly
                    </p>
                  ) : null}
                </div>

                <div className="mt-4">
                  <FieldLabel>Monthly Ask AI Limit</FieldLabel>
                  <AdminInput
                    type="number"
                    min={0}
                    step={1}
                    value={planLimits[plan.id] ?? 0}
                    onChange={(event) =>
                      setPlanLimits((current) => ({
                        ...current,
                        [plan.id]: Number(event.target.value || 0),
                      }))
                    }
                  />
                </div>

                <AdminButton
                  className="mt-4 w-full"
                  busy={savingPlanId === plan.id}
                  onClick={() => savePlanLimit(plan.id)}
                >
                  Save Limit
                </AdminButton>
              </div>
            );
          })}
        </div>
      </AdminCard>
    </div>
  );
}
