import Map "mo:core/Map";
import Iter "mo:core/Iter";
import Array "mo:core/Array";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Int "mo:core/Int";
import Order "mo:core/Order";
import Time "mo:core/Time";

actor {
  public type EmployeeId = Nat;
  public type Status = { #active; #inactive; #onHold };
  public type Severity = { #low; #medium; #high };
  public type SalesBrand = { #ecovacs; #kuvings; #coway; #tineco; #instant };
  public type SaleType = { #accessories; #extendedWarranty };

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
    brand : SalesBrand;
    product : Text;
    saleType : SaleType;
    quantity : Nat;
    amount : Int;
    recordDate : Int;
    saleDate : Int;
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

  public type FeedbackInput = {
    employeeId : EmployeeId;
    category : Text;
    description : Text;
    severity : Severity;
  };

  public type SalesRecordInput = {
    employeeId : EmployeeId;
    fiplCode : Text;
    brand : SalesBrand;
    product : Text;
    saleType : SaleType;
    quantity : Nat;
    amount : Int;
    saleDate : Int;
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

  public type EmployeeDetails = {
    info : Employee;
    performance : Performance;
    swot : SWOT;
    traits : [Text];
    problems : [Text];
  };

  public type EmployeeFullInput = {
    employeeInfo : EmployeeInput;
    performance : PerformanceInput;
    swotAnalysis : SWOTInput;
    traits : [Text];
    problems : [Text];
  };

  public type SwotBatchInput = {
    fiplCode : Text;
    swot : SWOTInput;
    traits : [Text];
    problems : [Text];
  };

  public type CallingRecord = {
    id : Nat;
    fiplCode : Text;
    fseName : Text;
    customerName : Text;
    date : Int;
    callDuration : Text;
    outcome : Text;
    notes : Text;
    createdAt : Int;
  };

  public type CallingRecordInput = {
    fiplCode : Text;
    fseName : Text;
    customerName : Text;
    date : Int;
    callDuration : Text;
    outcome : Text;
    notes : Text;
  };

  public type CustomerReview = {
    id : Nat;
    fiplCode : Text;
    fseName : Text;
    reviewerName : Text;
    rating : Nat;
    reviewText : Text;
    date : Int;
    createdAt : Int;
  };

  public type CustomerReviewInput = {
    fiplCode : Text;
    fseName : Text;
    reviewerName : Text;
    rating : Nat;
    reviewText : Text;
    date : Int;
  };

  module Employee {
    public func compare(employee1 : Employee, employee2 : Employee) : Order.Order {
      Int.compare(employee1.id, employee2.id);
    };
  };

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

  let callingRecords = Map.empty<Nat, CallingRecord>();
  let customerReviews = Map.empty<Nat, CustomerReview>();

  var nextEmployeeId = 1;
  var nextFeedbackId = 1;
  var nextRecordId = 1;
  var nextAttendanceId = 1;
  var nextIssueId = 1;
  var nextCallingRecordId = 1;
  var nextReviewId = 1;

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

  public shared ({ caller }) func initialize() : async () {
    if (employees.size() > 0) { return () };
    let sampleEmployees = [
      {
        id = nextEmployeeId;
        fiplCode = "FIPL-001";
        name = "Priya Sharma";
        role = "Sales Lead";
        department = "Sales";
        status = #active;
        joinDate = Time.now() - 35980800000000000; // 1.14 years in nanoseconds
        avatar = "https://ui-avatars.com/api/?name=Priya+Sharma";
        region = "North India";
        familyDetails = "Married, 1 child";
        pastExperience = [
          "Reliance Retail - Sales Executive - 3 years",
          "Tata Motors - Account Manager - 2 years",
        ];
        fseCategory = "Star";
      },
      {
        id = nextEmployeeId + 1;
        fiplCode = "FIPL-002";
        name = "Raj Mehta";
        role = "Operations Manager";
        department = "Operations";
        status = #active;
        joinDate = Time.now() - 71222400000000000; // 2.26 years
        avatar = "https://ui-avatars.com/api/?name=Raj+Mehta";
        region = "West Coast";
        familyDetails = "Single";
        pastExperience = [
          "Hindustan Lever - Process Analyst - 4 years",
          "Maruti Suzuki - Team Lead - 3 years",
        ];
        fseCategory = "Cash Cow";
      },
      {
        id = nextEmployeeId + 2;
        fiplCode = "FIPL-003";
        name = "Anita Patel";
        role = "HR Administrator";
        department = "HR";
        status = #active;
        joinDate = Time.now() - 36460800000000000; // 13.5 months
        avatar = "https://ui-avatars.com/api/?name=Anita+Patel";
        region = "South India";
        familyDetails = "Married";
        pastExperience = [
          "Infosys - HR Assistant - 2 years",
          "Wipro - Recruiter - 1 year",
        ];
        fseCategory = "Question Mark";
      },
      {
        id = nextEmployeeId + 3;
        fiplCode = "FIPL-004";
        name = "Suresh Kumar";
        role = "Finance Specialist";
        department = "Finance";
        status = #active;
        joinDate = Time.now() - 109488000000000000; // 3.48 years
        avatar = "https://ui-avatars.com/api/?name=Suresh+Kumar";
        region = "East India";
        familyDetails = "Single, 2 children";
        pastExperience = [
          "L&T Finance - Junior Analyst - 2 years",
          "Axis Bank - Financial Consultant - 3 years",
        ];
        fseCategory = "Dog";
      },
      {
        id = nextEmployeeId + 4;
        fiplCode = "FIPL-005";
        name = "Deepa Singh";
        role = "Marketing Manager";
        department = "Marketing";
        status = #active;
        joinDate = Time.now() - 71222400000000000; // 2.26 years
        avatar = "https://ui-avatars.com/api/?name=Deepa+Singh";
        region = "Central India";
        familyDetails = "Married, 2 children";
        pastExperience = [
          "Aditya Birla Group - Marketing Coordinator - 2 years",
          "Flipkart - Brand Manager - 3 years",
        ];
        fseCategory = "Star";
      },
      {
        id = nextEmployeeId + 5;
        fiplCode = "FIPL-006";
        name = "Vikram Joshi";
        role = "IT Support Specialist";
        department = "IT";
        status = #active;
        joinDate = Time.now() - 67046400000000000; // 2.13 years
        avatar = "https://ui-avatars.com/api/?name=Vikram+Joshi";
        region = "North India";
        familyDetails = "Single";
        pastExperience = [
          "Tech Mahindra - Helpdesk Analyst - 1 year",
          "Mindtree - IT Technician - 2 years",
        ];
        fseCategory = "Cash Cow";
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

  public shared ({ caller }) func updatePerformanceByFiplCode(fiplCode : Text, input : PerformanceInput) : async Bool {
    var foundEmployeeId : ?EmployeeId = null;

    for ((_, empData) in employees.entries()) {
      if (empData.fiplCode == fiplCode) {
        foundEmployeeId := ?empData.id;
      };
    };

    switch (foundEmployeeId) {
      case (?id) {
        let performance : Performance = {
          employeeId = id;
          salesInfluenceIndex = input.salesInfluenceIndex;
          reviewCount = input.reviewCount;
          operationalDiscipline = input.operationalDiscipline;
          productKnowledgeScore = input.productKnowledgeScore;
          softSkillsScore = input.softSkillsScore;
        };
        performances.add(id, performance);
        true;
      };
      case (null) { false };
    };
  };

  public shared ({ caller }) func updateSwotByFiplCode(fiplCode : Text, swotInput : SWOTInput, newTraits : [Text], newProblems : [Text]) : async Bool {
    var foundEmployeeId : ?EmployeeId = null;

    for ((_, empData) in employees.entries()) {
      if (empData.fiplCode == fiplCode) {
        foundEmployeeId := ?empData.id;
      };
    };

    switch (foundEmployeeId) {
      case (?id) {
        let swot : SWOT = {
          employeeId = id;
          strengths = swotInput.strengths;
          weaknesses = swotInput.weaknesses;
          opportunities = swotInput.opportunities;
          threats = swotInput.threats;
        };
        swots.add(id, swot);
        traits.add(id, newTraits);
        problems.add(id, newProblems);
        true;
      };
      case (null) { false };
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
      case (null) { 0 };
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
      brand = input.brand;
      product = input.product;
      saleType = input.saleType;
      quantity = input.quantity;
      amount = input.amount;
      recordDate = Time.now();
      saleDate = input.saleDate;
    };

    salesRecords.add(newId, record);
    newId;
  };

  public shared ({ caller }) func addSalesRecordsBatch(inputs : [SalesRecordInput]) : async [Nat] {
    let idsArray = Array.tabulate(
      inputs.size(),
      func(i) {
        let newId = nextRecordId + i;
        let input = inputs[i];

        let record : SalesRecord = {
          id = newId;
          employeeId = input.employeeId;
          fiplCode = input.fiplCode;
          brand = input.brand;
          product = input.product;
          saleType = input.saleType;
          quantity = input.quantity;
          amount = input.amount;
          recordDate = Time.now();
          saleDate = input.saleDate;
        };

        salesRecords.add(newId, record);
        newId;
      },
    );
    nextRecordId += inputs.size();
    idsArray;
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

  public shared ({ caller }) func updateEmployeePerformance(employeeId : EmployeeId, input : PerformanceInput) : async Bool {
    switch (performances.get(employeeId)) {
      case (null) { false };
      case (?_) {
        let updatedPerformance : Performance = {
          employeeId;
          salesInfluenceIndex = input.salesInfluenceIndex;
          reviewCount = input.reviewCount;
          operationalDiscipline = input.operationalDiscipline;
          productKnowledgeScore = input.productKnowledgeScore;
          softSkillsScore = input.softSkillsScore;
        };
        performances.add(employeeId, updatedPerformance);
        true;
      };
    };
  };

  public shared ({ caller }) func updateEmployeeSWOT(employeeId : EmployeeId, swotInput : SWOTInput) : async Bool {
    switch (swots.get(employeeId)) {
      case (null) { false };
      case (?_) {
        let updatedSWOT : SWOT = {
          employeeId;
          strengths = swotInput.strengths;
          weaknesses = swotInput.weaknesses;
          opportunities = swotInput.opportunities;
          threats = swotInput.threats;
        };
        swots.add(employeeId, updatedSWOT);
        true;
      };
    };
  };

  public shared ({ caller }) func addTrait(employeeId : EmployeeId, trait : Text) : async Bool {
    switch (traits.get(employeeId)) {
      case (null) { false };
      case (?existingTraits) {
        let newTraits = existingTraits.concat([trait]);
        traits.add(employeeId, newTraits);
        true;
      };
    };
  };

  public shared ({ caller }) func addProblem(employeeId : EmployeeId, problem : Text) : async Bool {
    switch (problems.get(employeeId)) {
      case (null) { false };
      case (?existingProblems) {
        let newProblems = existingProblems.concat([problem]);
        problems.add(employeeId, newProblems);
        true;
      };
    };
  };

  // Batch Operation Functions

  public shared ({ caller }) func upsertEmployeesBatch(inputs : [EmployeeFullInput]) : async [(Text, EmployeeId)] {
    let resultArray = Array.tabulate(
      inputs.size(),
      func(i) {
        let input = inputs[i];
        let fiplCode = input.employeeInfo.fiplCode;
        var employeeId : EmployeeId = 0;

        switch (findEmployeeIdByFiplCode(fiplCode)) {
          case (?id) {
            employeeId := id;
            let employee : Employee = {
              id = employeeId;
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
            employees.add(employeeId, employee);
          };
          case (null) {
            employeeId := nextEmployeeId;
            nextEmployeeId += 1;
            let employee : Employee = {
              id = employeeId;
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
              employeeId = employeeId;
              salesInfluenceIndex = input.performance.salesInfluenceIndex;
              reviewCount = input.performance.reviewCount;
              operationalDiscipline = input.performance.operationalDiscipline;
              productKnowledgeScore = input.performance.productKnowledgeScore;
              softSkillsScore = input.performance.softSkillsScore;
            };

            let swot : SWOT = {
              employeeId = employeeId;
              strengths = input.swotAnalysis.strengths;
              weaknesses = input.swotAnalysis.weaknesses;
              opportunities = input.swotAnalysis.opportunities;
              threats = input.swotAnalysis.threats;
            };

            employees.add(employeeId, employee);
            performances.add(employeeId, performance);
            swots.add(employeeId, swot);
            traits.add(employeeId, input.traits);
            problems.add(employeeId, input.problems);
          };
        };
        (fiplCode, employeeId);
      },
    );
    resultArray;
  };

  public shared ({ caller }) func updatePerformanceBatch(inputs : [(Text, PerformanceInput)]) : async Nat {
    var count = 0;
    for ((fiplCode, perfInput) in inputs.values()) {
      switch (findEmployeeIdByFiplCode(fiplCode)) {
        case (?employeeId) {
          let performance : Performance = {
            employeeId;
            salesInfluenceIndex = perfInput.salesInfluenceIndex;
            reviewCount = perfInput.reviewCount;
            operationalDiscipline = perfInput.operationalDiscipline;
            productKnowledgeScore = perfInput.productKnowledgeScore;
            softSkillsScore = perfInput.softSkillsScore;
          };
          performances.add(employeeId, performance);
          count += 1;
        };
        case (null) {};
      };
    };
    count;
  };

  public shared ({ caller }) func addAttendanceRecordsBatch(inputs : [AttendanceRecordInput]) : async [Nat] {
    let idsArray = Array.tabulate(
      inputs.size(),
      func(i) {
        let newId = nextAttendanceId + i;
        let input = inputs[i];

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
      },
    );
    nextAttendanceId += inputs.size();
    idsArray;
  };

  public shared ({ caller }) func updateSwotBatch(inputs : [SwotBatchInput]) : async Nat {
    var count = 0;
    for (input in inputs.values()) {
      switch (findEmployeeIdByFiplCode(input.fiplCode)) {
        case (?employeeId) {
          let swot : SWOT = {
            employeeId;
            strengths = input.swot.strengths;
            weaknesses = input.swot.weaknesses;
            opportunities = input.swot.opportunities;
            threats = input.swot.threats;
          };
          swots.add(employeeId, swot);
          traits.add(employeeId, input.traits);
          problems.add(employeeId, input.problems);
          count += 1;
        };
        case (null) {};
      };
    };
    count;
  };

  // New Clear Functions

  public shared ({ caller }) func clearAllEmployees() : async Bool {
    employees.clear();
    performances.clear();
    swots.clear();
    traits.clear();
    problems.clear();
    feedback.clear();
    nextEmployeeId := 1;
    nextFeedbackId := 1;
    true;
  };

  public shared ({ caller }) func clearAllSalesRecords() : async Bool {
    salesRecords.clear();
    nextRecordId := 1;
    true;
  };

  public shared ({ caller }) func clearAllAttendance() : async Bool {
    attendanceRecords.clear();
    nextAttendanceId := 1;
    true;
  };

  public shared ({ caller }) func clearAllFeedback() : async Bool {
    feedback.clear();
    nextFeedbackId := 1;
    true;
  };

  public shared ({ caller }) func clearAllIssues() : async Bool {
    issues.clear();
    nextIssueId := 1;
    true;
  };

  public shared ({ caller }) func clearAllTopPerformers() : async Bool {
    topPerformers.clear();
    true;
  };

  public shared ({ caller }) func clearAllData() : async Bool {
    employees.clear();
    performances.clear();
    swots.clear();
    traits.clear();
    problems.clear();
    feedback.clear();
    salesRecords.clear();
    attendanceRecords.clear();
    issues.clear();
    topPerformers.clear();

    callingRecords.clear();
    customerReviews.clear();

    nextEmployeeId := 1;
    nextFeedbackId := 1;
    nextRecordId := 1;
    nextAttendanceId := 1;
    nextIssueId := 1;
    nextCallingRecordId := 1;
    nextReviewId := 1;
    true;
  };

  // Calling Record Functions
  public query ({ caller }) func getAllCallingRecords() : async [CallingRecord] {
    callingRecords.values().toArray();
  };

  public shared ({ caller }) func addCallingRecord(input : CallingRecordInput) : async Nat {
    let newId = nextCallingRecordId;
    nextCallingRecordId += 1;
    let currentTime = Time.now();

    let record : CallingRecord = {
      id = newId;
      fiplCode = input.fiplCode;
      fseName = input.fseName;
      customerName = input.customerName;
      date = input.date;
      callDuration = input.callDuration;
      outcome = input.outcome;
      notes = input.notes;
      createdAt = currentTime;
    };

    callingRecords.add(newId, record);
    newId;
  };

  public shared ({ caller }) func addCallingRecordsBatch(inputs : [CallingRecordInput]) : async [Nat] {
    let idsArray = Array.tabulate(
      inputs.size(),
      func(i) {
        let newId = nextCallingRecordId + i;
        let input = inputs[i];
        let currentTime = Time.now();

        let record : CallingRecord = {
          id = newId;
          fiplCode = input.fiplCode;
          fseName = input.fseName;
          customerName = input.customerName;
          date = input.date;
          callDuration = input.callDuration;
          outcome = input.outcome;
          notes = input.notes;
          createdAt = currentTime;
        };

        callingRecords.add(newId, record);
        newId;
      },
    );
    nextCallingRecordId += inputs.size();
    idsArray;
  };

  public shared ({ caller }) func clearAllCallingRecords() : async Bool {
    callingRecords.clear();
    nextCallingRecordId := 1;
    true;
  };

  // Customer Review Functions
  public query ({ caller }) func getAllCustomerReviews() : async [CustomerReview] {
    customerReviews.values().toArray();
  };

  public shared ({ caller }) func addCustomerReview(input : CustomerReviewInput) : async Nat {
    let newId = nextReviewId;
    nextReviewId += 1;
    let currentTime = Time.now();

    let review : CustomerReview = {
      id = newId;
      fiplCode = input.fiplCode;
      fseName = input.fseName;
      reviewerName = input.reviewerName;
      rating = input.rating;
      reviewText = input.reviewText;
      date = input.date;
      createdAt = currentTime;
    };

    customerReviews.add(newId, review);
    newId;
  };

  public shared ({ caller }) func deleteCustomerReview(id : Nat) : async Bool {
    let existed = customerReviews.containsKey(id);
    customerReviews.remove(id);
    existed;
  };

  public shared ({ caller }) func clearAllCustomerReviews() : async Bool {
    customerReviews.clear();
    nextReviewId := 1;
    true;
  };

  // Helper Functions

  func findEmployeeIdByFiplCode(fiplCode : Text) : ?EmployeeId {
    for ((id, empData) in employees.entries()) {
      if (empData.fiplCode == fiplCode) {
        return ?id;
      };
    };
    null;
  };
};
