import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Check, Lightbulb, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { IssueSuggestion } from "../backend.d.ts";
import {
  useAddIssueSuggestion,
  useAllIssues,
  useDeleteIssueSuggestion,
  useUpdateIssueSuggestion,
} from "../hooks/useQueries";

function formatDate(ts: bigint) {
  try {
    const ms = Number(ts) / 1_000_000;
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

interface SuggestionFormData {
  title: string;
  description: string;
}

const emptyForm: SuggestionFormData = { title: "", description: "" };

interface SuggestionsDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function SuggestionsDialog({
  open,
  onOpenChange,
}: SuggestionsDialogProps) {
  const { data: allIssues = [], isLoading } = useAllIssues();
  const addIssue = useAddIssueSuggestion();
  const updateIssue = useUpdateIssueSuggestion();
  const deleteIssue = useDeleteIssueSuggestion();

  // Filter to suggestions only
  const suggestions = allIssues.filter((i) => i.category === "Suggestion");

  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<SuggestionFormData>(emptyForm);
  const [editingId, setEditingId] = useState<bigint | null>(null);
  const [editForm, setEditForm] = useState<SuggestionFormData>(emptyForm);
  const [deleteId, setDeleteId] = useState<bigint | null>(null);

  const handleAdd = () => {
    if (!addForm.title.trim()) {
      toast.error("Title is required");
      return;
    }
    addIssue.mutate(
      {
        title: addForm.title.trim(),
        description: addForm.description.trim(),
        category: "Suggestion",
      },
      {
        onSuccess: () => {
          toast.success("Suggestion added");
          setAddForm(emptyForm);
          setShowAddForm(false);
        },
        onError: () => toast.error("Failed to add suggestion"),
      },
    );
  };

  const handleEditSave = (id: bigint) => {
    if (!editForm.title.trim()) {
      toast.error("Title is required");
      return;
    }
    updateIssue.mutate(
      {
        id,
        input: {
          title: editForm.title.trim(),
          description: editForm.description.trim(),
          category: "Suggestion",
        },
      },
      {
        onSuccess: () => {
          toast.success("Suggestion updated");
          setEditingId(null);
        },
        onError: () => toast.error("Failed to update suggestion"),
      },
    );
  };

  const handleDelete = (id: bigint) => {
    deleteIssue.mutate(id, {
      onSuccess: () => {
        toast.success("Suggestion deleted");
        setDeleteId(null);
      },
      onError: () => toast.error("Failed to delete suggestion"),
    });
  };

  const startEdit = (suggestion: IssueSuggestion) => {
    setEditingId(suggestion.id);
    setEditForm({
      title: suggestion.title,
      description: suggestion.description,
    });
  };

  const SKELETON_KEYS = ["sk-a", "sk-b", "sk-c"];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-lg w-full p-0 overflow-hidden"
          data-ocid="suggestions_dialog.dialog"
        >
          <DialogHeader className="px-5 pt-5 pb-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[oklch(0.95_0.05_85_/_0.6)] border border-[oklch(0.65_0.12_85_/_0.3)] flex items-center justify-center shrink-0">
                <Lightbulb className="w-4.5 h-4.5 text-[oklch(0.40_0.14_85)]" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-base font-display font-bold text-foreground">
                  Suggestions
                </DialogTitle>
                <DialogDescription className="text-[11px] text-muted-foreground mt-0.5">
                  Ideas and suggestions from the organization
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono-data text-[oklch(0.40_0.14_85)] bg-[oklch(0.95_0.05_85_/_0.4)] px-2 py-0.5 rounded-full border border-[oklch(0.65_0.12_85_/_0.2)]">
                  {suggestions.length}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs h-7 px-2.5 border-[oklch(0.65_0.12_85_/_0.3)] text-[oklch(0.40_0.14_85)] hover:bg-[oklch(0.95_0.05_85_/_0.2)]"
                  onClick={() => setShowAddForm((v) => !v)}
                  data-ocid="suggestions_dialog.open_modal_button"
                >
                  {showAddForm ? (
                    <X className="w-3 h-3" />
                  ) : (
                    <Plus className="w-3 h-3" />
                  )}
                  {showAddForm ? "Cancel" : "Add Suggestion"}
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Add Form */}
          {showAddForm && (
            <div className="px-5 py-4 border-b border-border/30 bg-[oklch(0.97_0.02_85_/_0.3)] space-y-3">
              <p className="text-xs font-semibold text-foreground/80">
                New Suggestion
              </p>
              <div className="space-y-2">
                <div>
                  <Label className="text-[10px] font-semibold text-foreground/70 uppercase tracking-wider">
                    Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="Brief summary of the suggestion..."
                    value={addForm.title}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, title: e.target.value }))
                    }
                    className="text-xs h-8 mt-1"
                    data-ocid="suggestions_dialog.input"
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-semibold text-foreground/70 uppercase tracking-wider">
                    Description
                  </Label>
                  <Textarea
                    placeholder="Describe your suggestion in detail..."
                    value={addForm.description}
                    onChange={(e) =>
                      setAddForm((f) => ({
                        ...f,
                        description: e.target.value,
                      }))
                    }
                    className="text-xs resize-none min-h-[64px] mt-1"
                    data-ocid="suggestions_dialog.textarea"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => {
                    setShowAddForm(false);
                    setAddForm(emptyForm);
                  }}
                  data-ocid="suggestions_dialog.cancel_button"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="text-xs h-7 gap-1.5 bg-[oklch(0.40_0.14_85)] hover:bg-[oklch(0.36_0.14_85)] text-white"
                  onClick={handleAdd}
                  disabled={addIssue.isPending}
                  data-ocid="suggestions_dialog.submit_button"
                >
                  <Check className="w-3 h-3" />
                  Save Suggestion
                </Button>
              </div>
            </div>
          )}

          {/* Suggestions List */}
          <ScrollArea className="max-h-[400px]">
            <div className="divide-y divide-border/30">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {SKELETON_KEYS.map((k) => (
                    <Skeleton key={k} className="h-16 rounded-lg bg-muted/50" />
                  ))}
                </div>
              ) : suggestions.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-12 text-muted-foreground/50"
                  data-ocid="suggestions_dialog.empty_state"
                >
                  <Lightbulb className="w-8 h-8 mb-3 opacity-30" />
                  <p className="text-sm font-semibold">No suggestions yet</p>
                  <p className="text-xs mt-0.5">
                    Click "Add Suggestion" to submit one
                  </p>
                </div>
              ) : (
                suggestions.map((suggestion, i) => (
                  <div
                    key={suggestion.id.toString()}
                    className="px-4 py-3 hover:bg-accent/20 transition-colors"
                    data-ocid={`suggestions_dialog.item.${i + 1}`}
                  >
                    {editingId === suggestion.id ? (
                      /* Inline Edit Form */
                      <div className="space-y-2">
                        <Input
                          value={editForm.title}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              title: e.target.value,
                            }))
                          }
                          className="text-xs h-7"
                          placeholder="Title..."
                        />
                        <Textarea
                          value={editForm.description}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              description: e.target.value,
                            }))
                          }
                          className="text-xs resize-none min-h-[48px]"
                          placeholder="Description..."
                        />
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] px-2"
                            onClick={() => setEditingId(null)}
                            data-ocid="suggestions_dialog.cancel_button"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            className="h-6 text-[10px] px-2 gap-1"
                            onClick={() => handleEditSave(suggestion.id)}
                            disabled={updateIssue.isPending}
                            data-ocid="suggestions_dialog.save_button"
                          >
                            <Check className="w-2.5 h-2.5" />
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* Suggestion Card */
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Lightbulb className="w-3 h-3 text-[oklch(0.55_0.14_85)] shrink-0" />
                            <p className="text-xs font-semibold text-foreground leading-tight truncate">
                              {suggestion.title}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => startEdit(suggestion)}
                              className="p-1 rounded hover:bg-accent text-muted-foreground/50 hover:text-foreground transition-colors"
                              aria-label="Edit suggestion"
                              data-ocid="suggestions_dialog.edit_button"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteId(suggestion.id)}
                              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground/50 hover:text-destructive transition-colors"
                              aria-label="Delete suggestion"
                              data-ocid="suggestions_dialog.delete_button"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        {suggestion.description && (
                          <p className="text-[11px] text-muted-foreground/80 leading-relaxed mb-1.5 line-clamp-2">
                            {suggestion.description}
                          </p>
                        )}
                        <p className="text-[9px] text-muted-foreground/50">
                          {formatDate(suggestion.createdAt)}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent data-ocid="suggestions_dialog.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this suggestion?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setDeleteId(null)}
              data-ocid="suggestions_dialog.cancel_button"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId !== null && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteIssue.isPending}
              data-ocid="suggestions_dialog.confirm_button"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
