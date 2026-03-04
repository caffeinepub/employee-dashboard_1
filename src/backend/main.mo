import Map "mo:core/Map";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Int "mo:core/Int";
import Order "mo:core/Order";



actor {
  // Types
  public type EmployeeId = Nat;
  public type Status = { #active; #inactive; #onHold };
  public type Severity = { #low; #medium; #high };

  public type Employee = {
    id : EmployeeId;
    fiplCode : Text;
    name : Text;
    role : Text;
    department : Text;
    status : Status;
    joinDate : Int;
    avatar : Text;
    region : Text;
    familyDetails : Text;
    pastExperience : [Text];
    fseCategory : Text;
  };

  public type Performance = {
    employeeId : EmployeeId;
    salesInfluenceIndex : Nat;
    reviewCount : Nat;
    operationalDiscipline : Nat;
    productKnowledgeScore : Nat;
    softSkillsScore : Nat;
  };

  public type SWOT = {
    employeeId : EmployeeId;
    strengths : [Text];
    weaknesses : [Text];
    opportunities : [Text];
    threats : [Text];
  };

  public type Feedback = {
    id : Nat;
    employeeId : EmployeeId;
    category : Text;
    description : Text;
    severity : Severity;
    date : Int;
  };

  public type SalesRecord = {
    id : Nat;
    employeeId : EmployeeId;
    fiplCode : Text;
    accessories : Nat;
    extendedWarranty : Nat;
    totalSalesAmount : Nat;
    recordDate : Int;
  };

  public type AttendanceRecord = {
    id : Nat;
    employeeId : EmployeeId;
    date : Int;
    lapseType : Text;
    reason : Text;
    daysOff : Nat;
  };

  public type IssueSuggestion = {
    id : Nat;
    title : Text;
    description : Text;
    category : Text;
    createdAt : Int;
    updatedAt : Int;
  };

  public type TopPerformer = {
    rank : Nat;
    name : Text;
    fiplCode : Text;
    accessories : Nat;
    extendedWarranty : Nat;
    totalSales : Nat;
  };

  // Aggregates
  public type EmployeeDetails = {
    info : Employee;
    performance : Performance;
    swot : SWOT;
    traits : [Text];
    problems : [Text];
  };

  // Input Types
  public type EmployeeInput = {
    fiplCode : Text;
    name : Text;
    role : Text;
    department : Text;
    status : Status;
    joinDate : Int;
    avatar : Text;
    region : Text;
    familyDetails : Text;
    pastExperience : [Text];
    fseCategory : Text;
  };

  public type PerformanceInput = {
    salesInfluenceIndex : Nat;
    reviewCount : Nat;
    operationalDiscipline : Nat;
    productKnowledgeScore : Nat;
    softSkillsScore : Nat;
  };

  public type SWOTInput = {
    strengths : [Text];
    weaknesses : [Text];
    opportunities : [Text];
    threats : [Text];
  };

  public type EmployeeFullInput = {
    employeeInfo : EmployeeInput;
    performance : PerformanceInput;
    swotAnalysis : SWOTInput;
    traits : [Text];
    problems : [Text];
  };

  public type FeedbackInput = {
    employeeId : EmployeeId;
    category : Text;
    description : Text;
    severity : Severity;
  };

  public type SalesRecordInput = {
    employeeId : EmployeeId;
    fiplCode : Text;
    accessories : Nat;
    extendedWarranty : Nat;
    totalSalesAmount : Nat;
  };

  public type AttendanceRecordInput = {
    employeeId : EmployeeId;
    date : Int;
    lapseType : Text;
    reason : Text;
    daysOff : Nat;
  };

  public type IssueSuggestionInput = {
    title : Text;
    description : Text;
    category : Text;
  };

  public type TopPerformerInput = {
    rank : Nat;
    name : Text;
    fiplCode : Text;
    accessories : Nat;
    extendedWarranty : Nat;
    totalSales : Nat;
  };

  module Employee {
    public func compare(employee1 : Employee, employee2 : Employee) : Order.Order {
      Int.compare(employee1.id, employee2.id);
    };
  };

  // Stable Maps
  let employees = Map.empty<EmployeeId, Employee>();
  let performances = Map.empty<EmployeeId, Performance>();
  let swots = Map.empty<EmployeeId, SWOT>();
  let traits = Map.empty<EmployeeId, [Text]>();
  let problems = Map.empty<EmployeeId, [Text]>();
  let feedback = Map.empty<Nat, Feedback>();
  let salesRecords = Map.empty<Nat, SalesRecord>();
  let attendanceRecords = Map.empty<Nat, AttendanceRecord>();
  let issues = Map.empty<Nat, IssueSuggestion>();
  let topPerformers = Map.empty<Nat, TopPerformer>();
  var nextEmployeeId = 1;
  var nextFeedbackId = 1;
  var nextRecordId = 1;
  var nextAttendanceId = 1;
  var nextIssueId = 1;

  // Queries
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
    switch (
      employees.get(id),
      performances.get(id),
      swots.get(id),
      traits.get(id),
      problems.get(id)
    ) {
      case (?emp, ?perf, ?swot, ?trt, ?prb) {
        {
          info = emp;
          performance = perf;
          swot = swot;
          traits = trt;
          problems = prb;
        };
      };
      case (_, _, _, _, _) {
        { info = { id = 0; fiplCode = "none"; name = "none"; role = "none"; department = "none"; status = #inactive; joinDate = 0; avatar = "none"; region = "none"; familyDetails = "none"; pastExperience = []; fseCategory = "none" }; performance = { employeeId = 0; salesInfluenceIndex = 0; reviewCount = 0; operationalDiscipline = 0; productKnowledgeScore = 0; softSkillsScore = 0 }; swot = { employeeId = 0; strengths = []; weaknesses = []; opportunities = []; threats = [] }; traits = []; problems = [] };
      };
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

  public query ({ caller }) func getSalesRecords() : async [SalesRecord] {
    salesRecords.values().toArray();
  };

  public query ({ caller }) func getSalesRecordsByEmployee(employeeId : EmployeeId) : async [SalesRecord] {
    salesRecords.values().toArray().filter(
      func(rec) {
        rec.employeeId == employeeId;
      }
    );
  };

  public query ({ caller }) func getAttendanceByEmployee(employeeId : EmployeeId) : async [AttendanceRecord] {
    attendanceRecords.values().toArray().filter(
      func(rec) {
        rec.employeeId == employeeId;
      }
    );
  };

  public query ({ caller }) func getAllIssues() : async [IssueSuggestion] {
    issues.values().toArray();
  };

  public query ({ caller }) func getTopPerformers() : async [TopPerformer] {
    topPerformers.values().toArray();
  };

  // Mutations
  public shared ({ caller }) func initialize() : async () {
    if (employees.size() > 0) { return () };

    let currentTime = Time.now();

    let sampleEmployees = [
      {
        id = nextEmployeeId;
        fiplCode = "FIPL-001";
        name = "Alice Johnson";
        role = "Sales Manager";
        department = "Sales";
        status = #active;
        joinDate = currentTime - 31536000_000_000_000;
        avatar = "AJ";
        region = "Northeast";
        familyDetails = "Married, 2 children";
        pastExperience = [
          "Acme Corp - Sales Rep - 3 years",
          "Beta Inc - Account Manager - 2 years",
        ];
        fseCategory = "Star";
      },
      {
        id = nextEmployeeId + 1;
        fiplCode = "FIPL-002";
        name = "Bob Smith";
        role = "Operations Lead";
        department = "Operations";
        status = #active;
        joinDate = currentTime - 63072000_000_000_000;
        avatar = "BS";
        region = "Midwest";
        familyDetails = "Single";
        pastExperience = [
          "Gamma LLC - Operations Analyst - 4 years",
          "Delta Co - Process Manager - 3 years",
        ];
        fseCategory = "Question Mark";
      },
      {
        id = nextEmployeeId + 2;
        fiplCode = "FIPL-003";
        name = "Cathy Lee";
        role = "HR Specialist";
        department = "HR";
        status = #inactive;
        joinDate = currentTime - 15768000_000_000_000;
        avatar = "CL";
        region = "Southeast";
        familyDetails = "Married";
        pastExperience = [
          "Epsilon Partners - HR Assistant - 2 years",
          "Zeta Solutions - Recruiter - 1 year",
        ];
        fseCategory = "Cash Cow";
      },
      {
        id = nextEmployeeId + 3;
        fiplCode = "FIPL-004";
        name = "David Kim";
        role = "Finance Analyst";
        department = "Finance";
        status = #active;
        joinDate = currentTime - 94608000_000_000_000;
        avatar = "DK";
        region = "West Coast";
        familyDetails = "Single";
        pastExperience = [
          "Eta Group - Junior Analyst - 2 years",
          "Theta Enterprises - Financial Consultant - 3 years",
        ];
        fseCategory = "Dog";
      },
      {
        id = nextEmployeeId + 4;
        fiplCode = "FIPL-005";
        name = "Emily Brown";
        role = "Marketing Director";
        department = "Marketing";
        status = #active;
        joinDate = currentTime - 47304000_000_000_000;
        avatar = "EB";
        region = "Midwest";
        familyDetails = "Married, 1 child";
        pastExperience = [
          "Iota Design - Marketing Coordinator - 2 years",
          "Kappa Advertising - Brand Manager - 3 years",
        ];
        fseCategory = "Star";
      },
      {
        id = nextEmployeeId + 5;
        fiplCode = "FIPL-006";
        name = "Frank Wright";
        role = "IT Support";
        department = "IT";
        status = #active;
        joinDate = currentTime - 23652000_000_000_000;
        avatar = "FW";
        region = "Mountain Region";
        familyDetails = "Single";
        pastExperience = [
          "Lambda Tech - Helpdesk Analyst - 1 year",
          "Mu Systems - IT Technician - 2 years",
        ];
        fseCategory = "Question Mark";
      },
    ];

    for (employee in sampleEmployees.values()) {
      employees.add(employee.id, employee);
      nextEmployeeId += 1;
    };

    let samplePerformances = [
      { employeeId = 1; salesInfluenceIndex = 85; reviewCount = 10; operationalDiscipline = 78; productKnowledgeScore = 75; softSkillsScore = 90 },
      { employeeId = 2; salesInfluenceIndex = 72; reviewCount = 8; operationalDiscipline = 90; productKnowledgeScore = 65; softSkillsScore = 80 },
      { employeeId = 3; salesInfluenceIndex = 60; reviewCount = 5; operationalDiscipline = 70; productKnowledgeScore = 80; softSkillsScore = 85 },
      { employeeId = 4; salesInfluenceIndex = 80; reviewCount = 12; operationalDiscipline = 85; productKnowledgeScore = 95; softSkillsScore = 70 },
      { employeeId = 5; salesInfluenceIndex = 88; reviewCount = 11; operationalDiscipline = 82; productKnowledgeScore = 75; softSkillsScore = 95 },
      { employeeId = 6; salesInfluenceIndex = 70; reviewCount = 7; operationalDiscipline = 75; productKnowledgeScore = 85; softSkillsScore = 80 },
    ];

    for (performance in samplePerformances.values()) {
      performances.add(performance.employeeId, performance);
    };

    let sampleSWOTs = [
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

    for (swot in sampleSWOTs.values()) {
      swots.add(swot.employeeId, swot);
    };

    for (employeeId in employees.keys()) {
      traits.add(employeeId, []);
      problems.add(employeeId, []);
    };
  };

  public shared ({ caller }) func addEmployee(input : EmployeeFullInput) : async EmployeeId {
    let newId = nextEmployeeId;
    nextEmployeeId += 1;

    let employee : Employee = {
      id = newId;
      fiplCode = input.employeeInfo.fiplCode;
      name = input.employeeInfo.name;
      role = input.employeeInfo.role;
      department = input.employeeInfo.department;
      status = input.employeeInfo.status;
      joinDate = input.employeeInfo.joinDate;
      avatar = input.employeeInfo.avatar;
      region = input.employeeInfo.region;
      familyDetails = input.employeeInfo.familyDetails;
      pastExperience = input.employeeInfo.pastExperience;
      fseCategory = input.employeeInfo.fseCategory;
    };

    let performance : Performance = {
      employeeId = newId;
      salesInfluenceIndex = input.performance.salesInfluenceIndex;
      reviewCount = input.performance.reviewCount;
      operationalDiscipline = input.performance.operationalDiscipline;
      productKnowledgeScore = input.performance.productKnowledgeScore;
      softSkillsScore = input.performance.softSkillsScore;
    };

    let swot : SWOT = {
      employeeId = newId;
      strengths = input.swotAnalysis.strengths;
      weaknesses = input.swotAnalysis.weaknesses;
      opportunities = input.swotAnalysis.opportunities;
      threats = input.swotAnalysis.threats;
    };

    employees.add(newId, employee);
    performances.add(newId, performance);
    swots.add(newId, swot);
    traits.add(newId, input.traits);
    problems.add(newId, input.problems);

    newId;
  };

  public shared ({ caller }) func updateEmployee(id : EmployeeId, input : EmployeeFullInput) : async Bool {
    switch (employees.get(id)) {
      case (null) { false };
      case (?_) {
        let employee : Employee = {
          id;
          fiplCode = input.employeeInfo.fiplCode;
          name = input.employeeInfo.name;
          role = input.employeeInfo.role;
          department = input.employeeInfo.department;
          status = input.employeeInfo.status;
          joinDate = input.employeeInfo.joinDate;
          avatar = input.employeeInfo.avatar;
          region = input.employeeInfo.region;
          familyDetails = input.employeeInfo.familyDetails;
          pastExperience = input.employeeInfo.pastExperience;
          fseCategory = input.employeeInfo.fseCategory;
        };

        let performance : Performance = {
          employeeId = id;
          salesInfluenceIndex = input.performance.salesInfluenceIndex;
          reviewCount = input.performance.reviewCount;
          operationalDiscipline = input.performance.operationalDiscipline;
          productKnowledgeScore = input.performance.productKnowledgeScore;
          softSkillsScore = input.performance.softSkillsScore;
        };

        let swot : SWOT = {
          employeeId = id;
          strengths = input.swotAnalysis.strengths;
          weaknesses = input.swotAnalysis.weaknesses;
          opportunities = input.swotAnalysis.opportunities;
          threats = input.swotAnalysis.threats;
        };

        employees.add(id, employee);
        performances.add(id, performance);
        swots.add(id, swot);
        traits.add(id, input.traits);
        problems.add(id, input.problems);

        true;
      };
    };
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

  public shared ({ caller }) func bulkAddEmployees(inputs : [EmployeeInput]) : async [EmployeeId] {
    let idsArray = Array.tabulate(
      inputs.size(),
      func(i) {
        let newId = nextEmployeeId + i;
        let empInput = inputs[i];

        let employee : Employee = {
          id = newId;
          fiplCode = empInput.fiplCode;
          name = empInput.name;
          role = empInput.role;
          department = empInput.department;
          status = empInput.status;
          joinDate = empInput.joinDate;
          avatar = empInput.avatar;
          region = empInput.region;
          familyDetails = empInput.familyDetails;
          pastExperience = empInput.pastExperience;
          fseCategory = empInput.fseCategory;
        };

        let performance : Performance = {
          employeeId = newId;
          salesInfluenceIndex = 0;
          reviewCount = 0;
          operationalDiscipline = 0;
          productKnowledgeScore = 0;
          softSkillsScore = 0;
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
    nextEmployeeId += inputs.size();
    idsArray;
  };

  public shared ({ caller }) func addFeedback(input : FeedbackInput) : async Nat {
    switch (employees.get(input.employeeId)) {
      case (null) {
        0;
      };
      case (?_) {
        let newId = nextFeedbackId;
        nextFeedbackId += 1;
        let currentTime = Time.now();

        let newFeedback : Feedback = {
          id = newId;
          employeeId = input.employeeId;
          category = input.category;
          description = input.description;
          severity = input.severity;
          date = currentTime;
        };

        feedback.add(newId, newFeedback);
        newId;
      };
    };
  };

  public shared ({ caller }) func addSalesRecord(input : SalesRecordInput) : async Nat {
    let newId = nextRecordId;
    nextRecordId += 1;

    let record : SalesRecord = {
      id = newId;
      employeeId = input.employeeId;
      fiplCode = input.fiplCode;
      accessories = input.accessories;
      extendedWarranty = input.extendedWarranty;
      totalSalesAmount = input.totalSalesAmount;
      recordDate = Time.now();
    };

    salesRecords.add(newId, record);
    newId;
  };

  public shared ({ caller }) func addAttendanceRecord(input : AttendanceRecordInput) : async Nat {
    let newId = nextAttendanceId;
    nextAttendanceId += 1;

    let record : AttendanceRecord = {
      id = newId;
      employeeId = input.employeeId;
      date = input.date;
      lapseType = input.lapseType;
      reason = input.reason;
      daysOff = input.daysOff;
    };

    attendanceRecords.add(newId, record);
    newId;
  };

  public shared ({ caller }) func addIssueSuggestion(input : IssueSuggestionInput) : async Nat {
    let newId = nextIssueId;
    nextIssueId += 1;
    let currentTime = Time.now();

    let issue : IssueSuggestion = {
      id = newId;
      title = input.title;
      description = input.description;
      category = input.category;
      createdAt = currentTime;
      updatedAt = currentTime;
    };

    issues.add(newId, issue);
    newId;
  };

  public shared ({ caller }) func updateIssueSuggestion(id : Nat, input : IssueSuggestionInput) : async Bool {
    switch (issues.get(id)) {
      case (null) { false };
      case (?_) {
        let updatedIssue : IssueSuggestion = {
          id;
          title = input.title;
          description = input.description;
          category = input.category;
          createdAt = Time.now();
          updatedAt = Time.now();
        };

        issues.add(id, updatedIssue);
        true;
      };
    };
  };

  public shared ({ caller }) func deleteIssueSuggestion(id : Nat) : async Bool {
    let existed = issues.containsKey(id);
    issues.remove(id);
    existed;
  };

  public shared ({ caller }) func setTopPerformers(inputs : [TopPerformerInput]) : async Bool {
    topPerformers.clear();
    for (input in inputs.values()) {
      let performer : TopPerformer = {
        rank = input.rank;
        name = input.name;
        fiplCode = input.fiplCode;
        accessories = input.accessories;
        extendedWarranty = input.extendedWarranty;
        totalSales = input.totalSales;
      };
      topPerformers.add(input.rank, performer);
    };
    true;
  };
};
