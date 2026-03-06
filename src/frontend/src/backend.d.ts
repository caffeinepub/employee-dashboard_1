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
export interface AttendanceRecord {
    id: bigint;
    lapseType: string;
    date: bigint;
    employeeId: EmployeeId;
    reason: string;
    daysOff: bigint;
}
export interface IssueSuggestionInput {
    title: string;
    description: string;
    category: string;
}
export interface SalesRecordInput {
    saleType: SaleType;
    employeeId: EmployeeId;
    quantity: bigint;
    brand: SalesBrand;
    amount: bigint;
    product: string;
    saleDate: bigint;
    fiplCode: string;
}
export interface Performance {
    operationalDiscipline: bigint;
    softSkillsScore: bigint;
    productKnowledgeScore: bigint;
    salesInfluenceIndex: bigint;
    employeeId: EmployeeId;
    reviewCount: bigint;
}
export interface IssueSuggestion {
    id: bigint;
    title: string;
    createdAt: bigint;
    description: string;
    updatedAt: bigint;
    category: string;
}
export interface Feedback {
    id: bigint;
    date: bigint;
    description: string;
    employeeId: EmployeeId;
    category: string;
    severity: Severity;
}
export interface TopPerformerInput {
    accessories: bigint;
    name: string;
    rank: bigint;
    totalSales: bigint;
    extendedWarranty: bigint;
    fiplCode: string;
}
export interface SalesRecord {
    id: bigint;
    saleType: SaleType;
    recordDate: bigint;
    employeeId: EmployeeId;
    quantity: bigint;
    brand: SalesBrand;
    amount: bigint;
    product: string;
    saleDate: bigint;
    fiplCode: string;
}
export interface PerformanceInput {
    operationalDiscipline: bigint;
    softSkillsScore: bigint;
    productKnowledgeScore: bigint;
    salesInfluenceIndex: bigint;
    reviewCount: bigint;
}
export interface EmployeeFullInput {
    swotAnalysis: SWOTInput;
    employeeInfo: EmployeeInput;
    traits: Array<string>;
    performance: PerformanceInput;
    problems: Array<string>;
}
export interface SWOTInput {
    weaknesses: Array<string>;
    strengths: Array<string>;
    threats: Array<string>;
    opportunities: Array<string>;
}
export type EmployeeId = bigint;
export interface AttendanceRecordInput {
    lapseType: string;
    date: bigint;
    employeeId: EmployeeId;
    reason: string;
    daysOff: bigint;
}
export interface TopPerformer {
    accessories: bigint;
    name: string;
    rank: bigint;
    totalSales: bigint;
    extendedWarranty: bigint;
    fiplCode: string;
}
export interface EmployeeDetails {
    traits: Array<string>;
    info: Employee;
    swot: SWOT;
    performance: Performance;
    problems: Array<string>;
}
export interface FeedbackInput {
    description: string;
    employeeId: EmployeeId;
    category: string;
    severity: Severity;
}
export interface Employee {
    id: EmployeeId;
    region: string;
    status: Status;
    joinDate: bigint;
    name: string;
    role: string;
    fseCategory: string;
    department: string;
    familyDetails: string;
    pastExperience: Array<string>;
    avatar: string;
    fiplCode: string;
}
export interface EmployeeInput {
    region: string;
    status: Status;
    joinDate: bigint;
    name: string;
    role: string;
    fseCategory: string;
    department: string;
    familyDetails: string;
    pastExperience: Array<string>;
    avatar: string;
    fiplCode: string;
}
export enum SaleType {
    accessories = "accessories",
    extendedWarranty = "extendedWarranty"
}
export enum SalesBrand {
    tineco = "tineco",
    ecovacs = "ecovacs",
    coway = "coway",
    kuvings = "kuvings",
    instant = "instant"
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
    addAttendanceRecord(input: AttendanceRecordInput): Promise<bigint>;
    addEmployee(input: EmployeeFullInput): Promise<EmployeeId>;
    addFeedback(input: FeedbackInput): Promise<bigint>;
    addIssueSuggestion(input: IssueSuggestionInput): Promise<bigint>;
    addProblem(employeeId: EmployeeId, problem: string): Promise<boolean>;
    addSalesRecord(input: SalesRecordInput): Promise<bigint>;
    addSalesRecordsBatch(inputs: Array<SalesRecordInput>): Promise<Array<bigint>>;
    addTrait(employeeId: EmployeeId, trait: string): Promise<boolean>;
    bulkAddEmployees(inputs: Array<EmployeeInput>): Promise<Array<EmployeeId>>;
    deleteEmployee(id: EmployeeId): Promise<boolean>;
    deleteIssueSuggestion(id: bigint): Promise<boolean>;
    getActiveEmployeeCount(): Promise<bigint>;
    getAllEmployees(): Promise<Array<Employee>>;
    getAllFeedback(): Promise<Array<Feedback>>;
    getAllIssues(): Promise<Array<IssueSuggestion>>;
    getAttendanceByEmployee(employeeId: EmployeeId): Promise<Array<AttendanceRecord>>;
    getEmployeeDetails(id: EmployeeId): Promise<EmployeeDetails>;
    getFeedbackByEmployee(employeeId: EmployeeId): Promise<Array<Feedback>>;
    getSalesRecords(): Promise<Array<SalesRecord>>;
    getSalesRecordsByEmployee(employeeId: EmployeeId): Promise<Array<SalesRecord>>;
    getTopPerformers(): Promise<Array<TopPerformer>>;
    initialize(): Promise<void>;
    setTopPerformers(inputs: Array<TopPerformerInput>): Promise<boolean>;
    updateEmployee(id: EmployeeId, input: EmployeeFullInput): Promise<boolean>;
    updateEmployeePerformance(employeeId: EmployeeId, input: PerformanceInput): Promise<boolean>;
    updateEmployeeSWOT(employeeId: EmployeeId, swotInput: SWOTInput): Promise<boolean>;
    updateEmployeeStatus(id: EmployeeId, newStatus: Status): Promise<boolean>;
    updateIssueSuggestion(id: bigint, input: IssueSuggestionInput): Promise<boolean>;
    updatePerformanceByFiplCode(fiplCode: string, input: PerformanceInput): Promise<boolean>;
    updateSwotByFiplCode(fiplCode: string, swotInput: SWOTInput, newTraits: Array<string>, newProblems: Array<string>): Promise<boolean>;
}
