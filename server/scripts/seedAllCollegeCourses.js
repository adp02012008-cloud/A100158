import dotenv from "dotenv";
import { connectDB, disconnectDB } from "../config/db.js";
import { Course } from "../models/Course.js";
import { CoursePointRule } from "../models/CoursePointRule.js";

dotenv.config();

// Full dataset parsed directly from student's college portal
const ALL_COURSES = [
  // ==========================================
  // SOFTWARE (14 courses)
  // ==========================================
  {
    name: "C Programming",
    category: "Software",
    description: "Core C programming covering syntax, control structures, pointers, memory management, and data types.",
    clusterAccess: "Both",
    levels: [
      {
        levelNumber: 1,
        levelName: "C Programming Level - 1",
        rewardPoints: 300,
        prerequisites: "None",
        assessmentType: "Programming",
        topics: ["1. Variables", "2. Operators", "3. Conditional Statements"],
      },
      {
        levelNumber: 2,
        levelName: "C Programming Level - 2",
        rewardPoints: 600,
        prerequisites: "C Programming Level - 1",
        assessmentType: "Programming",
        topics: ["1. Looping Statements", "2. 'break' Statement", "3. 'continue' Statement"],
      },
      {
        levelNumber: 3,
        levelName: "C Programming Level - 3A",
        rewardPoints: 900,
        prerequisites: "C Programming Level - 2",
        assessmentType: "Programming",
        topics: ["1. Arrays"],
      },
      {
        levelNumber: 4,
        levelName: "C Programming Level - 3B Written Test",
        rewardPoints: 900,
        prerequisites: "C Programming Level - 3A",
        assessmentType: "Programming",
        topics: ["1. Conditional Statements", "2. Loops, break and continue Statements", "3. Arrays"],
      },
      {
        levelNumber: 5,
        levelName: "C Programming Level - 4",
        rewardPoints: 900,
        prerequisites: "C Programming Level - 3B Written Test",
        assessmentType: "Programming",
        topics: ["1. String and its operations"],
      },
      {
        levelNumber: 6,
        levelName: "C Programming Level - 5",
        rewardPoints: 900,
        prerequisites: "C Programming Level - 4",
        assessmentType: "Programming",
        topics: ["1. Functions", "2. Recursive functions"],
      },
      {
        levelNumber: 7,
        levelName: "C Programming Level - 6",
        rewardPoints: 900,
        prerequisites: "C Programming Level - 5",
        assessmentType: "Programming",
        topics: ["1. Structures, enum, unions", "2. Pointers"],
      },
    ],
  },
  {
    name: "Cloud Infrastructure",
    category: "Software",
    description: "Cloud computing services, architecture design, auto scaling, serverless, VPC, and modern DevOps.",
    clusterAccess: "Both",
    levels: [
      {
        levelNumber: 1,
        levelName: "Cloud Infrastructure - Level 1",
        rewardPoints: 300,
        prerequisites: "Computer Networking - Level 2, Linux Level - 2",
        assessmentType: "Manual Grading",
        topics: ["1. Cloud services", "2. EC2, S3, VPC"],
      },
      {
        levelNumber: 2,
        levelName: "Cloud Infrastructure - Level 2",
        rewardPoints: 300,
        prerequisites: "Cloud Infrastructure - Level 1",
        assessmentType: "Manual Grading",
        topics: ["1. Databases", "2. Auto Scaling and IAM"],
      },
      {
        levelNumber: 3,
        levelName: "Cloud Infrastructure - Level 2A",
        rewardPoints: 500,
        prerequisites: "Cloud Infrastructure - Level 2",
        assessmentType: "Manual Grading",
        topics: ["1. Auto Scaling", "2. Load Balancing", "3. Serverless functions"],
      },
      {
        levelNumber: 4,
        levelName: "Cloud Infrastructure - Level 2B",
        rewardPoints: 500,
        prerequisites: "Cloud Infrastructure - Level 2A",
        assessmentType: "Manual Grading",
        topics: ["1. Network Address Translation", "2. IAM", "3. Cost Optimization"],
      },
      {
        levelNumber: 5,
        levelName: "Cloud Infrastructure - Level 2C",
        rewardPoints: 500,
        prerequisites: "Cloud Infrastructure - Level 2B",
        assessmentType: "Manual Grading",
        topics: ["1. Orchestration"],
      },
      {
        levelNumber: 6,
        levelName: "Cloud Infrastructure - Level 3",
        rewardPoints: 800,
        prerequisites: "Cloud Infrastructure - Level 2C",
        assessmentType: "Manual Grading",
        topics: ["1. Architecture Design, Devops"],
      },
    ],
  },
  {
    name: "Computer Networking",
    category: "Software",
    description: "Networking fundamentals, IP classes, subnetting, CIDR, VLANs, routing protocols, and network configuration.",
    clusterAccess: "Both",
    levels: [
      {
        levelNumber: 1,
        levelName: "Computer Networking - Level 1 Training",
        rewardPoints: 100,
        prerequisites: "None",
        assessmentType: "Manual Grading",
        topics: [
          "1. IP Address and its Classes",
          "2. Simple LAN configuration(PCs with Network Switch)",
          "3. Subnetting & Classless Addressing (CIDR)",
          "4. Cabling & Crimping",
        ],
      },
      {
        levelNumber: 2,
        levelName: "Computer Networking - Level 2 Training",
        rewardPoints: 200,
        prerequisites: "Computer Networking - Level 1 Training",
        assessmentType: "Manual Grading",
        topics: [
          "1. IP Address and its Classes",
          "2. Simple LAN configuration(PCs with Network Switch)",
          "3. Subnetting & Classless Addressing (CIDR)",
          "4. Cabling & Crimping",
        ],
      },
      {
        levelNumber: 3,
        levelName: "Computer Networking - Level 1",
        rewardPoints: 300,
        prerequisites: "None",
        assessmentType: "Manual Grading",
        topics: [
          "1. IP Addressing",
          "2. IP classes",
          "3. LAN (2 PCs with 1 Network Switch)",
          "4. Subnetting",
          "5. Classless Addressing (CIDR)",
          "6. Cabling",
          "7. Crimping",
        ],
      },
      {
        levelNumber: 4,
        levelName: "Computer Networking - Level 2",
        rewardPoints: 300,
        prerequisites: "Computer Networking - Level 1",
        assessmentType: "Manual Grading",
        topics: [
          "1. VLAN, Types of VLAN",
          "2. VLAN Configuration",
          "3. Switch Configuration Commands",
          "4. MAC Address Table",
          "5. Access and Trunk ports",
          "6. Spanning Tree Protocol",
          "7. LLDP, BPDU guard",
        ],
      },
      {
        levelNumber: 5,
        levelName: "Computer Networking - Level 3",
        rewardPoints: 600,
        prerequisites: "Computer Networking - Level 2",
        assessmentType: "Manual Grading",
        topics: [
          "1. Routing protocols (Static, Dynamic)",
          "2. Inter-VLAN Routing, Routing Tables",
          "3. Port Forwarding",
          "4. Routing Metrics",
        ],
      },
      {
        levelNumber: 6,
        levelName: "Computer Networking - Level 4",
        rewardPoints: 600,
        prerequisites: "Computer Networking - Level 3",
        assessmentType: "Manual Grading",
        topics: ["1. DHCP, DNS, FTP, NAT"],
      },
    ],
  },
  {
    name: "Creative Media",
    category: "Software",
    description: "Visual communication, graphic design, hand sketching, and creative digital media representation.",
    clusterAccess: "Both",
    levels: [
      {
        levelNumber: 1,
        levelName: "Creative Media Entrance Test",
        rewardPoints: 100,
        prerequisites: "None",
        assessmentType: "Manual Grading",
        topics: ["1. You are expected to hand-sketch a given object."],
      },
    ],
  },
  {
    name: "Data Science",
    category: "Software",
    description: "Data exploration, cleaning, statistical analysis, EDA with Tableau, web scraping, and end-to-end ML workflows.",
    clusterAccess: "Both",
    levels: [
      {
        levelNumber: 0,
        levelName: "Data Science Level 0",
        rewardPoints: 100,
        prerequisites: "None",
        assessmentType: "MCQ",
        topics: [
          "1. Data Acquisition and Data Preprocessing",
          "2. Exploratory Data Analysis",
          "3. Correlation analysis",
          "4. EDA using Tableau",
          "5. SQL for Data Science",
          "6. End to End Data Analytics Project",
        ],
      },
      {
        levelNumber: 1,
        levelName: "Data Science - Level 1",
        rewardPoints: 300,
        prerequisites: "Programming Python Level - 3",
        assessmentType: "Programming",
        topics: ["1. Data Loading", "2. Data Exploration"],
      },
      {
        levelNumber: 2,
        levelName: "Data Science - Level 2",
        rewardPoints: 400,
        prerequisites: "Data Science - Level 1",
        assessmentType: "Programming",
        topics: [
          "1. Handling missing values (drop, fill, interpolate)",
          "2. Identifying and removing duplicate records",
          "3. Detecting and treating outliers (IQR, Z-Score)",
          "4. Webscraping",
        ],
      },
    ],
  },
  {
    name: "Data Structure",
    category: "Software",
    description: "In-depth study of algorithms, linear and non-linear data structures, trees, graphs, heaps, hashing, and tries.",
    clusterAccess: "Both",
    levels: [
      {
        levelNumber: 1,
        levelName: "Data Structure - 1",
        rewardPoints: 600,
        prerequisites: "None",
        assessmentType: "Programming",
        topics: ["1. Arrays - Sorting Searching", "2. linear, binary Dynamic Arrays Multidimensional Arrays"],
      },
      {
        levelNumber: 2,
        levelName: "Data Structure - 2",
        rewardPoints: 600,
        prerequisites: "Data Structure - 1",
        assessmentType: "Programming",
        topics: [
          "1. Stack - Stack Operations Infix, Postfix, and Prefix Expressions",
          "2. Stack-based Memory Management Parentheses Matching",
          "3. Queue - Queue Operations, Queue types. Blocking and Non-blocking Queues Queue Design Patterns",
        ],
      },
      {
        levelNumber: 3,
        levelName: "Data Structure - 3",
        rewardPoints: 900,
        prerequisites: "Data Structure - 2",
        assessmentType: "Programming",
        topics: ["1. Linked List - Singly Linked List", "2. Circular Linked List Doubly Linked List"],
      },
      {
        levelNumber: 4,
        levelName: "Data Structure - 4",
        rewardPoints: 900,
        prerequisites: "Data Structure - 3",
        assessmentType: "Programming",
        topics: ["1. Binary Tree", "2. Binary Tree Traversals, Insert, Delete Balanced Binary Trees"],
      },
      {
        levelNumber: 5,
        levelName: "Data Structure - 5",
        rewardPoints: 900,
        prerequisites: "Data Structure - 4",
        assessmentType: "Programming",
        topics: ["1. Graph - Breadth First Traversal for a Graph", "2. Depth First Traversal for a Graph"],
      },
      {
        levelNumber: 6,
        levelName: "Data Structure - 6",
        rewardPoints: 900,
        prerequisites: "Data Structure - 5",
        assessmentType: "Programming",
        topics: ["1. Binary Search Tree - Sorting, search", "2. BST Operations", "3. BST Traversals", "4. AVL trees, Red-black Trees"],
      },
      {
        levelNumber: 7,
        levelName: "Data Structure - 7",
        rewardPoints: 900,
        prerequisites: "Data Structure - 6",
        assessmentType: "Programming",
        topics: ["1. Graph - Dijkstra's Algorithm", "2. Krushkal's Algorithm", "3. Prim's Algorithm, MST"],
      },
      {
        levelNumber: 8,
        levelName: "Data Structure - 8",
        rewardPoints: 900,
        prerequisites: "Data Structure - 7",
        assessmentType: "Programming",
        topics: ["1. Heap - Heap Sort", "2. Binomial Heap", "3. Fibonacci Heap", "4. Binary Heap"],
      },
      {
        levelNumber: 9,
        levelName: "Data Structure - 9",
        rewardPoints: 900,
        prerequisites: "Data Structure - 8",
        assessmentType: "Programming",
        topics: [
          "1. Hashing - Collision Resolution Strategies",
          "2. Load Balancing in Hash Tables",
          "3. Hashing for String Matching",
          "4. Universal Hashing",
          "5. Cuckoo Hashing",
        ],
      },
      {
        levelNumber: 10,
        levelName: "Data Structure - 10",
        rewardPoints: 900,
        prerequisites: "Data Structure - 9",
        assessmentType: "Programming",
        topics: ["1. Trie Data structure - Ternary Search Tries", "2. Compressed Tries", "3. Compact Tries", "4. Multiway Tries"],
      },
      {
        levelNumber: 11,
        levelName: "Data Structure - 11",
        rewardPoints: 1000,
        prerequisites: "Data Structure - 10",
        assessmentType: "Programming",
        topics: ["1. Advanced Graph Algorithms & Competitive Coding Problems"],
      },
    ],
  },
  {
    name: "Data Visualization",
    category: "Software",
    description: "Statistical analysis in Excel, PivotTables, formula auditing, What-If analysis, charts and graphical presentation.",
    clusterAccess: "Both",
    levels: [
      {
        levelNumber: 0,
        levelName: "Data Visualization - Level 0",
        rewardPoints: 100,
        prerequisites: "None",
        assessmentType: "Manual Grading",
        topics: ["1. Statistical expertise in Excel. Data Interpretation from excel data and charts."],
      },
      {
        levelNumber: 1,
        levelName: "Data Visualization(New) - Level 0",
        rewardPoints: 150,
        prerequisites: "None",
        assessmentType: "MCQ",
        topics: [
          "1. Workbook & Data Handling",
          "2. Formatting & References",
          "3. Sorting, Filtering & Validation",
          "4. Logical Functions, Text Functions, Date Functions",
          "5. Lookup Functions, Statistical & Counting Functions",
          "6. Error Handling & Array Formulas, Formula Auditing",
          "7. PivotTables & PivotCharts, Conditional Formatting",
          "8. What-If Analysis, External Links & Optimization",
        ],
      },
      {
        levelNumber: 2,
        levelName: "Data Visualization(New) - Level 1",
        rewardPoints: 300,
        prerequisites: "None",
        assessmentType: "Manual Grading",
        topics: ["1. Excel Basic Functions", "2. Business Dashboards & Reporting"],
      },
    ],
  },
  {
    name: "Database Programming",
    category: "Software",
    description: "Relational database concepts, SQL queries, DDL, DML, joins, subqueries, stored procedures, and index optimization.",
    clusterAccess: "Both",
    levels: [
      {
        levelNumber: 1,
        levelName: "Database Programming Level - 1",
        rewardPoints: 300,
        prerequisites: "None",
        assessmentType: "Programming",
        topics: ["1. Data Types, DDL and DML commands", "2. Constraints - Primary Key", "3. Clauses - from, where, distinct"],
      },
      {
        levelNumber: 2,
        levelName: "Database Programming Level - 2",
        rewardPoints: 300,
        prerequisites: "Database Programming Level - 1",
        assessmentType: "Programming",
        topics: [
          "1. Constraints: SQL NOT NULL, UNIQUE, Primary Key, Foreign Key, CHECK, DEFAULT",
          "2. Operators: Arithmetic (+,-,*,/, %), Comparison, Logical (AND, OR, NOT), LIMIT, LIKE, AS, ORDER BY",
        ],
      },
      {
        levelNumber: 3,
        levelName: "Database Programming Level - 3",
        rewardPoints: 300,
        prerequisites: "Database Programming Level - 2",
        assessmentType: "Programming",
        topics: ["1. Aggregation functions", "2. Group by clause", "3. Having Clause"],
      },
      {
        levelNumber: 4,
        levelName: "Database Programming Level - 4",
        rewardPoints: 400,
        prerequisites: "Database Programming Level - 3",
        assessmentType: "Programming",
        topics: ["1. Join Operations (INNER, LEFT, RIGHT, FULL)"],
      },
      {
        levelNumber: 5,
        levelName: "Database Programming Level - 5",
        rewardPoints: 500,
        prerequisites: "Database Programming Level - 4",
        assessmentType: "Programming",
        topics: ["1. String Functions", "2. Sub Queries", "3. Views and index"],
      },
      {
        levelNumber: 6,
        levelName: "Database Programming Level - 6",
        rewardPoints: 600,
        prerequisites: "Database Programming Level - 5",
        assessmentType: "Programming",
        topics: ["1. Functions", "2. Stored procedures and triggers", "3. Exception Handling"],
      },
      {
        levelNumber: 7,
        levelName: "Database Programming Level - 7",
        rewardPoints: 700,
        prerequisites: "None",
        assessmentType: "Programming",
        topics: ["1. Optimization Techniques (Normalization, Locking, Query Tuning)"],
      },
    ],
  },
  {
    name: "HTML / CSS",
    category: "Software",
    description: "Modern semantic markup, responsive design, CSS Flexbox, Grid, forms, and HTML5 features.",
    clusterAccess: "Both",
    levels: [
      {
        levelNumber: 1,
        levelName: "HTML / CSS - Level 1",
        rewardPoints: 300,
        prerequisites: "None",
        assessmentType: "MCQ + Manual Grading",
        topics: [
          "1. Core Structure",
          "2. Semantic HTML",
          "3. Text & Media Content",
          "4. Links & Navigation",
          "5. Forms & Input Handling",
          "6. Tables & Data Display",
          "7. Embedding & Scripting",
          "8. HTML5 Features",
        ],
      },
    ],
  },
  {
    name: "Linux",
    category: "Software",
    description: "Kickstart your journey into DevOps with foundational skills to build, manage, and optimize modern development workflows.",
    clusterAccess: "Both",
    levels: [
      {
        levelNumber: 0,
        levelName: "Linux Level - 0",
        rewardPoints: 100,
        prerequisites: "None",
        assessmentType: "MCQ",
        topics: ["1. Basic Linux commands", "2. Operating systems", "3. Networking Fundamentals", "4. Devops Introduction"],
      },
      {
        levelNumber: 1,
        levelName: "Linux Level - 1",
        rewardPoints: 300,
        prerequisites: "None",
        assessmentType: "Manual Grading",
        topics: ["1. Working with files", "2. User Management"],
      },
      {
        levelNumber: 2,
        levelName: "Linux Level - 2",
        rewardPoints: 300,
        prerequisites: "Linux Level - 1",
        assessmentType: "Manual Grading",
        topics: ["1. File Management", "2. System Management"],
      },
      {
        levelNumber: 3,
        levelName: "Linux Level -1 Training",
        rewardPoints: 200,
        prerequisites: "None",
        assessmentType: "Training",
        topics: ["1. Shell scripting and environment configuration"],
      },
      {
        levelNumber: 4,
        levelName: "Linux Level - 3",
        rewardPoints: 300,
        prerequisites: "Linux Level - 2",
        assessmentType: "Manual Grading",
        topics: ["1. Process Management", "2. Network Management"],
      },
    ],
  },
  {
    name: "Programming C++",
    category: "Software",
    description: "High-performance object-oriented programming in C++, STL, memory management, pointers, and file I/O.",
    clusterAccess: "Both",
    levels: [
      {
        levelNumber: 1,
        levelName: "Programming C++ Level - 1",
        rewardPoints: 300,
        prerequisites: "None",
        assessmentType: "Programming",
        topics: ["1. Basics - Variables", "2. User Input", "3. Data Types, Operators, Conditions"],
      },
      {
        levelNumber: 2,
        levelName: "Programming C++ - Level 2",
        rewardPoints: 600,
        prerequisites: "Programming C++ Level - 1",
        assessmentType: "Programming",
        topics: ["1. Control flow statements", "2. while loop, for loop, do-while loop", "3. break/continue, Boolean, Switch case"],
      },
      {
        levelNumber: 3,
        levelName: "Programming C++ - Level 3",
        rewardPoints: 900,
        prerequisites: "Programming C++ - Level 2",
        assessmentType: "Programming",
        topics: ["1. Arrays", "2. Strings"],
      },
      {
        levelNumber: 4,
        levelName: "Programming C++ - Level 4",
        rewardPoints: 900,
        prerequisites: "Programming C++ - Level 3",
        assessmentType: "Programming",
        topics: ["1. Functions and Recursion"],
      },
      {
        levelNumber: 5,
        levelName: "Programming C++ - Level 5",
        rewardPoints: 900,
        prerequisites: "Programming C++ - Level 4",
        assessmentType: "Programming",
        topics: ["1. Pointers and References"],
      },
      {
        levelNumber: 6,
        levelName: "Programming C++ - Level 6",
        rewardPoints: 900,
        prerequisites: "Programming C++ - Level 5",
        assessmentType: "Programming",
        topics: ["1. Classes and Objects"],
      },
      {
        levelNumber: 7,
        levelName: "Programming C++ - Level 7",
        rewardPoints: 900,
        prerequisites: "Programming C++ - Level 6",
        assessmentType: "Programming",
        topics: ["1. File Handling: Reading and writing to files", "2. Basic and advanced file operations"],
      },
      {
        levelNumber: 8,
        levelName: "Programming C++ - Level 8",
        rewardPoints: 900,
        prerequisites: "Programming C++ - Level 7",
        assessmentType: "Programming",
        topics: ["1. Inheritance", "2. Overriding"],
      },
      {
        levelNumber: 9,
        levelName: "Programming C++ - Level 9",
        rewardPoints: 900,
        prerequisites: "Programming C++ - Level 8",
        assessmentType: "Programming",
        topics: ["1. Files reading and writing"],
      },
      {
        levelNumber: 10,
        levelName: "Programming C++ - Level 10",
        rewardPoints: 900,
        prerequisites: "Programming C++ - Level 9",
        assessmentType: "Programming",
        topics: ["1. Exception handling"],
      },
    ],
  },
  {
    name: "Programming Java",
    category: "Software",
    description: "Enterprise application development with Java, OOP principles, collections framework, inheritance, and exception handling.",
    clusterAccess: "Both",
    levels: [
      {
        levelNumber: 1,
        levelName: "Programming Java Level - 1",
        rewardPoints: 300,
        prerequisites: "None",
        assessmentType: "Programming",
        topics: ["1. Variables", "2. Data types", "3. Operators", "4. Conditional Statements"],
      },
      {
        levelNumber: 2,
        levelName: "Programming Java Level - 2",
        rewardPoints: 600,
        prerequisites: "Programming Java Level - 1",
        assessmentType: "Programming",
        topics: ["1. Type conversion", "2. Loops", "3. Arrays"],
      },
      {
        levelNumber: 3,
        levelName: "Programming Java Level - 3",
        rewardPoints: 900,
        prerequisites: "Programming Java Level - 2",
        assessmentType: "Programming",
        topics: [
          "1. Classes, Objects, Methods, Constructors, Access Modifiers",
          "2. Strings, string Methods, string buffer and string builder, final keyword",
        ],
      },
      {
        levelNumber: 4,
        levelName: "Programming Java Level - 4",
        rewardPoints: 900,
        prerequisites: "Programming Java Level - 3",
        assessmentType: "Programming",
        topics: [
          "1. Inheritance, Polymorphism (method overloading & method overriding)",
          "2. Abstraction (Abstract Keyword & Interface)",
        ],
      },
      {
        levelNumber: 5,
        levelName: "Programming Java Level - 5",
        rewardPoints: 900,
        prerequisites: "Programming Java Level - 4",
        assessmentType: "Programming",
        topics: [
          "1. Packages",
          "2. Exception Handling (common java exceptions)",
          "3. Try-catch-throw-throws keyword",
          "4. Finally block",
        ],
      },
    ],
  },
  {
    name: "Programming Python",
    category: "Software",
    description: "Python scripting, data structures, functional and OOP paradigms, string formatting, and exception handling.",
    clusterAccess: "Both",
    levels: [
      {
        levelNumber: 1,
        levelName: "Programming Python Level - 1",
        rewardPoints: 150,
        prerequisites: "None",
        assessmentType: "Programming",
        topics: ["1. Variables", "2. Operators", "3. Conditional Statements"],
      },
      {
        levelNumber: 2,
        levelName: "Programming Python Level - 2",
        rewardPoints: 300,
        prerequisites: "Programming Python Level - 1",
        assessmentType: "Programming",
        topics: ["1. Looping Statements", "2. Break and Continue statements"],
      },
      {
        levelNumber: 3,
        levelName: "Programming Python Level - 3",
        rewardPoints: 450,
        prerequisites: "Programming Python Level - 2",
        assessmentType: "Programming",
        topics: ["1. Tuples", "2. Sets", "3. Dictionaries", "4. String manipulation"],
      },
      {
        levelNumber: 4,
        levelName: "Programming Python Level - 4",
        rewardPoints: 600,
        prerequisites: "Programming Python Level - 3",
        assessmentType: "Programming",
        topics: ["1. Defining and calling functions", "2. Understanding parameters and return values", "3. Recursion"],
      },
      {
        levelNumber: 5,
        levelName: "Programming Python Level - 5",
        rewardPoints: 750,
        prerequisites: "Programming Python Level - 4",
        assessmentType: "Programming",
        topics: ["1. OOPS: Classes and objects", "2. Inheritance and polymorphism", "3. Basic class methods", "4. Encapsulation"],
      },
      {
        levelNumber: 6,
        levelName: "Programming Python Level - 6",
        rewardPoints: 900,
        prerequisites: "Programming Python Level - 5",
        assessmentType: "Manual Grading",
        topics: [
          "1. Exception Handling: Basic error handling with try-except",
          "2. Handling specific exceptions",
          "3. Raising exceptions",
        ],
      },
    ],
  },
  {
    name: "UI UX",
    category: "Software",
    description: "User experience design, Figma wireframing, component auto-layout, design systems, and responsive web design.",
    clusterAccess: "Both",
    levels: [
      {
        levelNumber: 1,
        levelName: "UI/UX Level -1",
        rewardPoints: 150,
        prerequisites: "None",
        assessmentType: "Manual Grading",
        topics: [
          "1. Frame Creation",
          "2. Shape Utilization",
          "3. Image Incorporation",
          "4. Stroke Application",
          "5. Color and Font Selection",
          "6. Effects Implementation",
          "7. Text Editor usage",
        ],
      },
      {
        levelNumber: 2,
        levelName: "UI/UX Level - 2",
        rewardPoints: 200,
        prerequisites: "UI/UX Level -1",
        assessmentType: "Manual Grading",
        topics: ["1. Introduction to Sketching Low-Fidelity Wireframing Principles Labeling and Annotations"],
      },
      {
        levelNumber: 3,
        levelName: "UI/UX Level - 3",
        rewardPoints: 250,
        prerequisites: "UI/UX Level - 2",
        assessmentType: "Manual Grading",
        topics: [
          "1. Components and Layout Mastery Focus on mastering components, auto-layout, and advanced layout techniques.",
          "2. Introduction to Components",
          "3. Designing Reusable Components Auto-Layout Fundamentals",
          "4. Advanced Grids & Layout Techniques Prototyping Basics Interactive Prototyping",
        ],
      },
      {
        levelNumber: 4,
        levelName: "UI/UX Level - 4",
        rewardPoints: 300,
        prerequisites: "UI/UX Level - 3",
        assessmentType: "Manual Grading",
        topics: [
          "1. Advanced Component Design",
          "2. Dynamic Layouts & Adaptive Design",
          "3. State-Based UI Design",
          "4. Microinteractions",
          "5. Component-Based Page Design",
          "6. Advanced Auto-Layout",
          "7. Advanced Grids & Layout Techniques",
          "8. Color, Alignment, Frame Creation, Shape, Effects",
        ],
      },
      {
        levelNumber: 5,
        levelName: "UI/UX Level - 5",
        rewardPoints: 350,
        prerequisites: "UI/UX Level - 4",
        assessmentType: "Manual Grading",
        topics: [
          "1. Layout Planning for Multi-Section Web Pages",
          "2. Web-First Design Thinking",
          "3. Advanced Auto-Layout & Responsive Web Design",
          "4. Grid Systems & Visual Hierarchy in Web Layouts",
        ],
      },
    ],
  },

  // ==========================================
  // HARDWARE (36 courses)
  // ==========================================
  { name: "Analog Electronics", category: "Hardware", levelsCount: 15 },
  { name: "Assembly and Dismantling - Gurugulam Assessment", category: "Hardware", levelsCount: 3 },
  { name: "Automation", category: "Hardware", levelsCount: 8 },
  { name: "Biochemical Stoichiometry & Biostatistics", category: "Hardware", levelsCount: 6 },
  { name: "Bioinformatics and Data Science", category: "Hardware", levelsCount: 8 },
  { name: "Bioinstrumentation", category: "Hardware", levelsCount: 6 },
  { name: "Biological Manuscript and Reference Management", category: "Hardware", levelsCount: 2 },
  { name: "Bioprocess Technology", category: "Hardware", levelsCount: 3 },
  { name: "Circuit Debugging", category: "Hardware", levelsCount: 8 },
  { name: "Construction Management", category: "Hardware", levelsCount: 4 },
  { name: "Construction materials", category: "Hardware", levelsCount: 10 },
  { name: "Culturing and Molecular Techniques", category: "Hardware", levelsCount: 5 },
  { name: "Digital Electronics", category: "Hardware", levelsCount: 16 },
  { name: "Electrical Skills - Common", category: "Hardware", levelsCount: 13 },
  { name: "Electrical Wiring - Gurugulam Assessment", category: "Hardware", levelsCount: 5 },
  { name: "Electronics - Gurugulam Assessment", category: "Hardware", levelsCount: 5 },
  { name: "Embedded Systems", category: "Hardware", levelsCount: 8 },
  { name: "Food chemistry and nutrition", category: "Hardware", levelsCount: 2 },
  { name: "Food laws, Quality Control and Packaging", category: "Hardware", levelsCount: 2 },
  { name: "Food Microbiology and Safety", category: "Hardware", levelsCount: 2 },
  { name: "Food Processing and Preservation Technology", category: "Hardware", levelsCount: 3 },
  { name: "Industrial Automation (Electrical)", category: "Hardware", levelsCount: 5 },
  { name: "Irrigation Engineering", category: "Hardware", levelsCount: 6 },
  { name: "Mechanical Measurement", category: "Hardware", levelsCount: 7 },
  { name: "Mechanical Modelling", category: "Hardware", levelsCount: 11 },
  { name: "PCB Design", category: "Hardware", levelsCount: 7 },
  { name: "PLC - Gurugulam Assessment", category: "Hardware", levelsCount: 5 },
  { name: "Post Harvest Skill", category: "Hardware", levelsCount: 3 },
  { name: "Power Electronics (Electrical)", category: "Hardware", levelsCount: 17 },
  { name: "Prototype - Gurugulam Assessment", category: "Hardware", levelsCount: 3 },
  { name: "Structural Engineering", category: "Hardware", levelsCount: 10 },
  { name: "Surveying", category: "Hardware", levelsCount: 3 },
  { name: "System Administration", category: "Hardware", levelsCount: 4 },
  { name: "Tissue Culturing", category: "Hardware", levelsCount: 4 },
  { name: "VLSI Design", category: "Hardware", levelsCount: 8 },
  { name: "Welding - Gurugulam Assessment", category: "Hardware", levelsCount: 4 },

  // ==========================================
  // GENERAL SKILL (13 courses)
  // ==========================================
  { name: "Algebra", category: "GENERAL Skill", levelsCount: 3 },
  { name: "Aptitude", category: "GENERAL Skill", levelsCount: 14 },
  { name: "Autonomy Affairs - Regulations", category: "GENERAL Skill", levelsCount: 1 },
  { name: "Communication", category: "GENERAL Skill", levelsCount: 3 },
  { name: "GP Challenge", category: "GENERAL Skill", levelsCount: 2 },
  { name: "IPR - Patent Search", category: "GENERAL Skill", levelsCount: 2 },
  { name: "Leadership", category: "GENERAL Skill", levelsCount: 4 },
  { name: "Logical Reasoning", category: "GENERAL Skill", levelsCount: 8 },
  { name: "Physical Fitness", category: "GENERAL Skill", levelsCount: 4 },
  { name: "Physical Fitness - Yoga", category: "GENERAL Skill", levelsCount: 2 },
  { name: "Problem Solving Skills - Daily Challenge", category: "GENERAL Skill", levelsCount: 1 },
  { name: "Problem Solving Skills - First Year", category: "GENERAL Skill", levelsCount: 1 },
  { name: "PS Assessment - Brainstorming (2025-2029)", category: "GENERAL Skill", levelsCount: 1 },

  // ==========================================
  // ADVANCED (4 courses)
  // ==========================================
  {
    name: "Advanced Modelling & Simulation",
    category: "Advanced",
    description: "Finite element analysis, mathematical modeling, thermal-structural simulation, and discretization techniques.",
    clusterAccess: "Both",
    levels: [
      {
        levelNumber: 0,
        levelName: "Advanced Modelling & Simulation - Level 0",
        rewardPoints: 100,
        prerequisites: "Mechanical Modelling Level - 2B (ADVANCED PART MODELLING)",
        assessmentType: "MCQ",
        topics: [
          "1. Introduction to FEA",
          "2. Mathematical Framework: The FEA Equation",
          "3. Discretization: Mesh, Elements, Nodes",
          "4. Types of Elements: 1D, 2D, 3D",
          "5. Stress, Strain, and Deformation",
          "6. Hooke's Law, Young's Modulus, Poisson's Ratio",
          "7. The Stress-Strain Curve: Elastic vs. Plastic",
          "8. Factor of Safety (FOS)",
        ],
      },
      {
        levelNumber: 1,
        levelName: "Advanced Modelling & Simulation - Level 1",
        rewardPoints: 300,
        prerequisites: "Advanced Modelling & Simulation - Level 0",
        assessmentType: "Manual Grading",
        topics: [
          "1. Introduction to Thermal-Structural Analysis",
          "2. Theoretical Foundations",
          "3. Material Properties and Their Significance",
          "4. Element Selection and Modeling Strategy",
          "5. Boundary Conditions – Theory and Application",
          "6. Loading Types and Application Methods",
          "7. Step-by-Step Problem Solving Methodology",
        ],
      },
    ],
  },
  { name: "NodeJS", category: "Advanced", levelsCount: 1 },
  { name: "React", category: "Advanced", levelsCount: 1 },
  { name: "Version control - Git, Github", category: "Advanced", levelsCount: 1 },

  // ==========================================
  // BEGINNER (23 courses)
  // ==========================================
  { name: "AI - Deep Learning", category: "Beginner", levelsCount: 2 },
  { name: "AI - Machine Learning", category: "Beginner", levelsCount: 2 },
  { name: "Backup", category: "Beginner", levelsCount: 2 },
  { name: "C Programming MCQ", category: "Beginner", levelsCount: 1 },
  { name: "Calculus", category: "Beginner", levelsCount: 1 },
  { name: "Code Debugging", category: "Beginner", levelsCount: 2 },
  { name: "Computational Thinking", category: "Beginner", levelsCount: 8 },
  { name: "CyberSecurity - Level 1", category: "Beginner", levelsCount: 1 },
  { name: "Data Structure - Core Conepts (PS-CSE)", category: "Beginner", levelsCount: 3 },
  { name: "DBMS - Core Concept (PS-CSE)", category: "Beginner", levelsCount: 3 },
  { name: "Differential Equations", category: "Beginner", levelsCount: 1 },
  { name: "GATE - BIO TECHNOLOGY", category: "Beginner", levelsCount: 16 },
  { name: "GATE -CS CLUSTER", category: "Beginner", levelsCount: 7 },
  { name: "Gate EEE", category: "Beginner", levelsCount: 6 },
  { name: "German Language", category: "Beginner", levelsCount: 2 },
  { name: "GP Challenge - July 2026", category: "Beginner", levelsCount: 1 },
  { name: "GP Challenge 2026", category: "Beginner", levelsCount: 1 },
  { name: "Java Script", category: "Beginner", levelsCount: 1 },
  { name: "Materials and Manufacturing", category: "Beginner", levelsCount: 3 },
  { name: "Project Based Learning - Night Slots", category: "Beginner", levelsCount: 1 },
  { name: "Storage", category: "Beginner", levelsCount: 2 },
  { name: "Student Counselling", category: "Beginner", levelsCount: 1 },
  { name: "YUKTI INNOVATION CHALLENGE - 2026", category: "Beginner", levelsCount: 3 },
];

