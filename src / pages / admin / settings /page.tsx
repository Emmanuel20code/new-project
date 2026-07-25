import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Info, Key, Palette } from "lucide-react";

const TABS = [
  { id: "general", label: "General", icon: <Info size={15} /> },
  { id: "mpesa", label: "M-PESA", icon: <Key size={15} /> },
  { id: "appearance", label: "Appearance", icon: <Palette size={15} /> },
] as const;

type TabId = typeof TABS[number]["id"];

const generalSchema = z.object({
  brand_name: z.string().min(1, "Brand name is required"),
  support_phone: z.string().min(1, "Support phone is required"),
  support_email: z.string().email("Enter a valid email"),
});
type GeneralFormData = z.infer<typeof generalSchema>;

function GeneralTab({ settings }: { settings: Record<string, string> | undefined }) {
  const setMany = useMutation(api.settings.setMany);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<GeneralFormData>({
    resolver: zodResolver(generalSchema),
    defaultValues: {
      brand_name: "",
      support_phone: "",
      support_email: "",
    },
  });

  useEffect(() => {
    if (settings) {
      reset({
        brand_name: settings["brand_name"] ?? "EMMATECH",
        support_phone: settings["support_phone"] ?? "",
        support_email: settings["support_email"] ?? "",
      });
    }
  }, [settings, reset]);

  const onSubmit = async (data: GeneralFormData) => {
    try {
      await setMany({
        settings: [
          { key: "brand_name", value: data.brand_name },
          { key: "support_phone", value: data.support_phone },
          { key: "support_email", value: data.support_email },
        ],
      });
      toast.success("General settings saved");
    } catch {
      toast.error("Failed to save settings");
    }
  };

  if (!settings) return <Skeleton className="h-64" />;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="brand_name">Brand Name</Label>
        <Input id="brand_name" {...register("brand_name")} placeholder="EMMATECH" />
        {errors.brand_name && <p className="text-destructive text-xs">{errors.brand_name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="support_phone">Support Phone</Label>
        <Input id="support_phone" {...register("support_phone")} placeholder="+254 700 000000" />
        {errors.support_phone && <p className="text-destructive text-xs">{errors.support_phone.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="support_email">Support Email</Label>
        <Input id="support_email" type="email" {...register("support_email")} placeholder="support@emmatech.co.ke" />
        {errors.support_email && <p className="text-destructive text-xs">{errors.support_email.message}</p>}
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save General Settings"}
      </Button>
    </form>
  );
}

const MPESA_SECRETS = [
  {
    key: "MPESA_CONSUMER_KEY",
    label: "Consumer Key",
    description: "From Safaricom Daraja API portal",
  },
  {
    key: "MPESA_CONSUMER_SECRET",
    label: "Consumer Secret",
    description: "From Safaricom Daraja API portal",
  },
  {
    key: "MPESA_SHORTCODE",
    label: "Shortcode",
    description: "Your M-PESA business shortcode (paybill or till)",
  },
  {
    key: "MPESA_PASSKEY",
    label: "Passkey",
    description: "STK Push passkey from Daraja portal",
  },
];

function MpesaTab() {
  return (
    <div className="space-y-5">
      <div className="rounded-lg bg-muted/50 border border-border p-4 text-sm text-muted-foreground space-y-2">
        <p className="font-medium text-foreground">How to configure M-PESA secrets</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>In the Hercules App Builder sidebar, scroll down and click <strong>Advanced</strong>.</li>
          <li>Click the <strong>Secrets</strong> tab.</li>
          <li>Add each secret below as a Key/Value pair.</li>
          <li>Redeploy the app after saving secrets.</li>
        </ol>
      </div>

      <div className="space-y-3">
        {MPESA_SECRETS.map((s) => (
          <Card key={s.key}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                <Key size={16} className="text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-mono text-sm font-semibold text-foreground">{s.key}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        These secrets are stored securely in Hercules Cloud and accessed via <code className="font-mono">process.env</code> in backend functions. They are never exposed to the frontend.
      </p>
    </div>
  );
}

const appearanceSchema = z.object({
  primary_color: z.string().min(1),
  accent_color: z.string().min(1),
});
type AppearanceFormData = z.infer<typeof appearanceSchema>;

function AppearanceTab({ settings }: { settings: Record<string, string> | undefined }) {
  const setMany = useMutation(api.settings.setMany);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AppearanceFormData>({
    resolver: zodResolver(appearanceSchema),
    defaultValues: { primary_color: "#1e3a5f", accent_color: "#f97316" },
  });

  useEffect(() => {
    if (settings) {
      reset({
        primary_color: settings["primary_color"] ?? "#1e3a5f",
        accent_color: settings["accent_color"] ?? "#f97316",
      });
    }
  }, [settings, reset]);

  const onSubmit = async (data: AppearanceFormData) => {
    try {
      await setMany({
        settings: [
          { key: "primary_color", value: data.primary_color },
          { key: "accent_color", value: data.accent_color },
        ],
      });
      toast.success("Appearance settings saved");
    } catch {
      toast.error("Failed to save settings");
    }
  };

  if (!settings) return <Skeleton className="h-40" />;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="rounded-lg bg-muted/50 border border-border p-4 text-sm text-muted-foreground">
        <p>These color values are stored for reference. To apply them to the live UI, update <code className="font-mono">src/index.css</code> CSS variables through the code editor.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <Label htmlFor="primary_color">Primary Color</Label>
          <div className="flex gap-2">
            <Input id="primary_color" {...register("primary_color")} placeholder="#1e3a5f" />
            {errors.primary_color && <p className="text-destructive text-xs">{errors.primary_color.message}</p>}
          </div>
          <p className="text-xs text-muted-foreground">Main navy brand color</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="accent_color">Accent Color</Label>
          <div className="flex gap-2">
            <Input id="accent_color" {...register("accent_color")} placeholder="#f97316" />
            {errors.accent_color && <p className="text-destructive text-xs">{errors.accent_color.message}</p>}
          </div>
          <p className="text-xs text-muted-foreground">Orange accent for CTAs</p>
        </div>
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save Appearance Settings"}
      </Button>
    </form>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const settings = useQuery(api.settings.getAll, {});

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm">Configure your WiFi billing platform</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{TABS.find((t) => t.id === activeTab)?.label} Settings</CardTitle>
          <CardDescription>
            {activeTab === "general" && "Basic brand and contact information"}
            {activeTab === "mpesa" && "M-PESA Daraja API credentials (stored as Secrets)"}
            {activeTab === "appearance" && "Brand colors and visual customization"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeTab === "general" && <GeneralTab settings={settings} />}
          {activeTab === "mpesa" && <MpesaTab />}
          {activeTab === "appearance" && <AppearanceTab settings={settings} />}
        </CardContent>
      </Card>
    </div>
  );
}
