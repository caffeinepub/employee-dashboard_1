import Map "mo:core/Map";
import Text "mo:core/Text";
import Int "mo:core/Int";
import Iter "mo:core/Iter";
import Array "mo:core/Array";
import Time "mo:core/Time";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";

actor {
  type EmployeeId = Nat;

  type Employee = {
    id : EmployeeId;
    name : Text;
    role : Text;
    department : Text;
    status : Status;
    joinDate : Int;
    avatar : Text;
  };

  module Employee {
    public func compare(employee1 : Employee, employee2 : Employee) : Order.Order {
      Int.compare(employee1.id, employee2.id);
    };
  };

  type Status = { #active; #inactive };

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
    severity : Severity;
    date : Int;
  };

  type Severity = { #low; #medium; #high };

  type EmployeeDetails = {
    info : Employee;
    performance : Performance;
    swot : SWOT;
    traits : [Text];
    problems : [Text];
  };

  let employees = Map.empty<EmployeeId, Employee>();
  let performances = Map.empty<EmployeeId, Performance>();
  let swots = Map.empty<EmployeeId, SWOT>();
  let traits = Map.empty<EmployeeId, [Text]>();
  let problems = Map.empty<EmployeeId, [Text]>();
  let feedback = Map.empty<Nat, Feedback>();

  // Seed data
  public shared ({ caller }) func initialize() : async () {
    if (employees.size() > 0) { return () };

    let currentTime = Time.now();

    // Employees
    let employeeList = [
      {
        id = 1;
        name = "Alice Johnson";
        role = "Sales Manager";
        department = "Sales";
        status = #active;
        joinDate = currentTime - 31536000_000_000_000; // 1 year ago
        avatar = "AJ";
      },
      {
        id = 2;
        name = "Bob Smith";
        role = "Operations Lead";
        department = "Operations";
        status = #active;
        joinDate = currentTime - 63072000_000_000_000; // 2 years ago
        avatar = "BS";
      },
      {
        id = 3;
        name = "Cathy Lee";
        role = "HR Specialist";
        department = "HR";
        status = #inactive;
        joinDate = currentTime - 15768000_000_000_000; // 6 months ago
        avatar = "CL";
      },
      {
        id = 4;
        name = "David Kim";
        role = "Finance Analyst";
        department = "Finance";
        status = #active;
        joinDate = currentTime - 94608000_000_000_000; // 3 years ago
        avatar = "DK";
      },
      {
        id = 5;
        name = "Emily Brown";
        role = "Marketing Director";
        department = "Marketing";
        status = #active;
        joinDate = currentTime - 47304000_000_000_000; // 1.5 years ago
        avatar = "EB";
      },
      {
        id = 6;
        name = "Frank Wright";
        role = "IT Support";
        department = "IT";
        status = #active;
        joinDate = currentTime - 23652000_000_000_000; // 9 months ago
        avatar = "FW";
      },
    ];

    for (employee in employeeList.values()) {
      employees.add(employee.id, employee);
    };

    // Performances
    let performanceList = [
      { employeeId = 1; salesScore = 85; opsScore = 78; reviewCount = 10 },
      { employeeId = 2; salesScore = 72; opsScore = 90; reviewCount = 8 },
      { employeeId = 3; salesScore = 60; opsScore = 70; reviewCount = 5 },
      { employeeId = 4; salesScore = 80; opsScore = 85; reviewCount = 12 },
      { employeeId = 5; salesScore = 88; opsScore = 82; reviewCount = 11 },
      { employeeId = 6; salesScore = 70; opsScore = 75; reviewCount = 7 },
    ];

    for (performance in performanceList.values()) {
      performances.add(performance.employeeId, performance);
    };

    // SWOT
    let swotList = [
      {
        employeeId = 1;
        strengths = ["Strong leadership", "Excellent communication"];
        weaknesses = ["Time management"];
        opportunities = ["New market expansion"];
        threats = ["Competitor growth"];
      },
      {
        employeeId = 2;
        strengths = ["Attention to detail", "Process oriented"];
        weaknesses = ["Public speaking"];
        opportunities = ["Training programs"];
        threats = ["Industry regulations"];
      },
      {
        employeeId = 3;
        strengths = ["People skills", "Conflict resolution"];
        weaknesses = ["Data analysis"];
        opportunities = ["HR software adoption"];
        threats = ["Retention issues"];
      },
      {
        employeeId = 4;
        strengths = ["Financial modeling", "Analytical thinking"];
        weaknesses = ["Presentation skills"];
        opportunities = ["Cross-department projects"];
        threats = ["Economic downturn"];
      },
      {
        employeeId = 5;
        strengths = ["Creativity", "Brand management"];
        weaknesses = ["Budgeting"];
        opportunities = ["Digital marketing"];
        threats = ["Market saturation"];
      },
      {
        employeeId = 6;
        strengths = ["Technical expertise", "Problem solving"];
        weaknesses = ["Interpersonal communication"];
        opportunities = ["Cloud migration"];
        threats = ["Cybersecurity risks"];
      },
    ];

    for (swot in swotList.values()) {
      swots.add(swot.employeeId, swot);
    };

    // Traits
    let traitsMap = [
      (1, ["Driven", "Collaborative", "Adaptable"]),
      (2, ["Detail-oriented", "Reliable", "Calm under pressure"]),
      (3, ["Empathetic", "Patient", "Organized"]),
      (4, ["Analytical", "Strategic", "Efficient"]),
      (5, ["Creative", "Innovative", "Persuasive"]),
      (6, ["Technical", "Resourceful", "Helpful"]),
    ];

    for ((id, traitList) in traitsMap.values()) {
      traits.add(id, traitList);
    };

    // Problems
    let problemsMap = [
      (
        1,
        [
          "High workload",
          "Client retention"
        ]
      ),
      (
        2,
        [
          "System integration",
          "Process standardization"
        ]
      ),
      (
        3,
        [
          "Employee engagement",
          "Recruitment challenges"
        ]
      ),
      (
        4,
        [
          "Budget constraints",
          "Regulatory compliance"
        ]
      ),
      (
        5,
        [
          "Campaign effectiveness",
          "Market research"
        ]
      ),
      (
        6,
        [
          "Tech support requests",
          "Hardware upgrades"
        ]
      ),
    ];

    for ((id, problemList) in problemsMap.values()) {
      problems.add(id, problemList);
    };

    // Feedback
    let feedbackList = [
      {
        id = 1;
        employeeId = 1;
        category = "Performance";
        description = "Consistently meets targets, needs to improve time management";
        severity = #medium;
        date = currentTime - 2592000_000_000_000; // 1 month ago
      },
      {
        id = 2;
        employeeId = 2;
        category = "Operations";
        description = "Excellent process improvements, needs public speaking training";
        severity = #low;
        date = currentTime - 5184000_000_000_000; // 2 months ago
      },
      {
        id = 3;
        employeeId = 3;
        category = "HR";
        description = "Strong interpersonal skills, needs data analysis training";
        severity = #medium;
        date = currentTime - 3888000_000_000_000; // 1.5 months ago
      },
      {
        id = 4;
        employeeId = 4;
        category = "Finance";
        description = "Excellent modeling skills, improve presentation skills";
        severity = #low;
        date = currentTime - 10368000_000_000_000; // 4 months ago
      },
      {
        id = 5;
        employeeId = 5;
        category = "Marketing";
        description = "Creative campaigns, needs to focus on budgeting";
        severity = #medium;
        date = currentTime - 7776000_000_000_000; // 3 months ago
      },
      {
        id = 6;
        employeeId = 6;
        category = "IT";
        description = "Excellent tech support, needs to improve communication";
        severity = #low;
        date = currentTime - 12096000_000_000_000; // 4.5 months ago
      },
    ];

    for (fb in feedbackList.values()) {
      feedback.add(fb.id, fb);
    };
  };

  public query ({ caller }) func getAllEmployees() : async [Employee] {
    employees.values().toArray().sort(); // implicitly uses Employee.compare
  };

  public query ({ caller }) func getActiveEmployeeCount() : async Nat {
    employees.values().toArray().filter(isActive).size();
  };

  public query ({ caller }) func getEmployeeDetails(id : EmployeeId) : async EmployeeDetails {
    switch (employees.get(id), performances.get(id), swots.get(id), traits.get(id), problems.get(id)) {
      case (?emp, ?perf, ?swot, ?trt, ?prb) {
        {
          info = emp;
          performance = perf;
          swot = swot;
          traits = trt;
          problems = prb;
        };
      };
      case (_, _, _, _, _) { Runtime.trap("Employee not found") };
    };
  };

  public query ({ caller }) func getAllFeedback() : async [Feedback] {
    feedback.values().toArray();
  };

  public query ({ caller }) func getFeedbackByEmployee(employeeId : EmployeeId) : async [Feedback] {
    feedback.values().toArray().filter(
      func(fb) {
        fb.employeeId == employeeId;
      }
    );
  };

  func isActive(emp : Employee) : Bool {
    switch (emp.status) {
      case (#active) { true };
      case (#inactive) { false };
    };
  };
};
