import Map "mo:core/Map";
import Int "mo:core/Int";
import Array "mo:core/Array";
import Time "mo:core/Time";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import Migration "migration";

(with migration = Migration.run)
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

  type Status = { #active; #inactive; #onHold };

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

  type EmployeeInput = {
    name : Text;
    role : Text;
    department : Text;
    status : Status;
    joinDate : Int;
    avatar : Text;
  };

  type PerformanceInput = {
    salesScore : Nat;
    opsScore : Nat;
    reviewCount : Nat;
  };

  type SWOTInput = {
    strengths : [Text];
    weaknesses : [Text];
    opportunities : [Text];
    threats : [Text];
  };

  type EmployeeFullInput = {
    employeeInfo : EmployeeInput;
    performance : PerformanceInput;
    swotAnalysis : SWOTInput;
    traits : [Text];
    problems : [Text];
  };

  type FeedbackInput = {
    employeeId : EmployeeId;
    category : Text;
    description : Text;
    severity : Severity;
  };

  let employees = Map.empty<EmployeeId, Employee>();
  let performances = Map.empty<EmployeeId, Performance>();
  let swots = Map.empty<EmployeeId, SWOT>();
  let traits = Map.empty<EmployeeId, [Text]>();
  let problems = Map.empty<EmployeeId, [Text]>();
  let feedback = Map.empty<Nat, Feedback>();

  public shared ({ caller }) func initialize() : async () {
    if (employees.size() > 0) { return () };

    let currentTime = Time.now();

    let employeeList = [
      {
        id = 1;
        name = "Alice Johnson";
        role = "Sales Manager";
        department = "Sales";
        status = #active;
        joinDate = currentTime - 31536000_000_000_000;
        avatar = "AJ";
      },
      {
        id = 2;
        name = "Bob Smith";
        role = "Operations Lead";
        department = "Operations";
        status = #active;
        joinDate = currentTime - 63072000_000_000_000;
        avatar = "BS";
      },
      {
        id = 3;
        name = "Cathy Lee";
        role = "HR Specialist";
        department = "HR";
        status = #inactive;
        joinDate = currentTime - 15768000_000_000_000;
        avatar = "CL";
      },
      {
        id = 4;
        name = "David Kim";
        role = "Finance Analyst";
        department = "Finance";
        status = #active;
        joinDate = currentTime - 94608000_000_000_000;
        avatar = "DK";
      },
      {
        id = 5;
        name = "Emily Brown";
        role = "Marketing Director";
        department = "Marketing";
        status = #active;
        joinDate = currentTime - 47304000_000_000_000;
        avatar = "EB";
      },
      {
        id = 6;
        name = "Frank Wright";
        role = "IT Support";
        department = "IT";
        status = #active;
        joinDate = currentTime - 23652000_000_000_000;
        avatar = "FW";
      },
    ];

    for (employee in employeeList.values()) {
      employees.add(employee.id, employee);
    };

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

    let feedbackList = [
      {
        id = 1;
        employeeId = 1;
        category = "Performance";
        description = "Consistently meets targets, needs to improve time management";
        severity = #medium;
        date = currentTime - 2592000_000_000_000;
      },
      {
        id = 2;
        employeeId = 2;
        category = "Operations";
        description = "Excellent process improvements, needs public speaking training";
        severity = #low;
        date = currentTime - 5184000_000_000_000;
      },
      {
        id = 3;
        employeeId = 3;
        category = "HR";
        description = "Strong interpersonal skills, needs data analysis training";
        severity = #medium;
        date = currentTime - 3888000_000_000_000;
      },
      {
        id = 4;
        employeeId = 4;
        category = "Finance";
        description = "Excellent modeling skills, improve presentation skills";
        severity = #low;
        date = currentTime - 10368000_000_000_000;
      },
      {
        id = 5;
        employeeId = 5;
        category = "Marketing";
        description = "Creative campaigns, needs to focus on budgeting";
        severity = #medium;
        date = currentTime - 7776000_000_000_000;
      },
      {
        id = 6;
        employeeId = 6;
        category = "IT";
        description = "Excellent tech support, needs to improve communication";
        severity = #low;
        date = currentTime - 12096000_000_000_000;
      },
    ];

    for (fb in feedbackList.values()) {
      feedback.add(fb.id, fb);
    };
  };

  public query ({ caller }) func getAllEmployees() : async [Employee] {
    employees.values().toArray().sort();
  };

  public query ({ caller }) func getActiveEmployeeCount() : async Nat {
    employees.values().toArray().filter(
      func(emp) {
        switch (emp.status) {
          case (#active) { true };
          case (#inactive) { false };
          case (#onHold) { false };
        };
      }
    ).size();
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

  public shared ({ caller }) func addEmployee(employeeInput : EmployeeFullInput) : async EmployeeId {
    let newId = employees.size() + 1;
    let currentTime = Time.now();

    let employee : Employee = {
      id = newId;
      name = employeeInput.employeeInfo.name;
      role = employeeInput.employeeInfo.role;
      department = employeeInput.employeeInfo.department;
      status = employeeInput.employeeInfo.status;
      joinDate = employeeInput.employeeInfo.joinDate;
      avatar = employeeInput.employeeInfo.avatar;
    };

    let performance : Performance = {
      employeeId = newId;
      salesScore = employeeInput.performance.salesScore;
      opsScore = employeeInput.performance.opsScore;
      reviewCount = employeeInput.performance.reviewCount;
    };

    let swot : SWOT = {
      employeeId = newId;
      strengths = employeeInput.swotAnalysis.strengths;
      weaknesses = employeeInput.swotAnalysis.weaknesses;
      opportunities = employeeInput.swotAnalysis.opportunities;
      threats = employeeInput.swotAnalysis.threats;
    };

    employees.add(newId, employee);
    performances.add(newId, performance);
    swots.add(newId, swot);
    traits.add(newId, employeeInput.traits);
    problems.add(newId, employeeInput.problems);

    newId;
  };

  public shared ({ caller }) func addFeedback(feedbackInput : FeedbackInput) : async Nat {
    switch (employees.get(feedbackInput.employeeId)) {
      case (null) {
        Runtime.trap("Employee ID does not exist");
      };
      case (?_) {
        let newId = feedback.size() + 1;
        let currentTime = Time.now();

        let newFeedback : Feedback = {
          id = newId;
          employeeId = feedbackInput.employeeId;
          category = feedbackInput.category;
          description = feedbackInput.description;
          severity = feedbackInput.severity;
          date = currentTime;
        };

        feedback.add(newId, newFeedback);
        newId;
      };
    };
  };

  public shared ({ caller }) func bulkAddEmployees(basicInputs : [EmployeeInput]) : async [EmployeeId] {
    let startId = employees.size() + 1;
    let idsArray = Array.tabulate(
      basicInputs.size(),
      func(i) {
        let newId = startId + i;
        let empInput = basicInputs[i];

        let employee : Employee = {
          id = newId;
          name = empInput.name;
          role = empInput.role;
          department = empInput.department;
          status = empInput.status;
          joinDate = empInput.joinDate;
          avatar = empInput.avatar;
        };

        let performance : Performance = {
          employeeId = newId;
          salesScore = 0;
          opsScore = 0;
          reviewCount = 0;
        };

        let swot : SWOT = {
          employeeId = newId;
          strengths = [];
          weaknesses = [];
          opportunities = [];
          threats = [];
        };

        employees.add(newId, employee);
        performances.add(newId, performance);
        swots.add(newId, swot);
        traits.add(newId, []);
        problems.add(newId, []);

        newId;
      },
    );
    idsArray;
  };

  public shared ({ caller }) func deleteEmployee(id : EmployeeId) : async Bool {
    let existed = employees.containsKey(id);
    employees.remove(id);
    performances.remove(id);
    swots.remove(id);
    traits.remove(id);
    problems.remove(id);

    let feedbackEntries = feedback.toArray();
    for ((fbId, fb) in feedbackEntries.values()) {
      if (fb.employeeId == id) {
        feedback.remove(fbId);
      };
    };

    existed;
  };

  public shared ({ caller }) func updateEmployeeStatus(id : EmployeeId, newStatus : Status) : async Bool {
    switch (employees.get(id)) {
      case (null) { false };
      case (?employee) {
        let updatedEmployee = { employee with status = newStatus };
        employees.add(id, updatedEmployee);
        true;
      };
    };
  };

  // Updates all employee information, including Employee, Performance, SWOT, traits, and problems.
  // Returns true if the update is successful, false if the employee does not exist.
  public shared ({ caller }) func updateEmployee(id : EmployeeId, input : EmployeeFullInput) : async Bool {
    // Check if the employee exists
    if (not employees.containsKey(id)) {
      false;
    } else {
      // Create updated Employee record
      let updatedEmployee : Employee = {
        id; // Use the existing employee's ID, not the input ID
        name = input.employeeInfo.name;
        role = input.employeeInfo.role;
        department = input.employeeInfo.department;
        status = input.employeeInfo.status;
        joinDate = input.employeeInfo.joinDate;
        avatar = input.employeeInfo.avatar;
      };

      // Create updated Performance record
      let updatedPerformance : Performance = {
        employeeId = id; // Use the existing employee's ID
        salesScore = input.performance.salesScore;
        opsScore = input.performance.opsScore;
        reviewCount = input.performance.reviewCount;
      };

      // Create updated SWOT record
      let updatedSwot : SWOT = {
        employeeId = id; // Use the existing employee's ID
        strengths = input.swotAnalysis.strengths;
        weaknesses = input.swotAnalysis.weaknesses;
        opportunities = input.swotAnalysis.opportunities;
        threats = input.swotAnalysis.threats;
      };

      // Update all existing data with new values
      employees.add(id, updatedEmployee);
      performances.add(id, updatedPerformance);
      swots.add(id, updatedSwot);
      traits.add(id, input.traits);
      problems.add(id, input.problems);

      true;
    };
  };
};
