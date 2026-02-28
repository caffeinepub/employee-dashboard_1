import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Building2, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Status } from "../backend";
import type { Employee } from "../backend.d.ts";
import {
  useDeleteEmployee,
  useUpdateEmployeeStatus,
} from "../hooks/useQueries";

interface EmployeeCardProps {
  employee: Employee;
  onClick: () => void;
}

export function getStatusLabel(status: Status): string {
  switch (status) {
    case Status.active:
      return "Active";
    case Status.inactive:
      return "Inactive";
    case Status.onHold:
      return "On Hold";
    default:
      return "Unknown";
  }
}

export function getStatusClassName(status: Status): string {
  switch (status) {
    case Status.active:
      return "status-active";
    case Status.inactive:
      return "status-inactive";
    case Status.onHold:
      return "status-onhold";
    default:
      return "status-inactive";
  }
}

export function getStatusDotColor(status: Status): string {
  switch (status) {
    case Status.active:
      return "bg-[oklch(0.72_0.18_145)]";
    case Status.inactive:
      return "bg-muted-foreground/40";
    case Status.onHold:
      return "bg-[oklch(0.82_0.16_75)]";
    default:
      return "bg-muted-foreground/40";
  }
}

export function EmployeeCard({ employee, onClick }: EmployeeCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  const updateStatus = useUpdateEmployeeStatus();
  const deleteEmployee = useDeleteEmployee();

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const handleStatusChange = (value: string) => {
    const newStatus = value as Status;
    updateStatus.mutate(
      { id: employee.id, status: newStatus },
      {
        onSuccess: () => {
          toast.success(
            `${employee.name} marked as ${getStatusLabel(newStatus)}`,
          );
        },
        onError: () => {
          toast.error("Failed to update status");
        },
      },
    );
  };

  const handleDelete = () => {
    deleteEmployee.mutate(employee.id, {
      onSuccess: () => {
        toast.success(`${employee.name} has been removed`);
        setDeleteOpen(false);
      },
      onError: () => {
        toast.error("Failed to delete employee");
        setDeleteOpen(false);
      },
    });
  };

  const stopProp = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className={cn(
        "w-full text-left rounded-lg p-4 border transition-all duration-200 group relative",
        "bg-accent/30 border-border/40 hover:bg-accent/60 hover:border-primary/30 hover:teal-glow",
      )}
    >
      {/* Clickable area for navigation */}
      <button
        type="button"
        onClick={onClick}
        className="absolute inset-0 z-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`View details for ${employee.name}`}
      />

      <div className="relative z-10">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="font-display font-bold text-sm bg-primary/15 text-primary border border-primary/20">
                {getInitials(employee.name)}
              </AvatarFallback>
            </Avatar>
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-accent",
                getStatusDotColor(employee.status),
              )}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-display font-bold text-sm text-foreground truncate">
                {employee.name}
              </p>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {employee.role}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Building2 className="w-3 h-3 text-muted-foreground/60 shrink-0" />
              <span className="text-[10px] text-muted-foreground/70 truncate">
                {employee.department}
              </span>
            </div>
          </div>
        </div>

        {/* Status + Actions row */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
          {/* Status badge */}
          <span
            className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0",
              getStatusClassName(employee.status),
            )}
          >
            {getStatusLabel(employee.status)}
          </span>

          {/* Status selector — stops click from bubbling to the nav button */}
          <div className="flex-1">
            <Select
              value={employee.status}
              onValueChange={handleStatusChange}
              disabled={updateStatus.isPending}
            >
              <SelectTrigger
                className="h-6 text-[10px] border-border/40 bg-background/30 px-2 py-0 gap-1 [&>svg]:w-3 [&>svg]:h-3"
                onClick={stopProp}
                onKeyDown={stopProp}
              >
                {updateStatus.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <SelectValue placeholder="Status" />
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={Status.active} className="text-xs">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[oklch(0.72_0.18_145)] inline-block" />
                    Active
                  </span>
                </SelectItem>
                <SelectItem value={Status.inactive} className="text-xs">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/40 inline-block" />
                    Inactive
                  </span>
                </SelectItem>
                <SelectItem value={Status.onHold} className="text-xs">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[oklch(0.82_0.16_75)] inline-block" />
                    On Hold
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Delete button */}
          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                aria-label={`Delete ${employee.name}`}
                onClick={stopProp}
                onKeyDown={stopProp}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {employee.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove {employee.name} and all their
                  associated data. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={deleteEmployee.isPending}
                >
                  {deleteEmployee.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting…
                    </>
                  ) : (
                    "Delete"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
