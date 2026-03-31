"use client";
import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { User, Bell, Shield, CreditCard, Palette, Globe, Save, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "appearance", label: "Appearance", icon: Palette },
];

const inputClass =
  "w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder-muted-foreground outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 transition-all text-sm";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main>
        {/* Header */}
        <div className="border-b border-border bg-card">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-2xl font-black text-foreground">Settings</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your account preferences</p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row gap-8">

            {/* Sidebar nav */}
            <div className="sm:w-48 shrink-0">
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors text-left",
                      activeTab === tab.id
                        ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <tab.icon className="w-4 h-4 shrink-0" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">

                {activeTab === "profile" && (
                  <div className="space-y-6">
                    <h2 className="text-base font-bold text-foreground border-b border-border pb-4">Profile Information</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Full Name</label>
                        <input type="text" defaultValue="AI Learner" className={inputClass} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Username</label>
                        <input type="text" defaultValue="ailearner" className={inputClass} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email Address</label>
                        <input type="email" defaultValue="learner@example.com" className={inputClass} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Bio</label>
                        <textarea rows={3} defaultValue="AI enthusiast and lifelong learner." className={cn(inputClass, "resize-none")} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Country</label>
                        <select className={inputClass}>
                          <option>United States</option>
                          <option>United Kingdom</option>
                          <option>Nigeria</option>
                          <option>India</option>
                          <option>Canada</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Website</label>
                        <input type="url" placeholder="https://yoursite.com" className={inputClass} />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "notifications" && (
                  <div className="space-y-6">
                    <h2 className="text-base font-bold text-foreground border-b border-border pb-4">Notification Preferences</h2>
                    {[
                      { label: "Course announcements", desc: "New content and updates in your enrolled courses", default: true },
                      { label: "Learning reminders", desc: "Daily reminders to keep your streak going", default: true },
                      { label: "Certificate earned", desc: "Notify me when I complete a course", default: true },
                      { label: "Promotions & offers", desc: "Deals, discounts, and new course alerts", default: false },
                      { label: "Weekly digest", desc: "Summary of your learning progress each week", default: true },
                    ].map((item) => (
                      <div key={item.label} className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                        </div>
                        <input
                          type="checkbox"
                          defaultChecked={item.default}
                          className="w-4 h-4 rounded accent-blue-600 mt-0.5 cursor-pointer shrink-0"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "security" && (
                  <div className="space-y-6">
                    <h2 className="text-base font-bold text-foreground border-b border-border pb-4">Security</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Current Password</label>
                        <input type="password" placeholder="••••••••" className={inputClass} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">New Password</label>
                        <input type="password" placeholder="••••••••" className={inputClass} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Confirm New Password</label>
                        <input type="password" placeholder="••••••••" className={inputClass} />
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        <strong>Tip:</strong> Use a strong password with at least 12 characters, including uppercase, lowercase, numbers, and symbols.
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === "billing" && (
                  <div className="space-y-6">
                    <h2 className="text-base font-bold text-foreground border-b border-border pb-4">Billing & Subscription</h2>
                    <div className="p-5 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-foreground text-sm">Free Plan</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Access to 50+ beginner courses</p>
                        </div>
                        <a href="/pricing" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">
                          Upgrade
                        </a>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">No payment methods on file. Add one when upgrading to Pro.</p>
                  </div>
                )}

                {activeTab === "appearance" && (
                  <div className="space-y-6">
                    <h2 className="text-base font-bold text-foreground border-b border-border pb-4">Appearance</h2>
                    <div>
                      <p className="text-sm font-medium text-foreground mb-3">Theme</p>
                      <p className="text-xs text-muted-foreground mb-4">Use the sun/moon toggle in the navigation bar to switch between light and dark mode at any time.</p>
                      <div className="p-4 rounded-xl bg-muted border border-border">
                        <p className="text-xs text-muted-foreground">Your current theme preference is saved automatically in your browser.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Save button */}
                <div className="flex justify-end mt-6 pt-6 border-t border-border">
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
                  >
                    {saved ? <><Check className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Changes</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
