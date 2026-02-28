import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Employee, EmployeeDetails, Feedback } from "../backend.d.ts";
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