function generateDefaultLevels(courseName, count) {
  const levels = [];
  for (let i = 0; i < count; i++) {
    const lvlNum = i === 0 && count > 2 ? 0 : i + 1;
    const isFirst = i === 0;
    levels.push({
      levelNumber: i,
      levelName: `Level ${lvlNum}`,
      rewardPoints: (i + 1) * 150,
      prerequisites: isFirst ? "None" : `Level ${i === 1 && count > 2 ? 0 : i}`,
      assessmentType: i % 2 === 0 ? "MCQ" : "Manual Grading",
      topics: [
        `1. Fundamental Concepts of ${courseName} (Level ${lvlNum})`,
        `2. Technical Frameworks and Practical Methodology`,
        `3. Comprehensive Evaluation and Exercises`,
      ],
    });
  }
  return levels;
}

async function runSeed() {
  try {
    console.log("Connecting to MongoDB Atlas...");
    await connectDB();
    console.log("Connected successfully.");

    let inserted = 0;
    let updated = 0;

    for (const item of ALL_COURSES) {
      const courseName = item.name.trim();
      const category = item.category || "General";
      const description = item.description || `Comprehensive multi-level curriculum for ${courseName}.`;
      const clusterAccess = item.clusterAccess || (category === "Hardware" ? "Core" : "Both");

      let levels = item.levels;
      if (!levels || levels.length === 0) {
        levels = generateDefaultLevels(courseName, item.levelsCount || 2);
      }

      // Check if course already exists
      let course = await Course.findOne({
        name: { $regex: new RegExp(`^${courseName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      });

      const courseId = course?.courseId || `CRS-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

      if (course) {
        course.category = category;
        course.description = description;
        course.clusterAccess = clusterAccess;
        course.levels = levels;
        course.status = "ACTIVE";
        await course.save();
        updated++;
      } else {
        course = await Course.create({
          courseId,
          name: courseName,
          category,
          description,
          clusterAccess,
          status: "ACTIVE",
          levels,
        });
        inserted++;
      }

      // Sync CoursePointRule
      const sanitizedLevelPoints = {};
      levels.forEach((lvl) => {
        const safeK = String(lvl.levelName).replace(/\.0\b/g, "").replace(/\./g, "-");
        sanitizedLevelPoints[safeK] = Number(lvl.rewardPoints) || 100;
      });

      await CoursePointRule.findOneAndUpdate(
        { courseId: course._id },
        {
          courseId: course._id,
          courseName: course.name,
          levelPoints: sanitizedLevelPoints,
          clusterAccess: course.clusterAccess,
        },
        { upsert: true, new: true }
      );
    }

    console.log(`\n🎉 SEED COMPLETED SUCCESSFULLY!`);
    console.log(`Total courses processed: ${inserted + updated} (${inserted} created, ${updated} updated)`);
    console.log(`Total database courses in MongoDB: ${await Course.countDocuments()}`);

    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
}

runSeed();
