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
export interface SWOTInput {
    weaknesses: Array<string>;
    strengths: Array<string>;
    threats: Array<string>;
    opportunities: Array<string>;
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
export interface PerformanceInput {
    opsScore: bigint;
    reviewCount: bigint;
    salesScore: bigint;
}
export interface FeedbackInput {
    description: string;
    employeeId: EmployeeId;
    category: string;
    severity: Severity;
}
export interface EmployeeFullInput {
    swotAnalysis: SWOTInput;
    employeeInfo: EmployeeInput;
    traits: Array<string>;
    performance: PerformanceInput;
    problems: Array<string>;
}
export interface EmployeeInput {
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
    inactive = "inactive",
    onHold = "onHold"
}
export interface backendInterface {
    addEmployee(employeeInput: EmployeeFullInput): Promise<EmployeeId>;
    addFeedback(feedbackInput: FeedbackInput): Promise<bigint>;
    bulkAddEmployees(basicInputs: Array<EmployeeInput>): Promise<Array<EmployeeId>>;
    deleteEmployee(id: EmployeeId): Promise<boolean>;
    getActiveEmployeeCount(): Promise<bigint>;
    getAllEmployees(): Promise<Array<Employee>>;
    getAllFeedback(): Promise<Array<Feedback>>;
    getEmployeeDetails(id: EmployeeId): Promise<EmployeeDetails>;
    getFeedbackByEmployee(employeeId: EmployeeId): Promise<Array<Feedback>>;
    initialize(): Promise<void>;
    updateEmployee(id: EmployeeId, input: EmployeeFullInput): Promise<boolean>;
    updateEmployeeStatus(id: EmployeeId, newStatus: Status): Promise<boolean>;
}
