import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface SWOT {
    weaknesses: Array<string>;
    strengths: Array<string>;
    threats: Array<string>;
    opportunities: Array<string>;
    employeeId: EmployeeId;
}
export type EmployeeId = bigint;
export interface Feedback {
    id: bigint;
    date: bigint;
    description: string;
    employeeId: EmployeeId;
    category: string;
    severity: Severity;
}
export interface Performance {
    opsScore: bigint;
    employeeId: EmployeeId;
    reviewCount: bigint;
    salesScore: bigint;
}
export interface EmployeeDetails {
    traits: Array<string>;
    info: Employee;
    swot: SWOT;
    performance: Performance;
    problems: Array<string>;
}
export interface Employee {
    id: EmployeeId;
    status: Status;
    joinDate: bigint;
    name: string;
    role: string;
    department: string;
    avatar: string;
}
export enum Severity {
    low = "low",
    high = "high",
    medium = "medium"
}
export enum Status {
    active = "active",
    inactive = "inactive"
}
export interface backendInterface {
    getActiveEmployeeCount(): Promise<bigint>;
    getAllEmployees(): Promise<Array<Employee>>;
    getAllFeedback(): Promise<Array<Feedback>>;
    getEmployeeDetails(id: EmployeeId): Promise<EmployeeDetails>;
    getFeedbackByEmployee(employeeId: EmployeeId): Promise<Array<Feedback>>;
    initialize(): Promise<void>;
}
