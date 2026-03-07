import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Loader2, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Status } from "../backend";
import { useAddEmployee } from "../hooks/useQueries";

interface AddEmployeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TagInputProps {
  label: string;
  placeholder: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  className?: string;
}

function TagInput({
  label,
  placeholder,
  tags,
  onChange,
  className,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  const addTag = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const handleBlur = () => {
    if (inputValue.trim()) addTag(inputValue);
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-semibold text-foreground/80">
        {label}
      </Label>
      <div className="min-h-10 rounded-md border border-input bg-background px-3 py-2 flex flex-wrap gap-1.5 focus-within:ring-1 focus-within:ring-ring">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25 font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:text-primary/60 transition-colors"
              aria-label={`Remove ${tag}`}
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={tags.length === 0 ? placeholder : "Add more..."}
          className="flex-1 min-w-20 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50 text-foreground"
        />
      </div>
      <p className="text-[10px] text-muted-foreground/50">
        Press Enter or comma to add
      </p>
    </div>
  );
}

const FSE_CATEGORIES = [
  { value: "Cash Cow", desc: "Experienced, stable, high-trust" },
  { value: "Star", desc: "High-growth, high-energy top performers" },
  { value: "Question Mark", desc: "Inconsistent but high-potential" },
  { value: "Dog", desc: "Underperforming and at-risk" },
];

const FSE_CATEGORY_BADGE_STYLES: Record<string, string> = {
  "Cash Cow":
    "bg-[oklch(0.93_0.05_165_/_0.5)] text-[oklch(0.35_0.15_165)] border-[oklch(0.65_0.12_165_/_0.4)]",
  Star: "bg-[oklch(0.95_0.05_85_/_0.5)] text-[oklch(0.40_0.14_85)] border-[oklch(0.65_0.12_85_/_0.4)]",
  "Question Mark":
    "bg-[oklch(0.93_0.04_240_/_0.5)] text-[oklch(0.38_0.14_240)] border-[oklch(0.65_0.12_240_/_0.4)]",
  Dog: "bg-[oklch(0.95_0.04_25_/_0.5)] text-[oklch(0.42_0.18_25)] border-[oklch(0.65_0.14_25_/_0.4)]",
};

interface FormData {
  fiplCode: string;
  fseCategory: string;
  name: string;
  role: string;
  department: string;
  status: Status;
  joinDate: string;
  avatar: string;
  region: string;
  familyDetails: string;
  pastExperience: string[];
  salesInfluenceIndex: string;
  reviewCount: string;
  operationalDiscipline: string;
  productKnowledgeScore: string;
  softSkillsScore: string;
  cesScore: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  traits: string[];
  problems: string[];
}

const defaultFormData: FormData = {
  fiplCode: "",
  fseCategory: "",
  name: "",
  role: "",
  department: "",
  status: Status.active,
  joinDate: new Date().toISOString().split("T")[0],
  avatar: "",
  region: "",
  familyDetails: "",
  pastExperience: [],
  salesInfluenceIndex: "50",
  reviewCount: "0",
  operationalDiscipline: "50",
  productKnowledgeScore: "50",
  softSkillsScore: "50",
  cesScore: "0",
  strengths: [],
  weaknesses: [],
  opportunities: [],
  threats: [],
  traits: [],
  problems: [],
};

type SectionKey = "basic" | "performance" | "swot" | "traits";

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: "basic", label: "Basic Info" },
  { key: "performance", label: "Performance" },
  { key: "swot", label: "SWOT" },
  { key: "traits", label: "Traits & Problems" },
];

const PERF_BARS = [
  {
    key: "salesInfluenceIndex" as const,
    label: "Sales Influence Index",
    color: "bg-primary",
    maxVal: 9999,
    isCount: false,
  },
  {
    key: "reviewCount" as const,
    label: "Review Count",
    color: "bg-[oklch(0.48_0.16_75)]",
    maxVal: 999,
    isCount: true,
  },
  {
    key: "operationalDiscipline" as const,
    label: "Operational Discipline",
    color: "bg-[oklch(0.48_0.16_220)]",
    maxVal: 100,
    isCount: false,
  },
  {
    key: "productKnowledgeScore" as const,
    label: "Product Knowledge",
    color: "bg-[oklch(0.48_0.16_290)]",
    maxVal: 100,
    isCount: false,
  },
  {
    key: "softSkillsScore" as const,
    label: "Soft Skills",
    color: "bg-[oklch(0.48_0.16_175)]",
    maxVal: 100,
    isCount: false,
  },
];

