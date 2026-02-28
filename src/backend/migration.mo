import Map "mo:core/Map";
import Nat "mo:core/Nat";

module {
  type EmployeeId = Nat;

  type OldStatus = { #active; #inactive };
  type NewStatus = { #active; #inactive; #onHold };

  type OldEmployee = {
    id : EmployeeId;
    name : Text;
    role : Text;
    department : Text;
    status : OldStatus;
    joinDate : Int;
    avatar : Text;
  };

  type NewEmployee = {
    id : EmployeeId;
    name : Text;
    role : Text;
    department : Text;
    status : NewStatus;
    joinDate : Int;
    avatar : Text;
  };

  type OldActor = {
    employees : Map.Map<EmployeeId, OldEmployee>;
    performances : Map.Map<EmployeeId, Performance>;
    swots : Map.Map<EmployeeId, SWOT>;
    traits : Map.Map<EmployeeId, [Text]>;
    problems : Map.Map<EmployeeId, [Text]>;
    feedback : Map.Map<Nat, Feedback>;
  };

  type Performance = {
    employeeId : EmployeeId;
    salesScore : Nat;
    opsScore : Nat;
    reviewCount : Nat;
  };

  type SWOT = {
    employeeId : EmployeeId;
    strengths : [Text];
    weaknesses : [Text];
    opportunities : [Text];
    threats : [Text];
  };

  type Feedback = {
    id : Nat;
    employeeId : EmployeeId;
    category : Text;
    description : Text;
    severity : { #low; #medium; #high };
    date : Int;
  };

  type NewActor = {
    employees : Map.Map<EmployeeId, NewEmployee>;
    performances : Map.Map<EmployeeId, Performance>;
    swots : Map.Map<EmployeeId, SWOT>;
    traits : Map.Map<EmployeeId, [Text]>;
    problems : Map.Map<EmployeeId, [Text]>;
    feedback : Map.Map<Nat, Feedback>;
  };

  public func run(old : OldActor) : NewActor {
    let updatedEmployees = old.employees.map<EmployeeId, OldEmployee, NewEmployee>(
      func(_id, emp) {
        { emp with status = convertStatus(emp.status) };
      }
    );
    { old with employees = updatedEmployees };
  };

  func convertStatus(oldStatus : OldStatus) : NewStatus {
    switch (oldStatus) {
      case (#active) { #active };
      case (#inactive) { #inactive };
    };
  };
};
