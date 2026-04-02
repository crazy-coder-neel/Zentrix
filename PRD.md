# Product Requirements Document (PRD)

## Product Name

Episteme — Algebra Misconception Root-Cause Engine

---

## 1. Overview

Episteme is a deterministic intelligent tutoring system that diagnoses the root cause of student errors in algebra using structured reasoning (Fault Trees, DAGs, scoring models) and provides targeted remediation.

The system focuses on **why a student is wrong**, not just whether they are wrong.

---

## 2. Objectives

* Diagnose algebra misconceptions with high precision
* Map errors to root conceptual gaps
* Provide deterministic, explainable remediation
* Track mastery and confidence over time
* Demonstrate intelligence without LLMs

---

## 3. Scope

### In Scope

* Algebra topics (Factorization, Quadratics, Identities, Functions)
* Fault Tree-based error diagnosis
* Knowledge Graph (DAG)
* Mastery scoring
* Confidence tracking (Brier Score)
* Behavior Tree remediation
* Explainability engine

### Out of Scope

* Natural language explanations via LLMs
* Multi-subject expansion
* Social or collaborative features

---

## 4. Target Users

* Students (high school / early college)
* Teachers (optional dashboard)

---

## 5. Core Concepts & Data Models

### 5.1 Concept Node

```
{
  id: string,
  name: string,
  prerequisites: string[],
  mastery_score: number (0–100)
}
```

### 5.2 Question Model

```
{
  id: string,
  concept_id: string,
  difficulty: number,
  correct_answer: string,
  distractors: [
    {
      option: string,
      error_tag: string
    }
  ],
  fault_tree: FaultTree
}
```

### 5.3 Fault Tree

```
{
  type: "AND" | "OR" | "LEAF",
  condition?: string,
  children?: FaultTree[]
}
```

### 5.4 Misconception Model

```
{
  id: string,
  description: string,
  concept_id: string
}
```

### 5.5 Student State

```
{
  mastery: { [concept_id]: number },
  ability_theta: number,
  confidence_history: number[],
  error_history: [
    {
      question_id: string,
      misconception_id: string,
      timestamp: number
    }
  ]
}
```

---

## 6. System Components

### 6.1 Error Classifier

Input:

* Selected answer
* Time taken

Output:

* slip | lapse | mistake

Rules:

* Fast incorrect → slip
* Slow incorrect → mistake
* Repeated same error → misconception

---

### 6.2 Fault Tree Engine

Function:

* Traverse tree
* Evaluate conditions
* Return Minimal Cut Set (root causes)

Pseudo:

```
function evaluate(node):
  if LEAF → return condition
  if AND → return intersection(children)
  if OR → return minimal(children)
```

---

### 6.3 Knowledge Graph (DAG)

Representation:

* Adjacency list

Operations:

* Forward traversal (learning path)
* Reverse BFS (blame propagation)

---

### 6.4 Blame Propagation

Algorithm:

```
queue ← root misconception node
while queue not empty:
  propagate weight * decay_factor
  update parent nodes
```

Scoring:

```
priority = blame_weight × (1 - mastery) × dependency_count
```

---

### 6.5 Mastery Model

Formula:

```
mastery = 0.5 * test_accuracy + 0.3 * practice_accuracy + 0.2 * retention
```

Thresholds:

* <60 → weak
* 60–80 → improving
* > 80 → strong

---

### 6.6 Ability Estimation (IRT)

Model:

* 3PL model

Update:

* Newton-Raphson method

---

### 6.7 Confidence Calibration

Brier Score:

```
BS = (confidence - outcome)^2
```

Tracking:

* Rolling average

---

### 6.8 Behavior Tree Engine

Structure:

* Selector + Sequences

Actions:

* Contrast Case
* Prerequisite Drill
* Retry Question
* Next Topic

---

### 6.9 Revision Scheduler

Intervals:

* 1, 3, 7, 14, 30 days

Data Structure:

* Priority Queue

---

### 6.10 Explainability Engine

Outputs:

* Fault Tree trace
* Blame propagation path
* Mastery reasoning
* Behavior Tree decision

---

## 7. User Flow

1. Student answers question
2. System classifies error
3. Fault Tree identifies root cause
4. Misconception mapped to concept
5. Blame propagated in DAG
6. Mastery updated
7. Confidence updated
8. Behavior Tree selects action
9. Scheduler updates revision
10. Explanation displayed

---

## 8. UI Requirements

### Student View

* Question interface
* Confidence input slider
* Result + explanation panel
* Learning graph (optional)

### Debug / Judge View

* Fault Tree visualization
* Decision trace panel
* Concept graph heatmap

---

## 9. Non-Functional Requirements

* Deterministic outputs
* Low latency (<200ms per decision)
* Modular architecture
* No external AI APIs

---

## 10. Tech Stack (Suggested)

* Backend: Python / Node.js
* Graph: NetworkX or custom
* State: JSON / in-memory
* Frontend: React

---

## 11. MVP Scope

* 15–20 concepts
* 40–60 questions
* Fault trees for each question
* Basic DAG
* Behavior Tree with 3–4 actions

---

## 12. Success Metrics

* Correct diagnosis rate
* Reduction in repeated errors
* Mastery improvement
* User engagement

---

## 13. Future Enhancements

* Multi-subject expansion
* Teacher analytics dashboard
* Personalized study plans
* Simulation engine

---

## 14. One-Line Pitch

A deterministic AI system that diagnoses why students make mistakes in algebra and fixes the root cause using structured reasoning.