export function AddEmployeeModal({
  open,
  onOpenChange,
}: AddEmployeeModalProps) {
  const [form, setForm] = useState<FormData>(defaultFormData);
  const [activeSection, setActiveSection] = useState<SectionKey>("basic");
  const addEmployee = useAddEmployee();

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const selectedCategoryDesc = FSE_CATEGORIES.find(
    (c) => c.value === form.fseCategory,
  )?.desc;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.fiplCode.trim()) {
      toast.error("FIPL Code is required");
      setActiveSection("basic");
      return;
    }
    if (!form.name.trim() || !form.role.trim() || !form.department.trim()) {
      toast.error("Name, Role, and Department are required");
      setActiveSection("basic");
      return;
    }

    const joinDateMs = form.joinDate
      ? new Date(form.joinDate).getTime()
      : Date.now();
    const joinDateNs = BigInt(joinDateMs) * 1_000_000n;

    const avatarValue = form.avatar.trim() || getInitials(form.name);

    const input = {
      employeeInfo: {
        fiplCode: form.fiplCode.trim(),
        fseCategory: form.fseCategory,
        name: form.name.trim(),
        role: form.role.trim(),
        department: form.department.trim(),
        status: form.status,
        joinDate: joinDateNs,
        avatar: avatarValue,
        region: form.region.trim(),
        familyDetails: form.familyDetails.trim(),
        pastExperience: form.pastExperience,
      },
      performance: {
        salesInfluenceIndex: BigInt(Number(form.salesInfluenceIndex) || 0),
        reviewCount: BigInt(Number(form.reviewCount) || 0),
        operationalDiscipline: BigInt(Number(form.operationalDiscipline) || 0),
        productKnowledgeScore: BigInt(Number(form.productKnowledgeScore) || 0),
        softSkillsScore: BigInt(Number(form.softSkillsScore) || 0),
      },
      swotAnalysis: {
        strengths: form.strengths,
        weaknesses: form.weaknesses,
        opportunities: form.opportunities,
        threats: form.threats,
        cesScore: BigInt(Number(form.cesScore) || 0),
      },
      traits: form.traits,
      problems: form.problems,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    addEmployee.mutate(input as any, {
      onSuccess: () => {
        toast.success(`${form.name} has been added successfully`);
        setForm(defaultFormData);
        setActiveSection("basic");
        onOpenChange(false);
      },
      onError: (err) => {
        toast.error(`Failed to add employee: ${err.message}`);
      },
    });
  };

  const handleClose = () => {
    if (!addEmployee.isPending) {
      setForm(defaultFormData);
      setActiveSection("basic");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col gap-0 p-0"
        data-ocid="add_employee.dialog"
      >
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="font-display text-lg font-bold">
            Add New Employee
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Fill in the employee details across all sections. FIPL Code is
            required.
          </DialogDescription>
        </DialogHeader>

        {/* Section Tabs */}
        <div className="px-6 flex gap-1 shrink-0">
          {SECTIONS.map((section) => (
            <button
              key={section.key}
              type="button"
              onClick={() => setActiveSection(section.key)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                activeSection === section.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent",
              )}
              data-ocid={"add_employee.tab"}
            >
              {section.label}
            </button>
          ))}
        </div>

        <Separator className="mt-3" />

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* Basic Info Section */}
            {activeSection === "basic" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* FIPL Code - PRIMARY KEY */}
                  <div className="col-span-2 space-y-1.5">
                    <Label
                      htmlFor="emp-fipl"
                      className="text-xs font-semibold text-foreground/80"
                    >
                      FIPL Code <span className="text-destructive">*</span>
                      <span className="ml-1.5 text-[10px] font-normal text-primary/60 bg-primary/8 px-1.5 py-0.5 rounded-full border border-primary/15">
                        Primary Key
                      </span>
                    </Label>
                    <Input
                      id="emp-fipl"
                      placeholder="e.g. FIPL-001"
                      value={form.fiplCode}
                      onChange={(e) => set("fiplCode", e.target.value)}
                      className="text-sm font-mono-data"
                      required
                      data-ocid="add_employee.input"
                    />
                    <p className="text-[10px] text-muted-foreground/50">
                      Unique employee code — cannot be duplicated
                    </p>
                  </div>

                  {/* FSE Category */}
                  <div className="col-span-2 space-y-1.5">
                    <Label
                      htmlFor="emp-category"
                      className="text-xs font-semibold text-foreground/80"
                    >
                      FSE Category
                    </Label>
                    <Select
                      value={form.fseCategory}
                      onValueChange={(val) => set("fseCategory", val)}
                    >
                      <SelectTrigger
                        id="emp-category"
                        className="text-sm"
                        data-ocid="add_employee.select"
                      >
                        <SelectValue placeholder="Select category..." />
                      </SelectTrigger>
                      <SelectContent>
                        {FSE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            <span className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "text-[10px] font-semibold px-1.5 py-0.5 rounded-full border",
                                  FSE_CATEGORY_BADGE_STYLES[cat.value],
                                )}
                              >
                                {cat.value}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {cat.desc}
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.fseCategory && selectedCategoryDesc && (
                      <p
                        className={cn(
                          "text-[10px] font-semibold px-2.5 py-1 rounded-lg border w-fit",
                          FSE_CATEGORY_BADGE_STYLES[form.fseCategory],
                        )}
                      >
                        {form.fseCategory}: {selectedCategoryDesc}
                      </p>
                    )}
                  </div>

                  <div className="col-span-2 space-y-1.5">
                    <Label
                      htmlFor="emp-name"
                      className="text-xs font-semibold text-foreground/80"
                    >
                      Full Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="emp-name"
                      placeholder="e.g. Priya Sharma"
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      className="text-sm"
                      required
                      data-ocid="add_employee.input"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="emp-role"
                      className="text-xs font-semibold text-foreground/80"
                    >
                      Role <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="emp-role"
                      placeholder="e.g. Senior Engineer"
                      value={form.role}
                      onChange={(e) => set("role", e.target.value)}
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="emp-dept"
                      className="text-xs font-semibold text-foreground/80"
                    >
                      Department <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="emp-dept"
                      placeholder="e.g. Engineering"
                      value={form.department}
                      onChange={(e) => set("department", e.target.value)}
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="emp-status"
                      className="text-xs font-semibold text-foreground/80"
                    >
                      Status
                    </Label>
                    <Select
                      value={form.status}
                      onValueChange={(val) => set("status", val as Status)}
                    >
                      <SelectTrigger id="emp-status" className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={Status.active}>Active</SelectItem>
                        <SelectItem value={Status.inactive}>
                          Inactive
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="emp-join"
                      className="text-xs font-semibold text-foreground/80"
                    >
                      Join Date
                    </Label>
                    <Input
                      id="emp-join"
                      type="date"
                      value={form.joinDate}
                      onChange={(e) => set("joinDate", e.target.value)}
                      className="text-sm"
                    />
                  </div>

                  <div className="col-span-2 space-y-1.5">
                    <Label
                      htmlFor="emp-avatar"
                      className="text-xs font-semibold text-foreground/80"
                    >
                      Avatar Initials{" "}
                      <span className="text-muted-foreground font-normal">
                        (optional — auto-generated from name)
                      </span>
                    </Label>
                    <Input
                      id="emp-avatar"
                      placeholder={
                        form.name
                          ? getInitials(form.name) || "e.g. PS"
                          : "e.g. PS"
                      }
                      value={form.avatar}
                      onChange={(e) => set("avatar", e.target.value)}
                      maxLength={3}
                      className="text-sm"
                    />
                  </div>

                  <div className="col-span-2 space-y-1.5">
                    <Label
                      htmlFor="emp-region"
                      className="text-xs font-semibold text-foreground/80"
                    >
                      Region
                    </Label>
                    <Input
                      id="emp-region"
                      placeholder="e.g. North India, South-East Asia"
                      value={form.region}
                      onChange={(e) => set("region", e.target.value)}
                      className="text-sm"
                    />
                  </div>

                  <div className="col-span-2 space-y-1.5">
                    <Label
                      htmlFor="emp-family"
                      className="text-xs font-semibold text-foreground/80"
                    >
                      Family Details
                    </Label>
                    <Textarea
                      id="emp-family"
                      placeholder="e.g. Married, 2 children"
                      value={form.familyDetails}
                      onChange={(e) => set("familyDetails", e.target.value)}
                      className="text-sm resize-none min-h-[72px]"
                    />
                  </div>

                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground/80">
                      Past Work Experience
                    </Label>
                    <Textarea
                      placeholder="e.g. Infosys - Software Engineer - 3 years"
                      value={form.pastExperience.join("\n")}
                      onChange={(e) => {
                        const lines = e.target.value
                          .split("\n")
                          .map((l) => l.trim())
                          .filter(Boolean);
                        set("pastExperience", lines);
                      }}
                      className="text-sm min-h-[100px] resize-none"
                    />
                    <p className="text-[10px] text-muted-foreground/50">
                      One entry per line (Company - Role - Duration)
                    </p>
                    {form.pastExperience.length > 0 && (
                      <div className="flex flex-col gap-1 pt-1">
                        {form.pastExperience.map((exp, i) => (
                          <div
                            key={`exp-${i}-${exp.slice(0, 10)}`}
                            className="flex items-start gap-2 text-xs text-foreground/70"
                          >
                            <span className="font-mono-data text-[10px] text-primary/60 shrink-0 mt-0.5">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <span>{exp}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Performance Section */}
            {activeSection === "performance" && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1.5">
                    <Label
                      htmlFor="emp-sales-influence"
                      className="text-xs font-semibold text-foreground/80"
                    >
                      Sales Influence Index
                    </Label>
                    <Input
                      id="emp-sales-influence"
                      type="number"
                      min={0}
                      value={form.salesInfluenceIndex}
                      onChange={(e) =>
                        set("salesInfluenceIndex", e.target.value)
                      }
                      className="text-sm"
                      data-ocid="add_employee.input"
                    />
                    <p className="text-[10px] text-muted-foreground/50">
                      Sales performance of the employee
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="emp-review-count"
                      className="text-xs font-semibold text-foreground/80"
                    >
                      Review Count
                    </Label>
                    <Input
                      id="emp-review-count"
                      type="number"
                      min={0}
                      value={form.reviewCount}
                      onChange={(e) => set("reviewCount", e.target.value)}
                      className="text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground/50">
                      Customer feedbacks received
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="emp-ops-disc"
                      className="text-xs font-semibold text-foreground/80"
                    >
                      Operational Discipline (0–100)
                    </Label>
                    <Input
                      id="emp-ops-disc"
                      type="number"
                      min={0}
                      max={100}
                      value={form.operationalDiscipline}
                      onChange={(e) =>
                        set("operationalDiscipline", e.target.value)
                      }
                      className="text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground/50">
                      Lapses and compliance score
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="emp-product-knowledge"
                      className="text-xs font-semibold text-foreground/80"
                    >
                      Product Knowledge (0–100)
                    </Label>
                    <Input
                      id="emp-product-knowledge"
                      type="number"
                      min={0}
                      max={100}
                      value={form.productKnowledgeScore}
                      onChange={(e) =>
                        set("productKnowledgeScore", e.target.value)
                      }
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="emp-soft-skills"
                      className="text-xs font-semibold text-foreground/80"
                    >
                      Soft Skills (0–100)
                    </Label>
                    <Input
                      id="emp-soft-skills"
                      type="number"
                      min={0}
                      max={100}
                      value={form.softSkillsScore}
                      onChange={(e) => set("softSkillsScore", e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>

                {/* Live preview bars */}
                <div className="space-y-3 pt-2 border-t border-border/30">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold pt-1">
                    Performance Preview
                  </p>
                  {PERF_BARS.map((bar) => {
                    const rawVal = Number(form[bar.key]) || 0;
                    const pct = bar.isCount
                      ? Math.min(100, (rawVal / bar.maxVal) * 100)
                      : Math.min(100, rawVal);
                    return (
                      <div key={bar.key} className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{bar.label}</span>
                          <span className="font-mono-data">
                            {rawVal}
                            {!bar.isCount && "/100"}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-300",
                              bar.color,
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SWOT Section */}
            {activeSection === "swot" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label
                    htmlFor="emp-ces-score"
                    className="text-xs font-semibold text-foreground/80"
                  >
                    CES Score (0–100)
                  </Label>
                  <Input
                    id="emp-ces-score"
                    type="number"
                    min={0}
                    max={100}
                    value={form.cesScore}
                    onChange={(e) => set("cesScore", e.target.value)}
                    className="text-sm"
                    placeholder="e.g. 72"
                  />
                  <p className="text-[10px] text-muted-foreground/50">
                    Customer Effort Score stored in SWOT (0–100)
                  </p>
                </div>
                <TagInput
                  label="Strengths"
                  placeholder="e.g. Leadership, Communication..."
                  tags={form.strengths}
                  onChange={(v) => set("strengths", v)}
                />
                <TagInput
                  label="Weaknesses"
                  placeholder="e.g. Time management..."
                  tags={form.weaknesses}
                  onChange={(v) => set("weaknesses", v)}
                />
                <TagInput
                  label="Opportunities"
                  placeholder="e.g. Mentorship program..."
                  tags={form.opportunities}
                  onChange={(v) => set("opportunities", v)}
                />
                <TagInput
                  label="Threats"
                  placeholder="e.g. Market volatility..."
                  tags={form.threats}
                  onChange={(v) => set("threats", v)}
                />
              </div>
            )}

            {/* Traits & Problems Section */}
            {activeSection === "traits" && (
              <div className="space-y-5">
                <TagInput
                  label="Behavioral Traits"
                  placeholder="e.g. Empathetic, Decisive, Detail-oriented..."
                  tags={form.traits}
                  onChange={(v) => set("traits", v)}
                />
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground/80">
                    Problems Faced
                  </Label>
                  <Textarea
                    placeholder="Enter each problem on a new line, or separate with commas..."
                    value={form.problems.join("\n")}
                    onChange={(e) => {
                      const lines = e.target.value
                        .split("\n")
                        .map((l) => l.trim())
                        .filter(Boolean);
                      set("problems", lines);
                    }}
                    className="text-sm min-h-[120px] resize-none"
                  />
                  <p className="text-[10px] text-muted-foreground/50">
                    One problem per line
                  </p>
                  {form.problems.length > 0 && (
                    <div className="flex flex-col gap-1 pt-1">
                      {form.problems.map((p, i) => (
                        <div
                          key={`problem-${i}-${p.slice(0, 10)}`}
                          className="flex items-start gap-2 text-xs text-foreground/70"
                        >
                          <span className="font-mono-data text-[10px] text-primary/60 shrink-0 mt-0.5">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span>{p}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <Separator />
          <DialogFooter className="px-6 py-4 shrink-0 flex items-center justify-between sm:justify-between">
            <div className="flex gap-2">
              {SECTIONS.map((s, i) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setActiveSection(s.key)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    activeSection === s.key
                      ? "bg-primary w-4"
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50",
                  )}
                  aria-label={`Go to ${s.label}`}
                  title={s.label}
                  tabIndex={-1}
                  data-index={i}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={addEmployee.isPending}
                data-ocid="add_employee.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={addEmployee.isPending}
                className="gap-2"
                data-ocid="add_employee.submit_button"
              >
                {addEmployee.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    Add Employee
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
