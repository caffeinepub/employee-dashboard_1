import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Status } from "../backend";
import type {
  AttendanceRecord,
  AttendanceRecordInput,
  Employee,
  EmployeeDetails,
  EmployeeFullInput,
  EmployeeInput,
  Feedback,
  FeedbackInput,
  IssueSuggestion,
  IssueSuggestionInput,
  SalesRecord,
  TopPerformer,
  TopPerformerInput,
} from "../backend.d.ts";
import { useActor } from "./useActor";

export function useInitialize() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      await actor.initialize();
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}

export function useActiveEmployeeCount() {
  const { actor, isFetching } = useActor();
  return useQuery<bigint>({
    queryKey: ["activeEmployeeCount"],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return actor.getActiveEmployeeCount();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAllEmployees() {
  const { actor, isFetching } = useActor();
  return useQuery<Employee[]>({
    queryKey: ["allEmployees"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllEmployees();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAllFeedback() {
  const { actor, isFetching } = useActor();
  return useQuery<Feedback[]>({
    queryKey: ["allFeedback"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllFeedback();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useEmployeeDetails(id: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<EmployeeDetails>({
    queryKey: ["employeeDetails", id?.toString()],
    queryFn: async () => {
      if (!actor || id === null) throw new Error("No actor or ID");
      return actor.getEmployeeDetails(id);
    },
    enabled: !!actor && !isFetching && id !== null,
  });
}

export function useFeedbackByEmployee(employeeId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Feedback[]>({
    queryKey: ["feedbackByEmployee", employeeId?.toString()],
    queryFn: async () => {
      if (!actor || employeeId === null) return [];
      return actor.getFeedbackByEmployee(employeeId);
    },
    enabled: !!actor && !isFetching && employeeId !== null,
  });
}

export function useAddEmployee() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: EmployeeFullInput) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addEmployee(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allEmployees"] });
      queryClient.invalidateQueries({ queryKey: ["activeEmployeeCount"] });
    },
  });
}

export function useAddFeedback() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: FeedbackInput) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addFeedback(input);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["feedbackByEmployee", variables.employeeId.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["allFeedback"] });
    },
  });
}

export function useBulkAddEmployees() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inputs: EmployeeInput[]) => {
      if (!actor) throw new Error("Actor not available");
      return actor.bulkAddEmployees(inputs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allEmployees"] });
      queryClient.invalidateQueries({ queryKey: ["activeEmployeeCount"] });
    },
  });
}

export function useDeleteEmployee() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteEmployee(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allEmployees"] });
      queryClient.invalidateQueries({ queryKey: ["activeEmployeeCount"] });
    },
  });
}

export function useUpdateEmployeeStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: bigint; status: Status }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateEmployeeStatus(id, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allEmployees"] });
      queryClient.invalidateQueries({ queryKey: ["activeEmployeeCount"] });
    },
  });
}

export function useUpdateEmployee() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: bigint;
      input: EmployeeFullInput;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateEmployee(id, input);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["allEmployees"] });
      queryClient.invalidateQueries({ queryKey: ["activeEmployeeCount"] });
      queryClient.invalidateQueries({
        queryKey: ["employeeDetails", variables.id.toString()],
      });
    },
  });
}

// Issues & Suggestions
export function useAllIssues() {
  const { actor, isFetching } = useActor();
  return useQuery<IssueSuggestion[]>({
    queryKey: ["allIssues"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllIssues();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddIssueSuggestion() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: IssueSuggestionInput) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addIssueSuggestion(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allIssues"] });
    },
  });
}

export function useUpdateIssueSuggestion() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: { id: bigint; input: IssueSuggestionInput }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateIssueSuggestion(id, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allIssues"] });
    },
  });
}

export function useDeleteIssueSuggestion() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteIssueSuggestion(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allIssues"] });
    },
  });
}

// Top Performers
export function useTopPerformers() {
  const { actor, isFetching } = useActor();
  return useQuery<TopPerformer[]>({
    queryKey: ["topPerformers"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTopPerformers();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetTopPerformers() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (inputs: TopPerformerInput[]) => {
      if (!actor) throw new Error("Actor not available");
      return actor.setTopPerformers(inputs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topPerformers"] });
    },
  });
}

// Sales Records
export function useSalesRecords() {
  const { actor, isFetching } = useActor();
  return useQuery<SalesRecord[]>({
    queryKey: ["salesRecords"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getSalesRecords();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSalesRecordsByEmployee(employeeId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<SalesRecord[]>({
    queryKey: ["salesRecordsByEmployee", employeeId?.toString()],
    queryFn: async () => {
      if (!actor || employeeId === null) return [];
      return actor.getSalesRecordsByEmployee(employeeId);
    },
    enabled: !!actor && !isFetching && employeeId !== null,
  });
}

export function useAddSalesRecord() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      employeeId: bigint;
      fiplCode: string;
      accessories: bigint;
      extendedWarranty: bigint;
      totalSalesAmount: bigint;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addSalesRecord(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salesRecords"] });
      queryClient.invalidateQueries({ queryKey: ["salesRecordsByEmployee"] });
    },
  });
}

// Attendance Records
export function useAttendanceByEmployee(employeeId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<AttendanceRecord[]>({
    queryKey: ["attendanceByEmployee", employeeId?.toString()],
    queryFn: async () => {
      if (!actor || employeeId === null) return [];
      return actor.getAttendanceByEmployee(employeeId);
    },
    enabled: !!actor && !isFetching && employeeId !== null,
  });
}

export function useAddAttendanceRecord() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AttendanceRecordInput) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addAttendanceRecord(input);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["attendanceByEmployee", variables.employeeId.toString()],
      });
    },
  });
}
