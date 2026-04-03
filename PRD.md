# Product Requirements Document

## Episteme — Linear Algebra Misconception Root-Cause Engine

**Version:** 2.0  
**Domain:** High School / Early College Linear Algebra  
**Hackathon Track:** Domain 1 — Learning Systems  
**Tagline:** *A deterministic AI that diagnoses why students fail algebra — and fixes the root cause.*

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Core Philosophy](#2-core-philosophy)
3. [Domain Scope — Linear Algebra Topics](#3-domain-scope)
4. [System Architecture](#4-system-architecture)
5. [Data Models](#5-data-models)
6. [Feature 1 — Fault Tree Engine](#6-feature-1--fault-tree-engine)
7. [Feature 2 — Prerequisite DAG + Blame Backpropagation](#7-feature-2--prerequisite-dag--blame-backpropagation)
8. [Feature 3 — IRT Ability Estimation + Confidence Calibration](#8-feature-3--irt-ability-estimation--confidence-calibration)
9. [Feature 4 — Behavior Tree Remediation Sequencer](#9-feature-4--behavior-tree-remediation-sequencer)
10. [Explainability Engine](#10-explainability-engine)
11. [Spaced Repetition Scheduler](#11-spaced-repetition-scheduler)
12. [User Flow — End to End](#12-user-flow--end-to-end)
13. [UI Requirements](#13-ui-requirements)
14. [Build Guide](#14-build-guide)
15. [Content Authoring — Question Bank](#15-content-authoring--question-bank)
16. [MVP Scope](#16-mvp-scope)
17. [Non-Functional Requirements](#17-non-functional-requirements)
18. [Judging Rubric Mapping](#18-judging-rubric-mapping)

---

## 1. Product Overview

Episteme is a **deterministic intelligent tutoring system** for linear algebra. Every student interaction — answering a question, selecting a wrong option, rating their confidence — is processed through a stack of structured reasoning algorithms that identify *why* the student is wrong, *which upstream concept* is the real gap, and *what remediation action* to deliver next.

No LLM is called at runtime. The intelligence lives entirely in:
- Authored fault trees attached to every question
- A prerequisite DAG encoding the dependency structure of linear algebra
- An Item Response Theory scoring engine updated via Maximum Likelihood Estimation
- A Behavior Tree that orchestrates session flow

---

## 2. Core Philosophy

Most tools measure **what** was wrong. Episteme finds **why**.

A student who fails "solve a system of two equations" might have:
- A slip (arithmetic error, fully understands the concept)
- A lapse (forgot substitution steps)
- A misconception in substitution itself
- A root gap in isolating a variable, three levels upstream

Each of these requires a completely different response. Episteme distinguishes all four — deterministically — using structured fault trees and upstream blame propagation.

The three design axioms:

> **Axiom 1:** The selected wrong answer is a fingerprint, not just a miss.  
> **Axiom 2:** Errors have causes. Causes have causes. The DAG finds the source.  
> **Axiom 3:** Confidence × correctness reveals more than correctness alone.

---

## 3. Domain Scope

### Linear Algebra Topic Map (18 Concepts)

The following concepts form the knowledge graph. Each concept has a unique `concept_id` used throughout the system.

```
TIER 0 — Foundations
  C01  Number Line & Signed Numbers
  C02  Order of Operations (PEMDAS)
  C03  Variable Notation & Substitution

TIER 1 — Expressions
  C04  Simplifying Algebraic Expressions
  C05  Like Terms — Identification & Combination
  C06  Distributive Property

TIER 2 — Linear Equations (Single Variable)
  C07  Solving One-Step Equations  (requires C01, C03)
  C08  Solving Two-Step Equations  (requires C07)
  C09  Solving Equations with Variables on Both Sides  (requires C08)
  C10  Equations with Brackets / Distribution  (requires C06, C09)

TIER 3 — Linear Functions
  C11  Slope — Definition & Calculation  (requires C01, C03)
  C12  Slope-Intercept Form y = mx + b  (requires C11, C08)
  C13  Graphing Linear Equations  (requires C12)
  C14  Point-Slope Form  (requires C12)

TIER 4 — Systems of Equations
  C15  System Setup — Recognising Structure  (requires C09)
  C16  Substitution Method  (requires C15, C09)
  C17  Elimination Method  (requires C15, C05)
  C18  Interpreting System Solutions  (requires C16, C17)
```

### Prerequisite Edges (DAG)

```
C01 → C07
C02 → C04 → C05 → C17
C03 → C04, C07, C11
C06 → C10
C07 → C08 → C09 → C10, C15
C08 → C12
C11 → C12 → C13, C14
C15 → C16, C17
C16 → C18
C17 → C18
```

### Misconception Taxonomy (24 Misconceptions)

Each misconception has a unique `mc_id` and is attached to a concept.

| mc_id | Concept | Misconception Description |
|-------|---------|--------------------------|
| M01 | C01 | Flipping sign when moving term across equals (e.g., -3 becomes +3 incorrectly) |
| M02 | C01 | Treating subtraction as commutative (a - b = b - a) |
| M03 | C02 | Applying operations left-to-right ignoring precedence |
| M04 | C03 | Treating a variable as a fixed unknown rather than a placeholder |
| M05 | C04 | Adding unlike terms (e.g., 3x + 2 = 5x) |
| M06 | C05 | Combining terms across the equals sign without balancing |
| M07 | C06 | Distributing only to the first term: a(b + c) = ab + c |
| M08 | C06 | Sign error on distribution: -(a + b) = -a + b |
| M09 | C07 | Dividing only one side when isolating variable |
| M10 | C08 | Performing operations in wrong order (dividing before subtracting constant) |
| M11 | C09 | Moving variable term but keeping same sign |
| M12 | C10 | Expanding brackets before resolving the equation structure |
| M13 | C11 | Inverting rise/run (slope = Δx/Δy instead of Δy/Δx) |
| M14 | C11 | Sign error on slope with negative coordinates |
| M15 | C12 | Confusing m and b in y = mx + b |
| M16 | C12 | Treating y-intercept as a point (x, b) rather than (0, b) |
| M17 | C13 | Plotting (b, m) instead of (0, b) for the y-intercept |
| M18 | C14 | Using wrong point when writing point-slope form |
| M19 | C15 | Confusing one equation with two unknowns as immediately solvable |
| M20 | C16 | Substituting back into the same equation used for isolation |
| M21 | C16 | Forgetting to substitute into BOTH original equations to verify |
| M22 | C17 | Multiplying only one equation's coefficient when aligning terms |
| M23 | C17 | Adding instead of subtracting equations to eliminate (sign confusion) |
| M24 | C18 | Interpreting "no solution" as "infinitely many" and vice versa |

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        STUDENT INTERACTION                       │
│              (Answer selection + Confidence rating)              │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Error Classifier   │
                    │  slip/lapse/mistake  │
                    └──────────┬──────────┘
                               │ (if mistake)
          ┌────────────────────▼────────────────────┐
          │           Fault Tree Engine              │
          │  Traverses boolean AND/OR gate tree      │
          │  Returns Minimal Cut Set of misconceptions│
          └────────────────────┬────────────────────┘
                               │
          ┌────────────────────▼────────────────────┐
          │    Prerequisite DAG + Blame Propagation  │
          │  Reverse BFS from misconception node     │
          │  Scores upstream concepts by blame weight│
          └──────┬─────────────────────┬────────────┘
                 │                     │
    ┌────────────▼──────┐   ┌──────────▼────────────┐
    │   Mastery Updater  │   │  Priority Repair Queue │
    │  weighted formula  │   │  ranked by risk score  │
    └────────────┬──────┘   └──────────┬────────────┘
                 │                     │
          ┌──────▼─────────────────────▼──────┐
          │      IRT Ability Estimator         │
          │  3PL model + Newton-Raphson MLE    │
          │  + Brier Score Confidence Tracker  │
          └──────────────────┬────────────────┘
                             │
          ┌──────────────────▼────────────────┐
          │     Behavior Tree Sequencer        │
          │  Selects next remediation action   │
          │  based on live learner state vector│
          └──────────────────┬────────────────┘
                             │
          ┌──────────────────▼────────────────┐
          │       Explainability Engine        │
          │  Produces human-readable trace     │
          │  of every decision made this turn  │
          └───────────────────────────────────┘
```

All components are synchronous and in-memory. Every decision is logged to an audit trail.

---

## 5. Data Models

### 5.1 Concept Node

```typescript
interface ConceptNode {
  id: string;                   // e.g., "C07"
  name: string;                 // e.g., "Solving One-Step Equations"
  tier: number;                 // 0–4
  prerequisites: string[];      // concept IDs that must be mastered first
  dependents: string[];         // concept IDs that depend on this one (computed)
  mastery_threshold: number;    // 0–100, default 75
  bloom_level: 1 | 2 | 3 | 4 | 5 | 6;  // Bloom's taxonomy level
  state: "locked" | "unlocked" | "in_progress" | "mastered" | "reinforcing";
}
```

### 5.2 Question

```typescript
interface Question {
  id: string;                   // e.g., "Q07_003"
  concept_id: string;           // "C07"
  difficulty_b: number;         // IRT difficulty parameter (-3 to +3)
  discrimination_a: number;     // IRT discrimination parameter (0.5 to 2.5)
  guessing_c: number;           // IRT pseudo-guessing parameter (0 to 0.35)
  stem: string;                 // The question text
  correct_answer: string;       // The correct option key ("A"/"B"/"C"/"D")
  options: {
    [key: string]: {
      text: string;
      error_tag: string | null; // null if correct; misconception ID if wrong
      error_type: "slip" | "lapse" | "misconception" | null;
    };
  };
  fault_tree: FaultTreeNode;    // Root node of this question's fault tree
  avg_time_correct_ms: number;  // Baseline time for correct answer
  avg_time_incorrect_ms: number;
}
```

### 5.3 Fault Tree Node

```typescript
interface FaultTreeNode {
  type: "AND" | "OR" | "LEAF";
  label: string;                // Human-readable description of this gate/event
  misconception_id?: string;    // Only on LEAF nodes
  condition?: {                 // Evaluated at runtime for LEAF nodes
    answer_selected?: string;   // e.g., "B" — a specific distractor was chosen
    time_bracket?: "fast" | "medium" | "slow";
    prior_error_pattern?: string; // e.g., "M07_repeated" — seen this error before
  };
  children?: FaultTreeNode[];   // AND/OR nodes have children; LEAF nodes do not
}
```

### 5.4 Student State

```typescript
interface StudentState {
  student_id: string;
  session_start: number;        // Unix timestamp

  // Per-concept mastery (0–100)
  mastery: { [concept_id: string]: number };

  // IRT ability estimate (latent trait, typically -3 to +3)
  ability_theta: number;        // Initialised at 0.0
  theta_se: number;             // Standard error of theta estimate

  // Confidence calibration
  confidence_history: Array<{
    question_id: string;
    stated_confidence: number;  // 0–100 as entered by student
    was_correct: boolean;
    brier_contribution: number; // (stated_confidence/100 - outcome)^2
  }>;
  rolling_brier_score: number;  // Rolling mean over last 10 items
  calibration_state:
    | "well_calibrated"         // θ > 0.5 AND brier < 0.2
    | "overconfident"           // high confidence + low accuracy → DANGER ZONE
    | "underconfident"          // low confidence + high accuracy
    | "poor_performer";         // low θ AND high brier

  // Error history
  error_history: Array<{
    question_id: string;
    answer_selected: string;
    error_type: "slip" | "lapse" | "mistake";
    misconception_ids: string[];   // minimal cut set from fault tree
    timestamp: number;
    time_taken_ms: number;
  }>;

  // Blame scores (updated after each mistake)
  blame_scores: { [concept_id: string]: number };

  // Spaced repetition queue
  review_queue: Array<{
    concept_id: string;
    due_date: number;           // Unix timestamp
    interval_days: number;
    ease_factor: number;        // SM-2 EF, initialised at 2.5
    consecutive_correct: number;
  }>;

  // Behaviour Tree session state
  items_in_session: number;
  consecutive_correct_streak: number;
  fatigue_score: number;        // 0–1, updated per item (see Feature 4)
  active_repair_concept: string | null;
}
```

---

## 6. Feature 1 — Fault Tree Engine

### 6.1 What It Does

Each question is authored with a **Fault Tree** — a boolean logic structure that maps observable answer events (which distractor was chosen, how long the student took, whether this error appeared before) to one or more root-cause misconceptions.

The engine evaluates the tree against the current answer event and returns a **Minimal Cut Set (MCS)**: the smallest set of misconceptions that together fully explain the failure.

This concept is borrowed directly from aerospace safety analysis (Bell Labs, 1960s), where a system failure is traced to the minimum combination of component failures that could cause it.

### 6.2 Worked Example — Question Q09_002

**Stem:** *Solve for x: 4x - 3 = 2x + 9*

**Options:**
| Option | Text | Error Tag |
|--------|------|-----------|
| A | x = 6 ✓ | null |
| B | x = -6 | M11 — moved variable but kept same sign |
| C | x = 3 | M10 — divided before subtracting constant |
| D | x = 1.5 | M05 — combined unlike terms (4x - 2x with -3 + 9) |

**Fault Tree for Q09_002:**

```
TOP EVENT: Wrong answer on Q09_002
│
OR gate
├── LEAF: answer == "B"  → minimal cut set: { M11 }
│         (moved 2x to left but wrote 4x - 2x without sign flip)
│
├── LEAF: answer == "C"  → minimal cut set: { M10 }
│         (divided 4x by 2 before addressing constant)
│
└── AND gate: answer == "D"
    ├── LEAF: prior_error_pattern includes M05  → { M05 }
    └── LEAF: time_bracket == "fast"
              (quick guess suggests careless combination)
```

The tree for option D uses an AND gate: the system only attributes the full misconception M05 if both conditions are true (chose D AND this error appeared before). If D is chosen but there's no prior M05 pattern, the MCS is `{M05, possible_lapse}`, and the error type is tentatively reclassified from `mistake` to `lapse`.

### 6.3 Implementation

```python
# fault_tree.py

def evaluate_fault_tree(node, answer_event):
    """
    Recursively evaluate a fault tree node.
    Returns (matched: bool, misconception_ids: set)
    
    answer_event = {
        "answer_selected": "B",
        "time_bracket": "fast" | "medium" | "slow",
        "prior_error_patterns": ["M07", "M11"]   # errors seen 2+ times
    }
    """
    if node["type"] == "LEAF":
        matched = _evaluate_condition(node["condition"], answer_event)
        mc_id = node.get("misconception_id")
        return matched, {mc_id} if matched and mc_id else set()

    elif node["type"] == "OR":
        all_mcs = set()
        for child in node["children"]:
            matched, mcs = evaluate_fault_tree(child, answer_event)
            if matched:
                all_mcs.update(mcs)
        # OR gate returns the MINIMAL subset — first matching child
        # (children are ordered from most specific to least specific)
        for child in node["children"]:
            matched, mcs = evaluate_fault_tree(child, answer_event)
            if matched:
                return True, mcs   # return on first match = minimal cut set
        return False, set()

    elif node["type"] == "AND":
        all_mcs = set()
        for child in node["children"]:
            matched, mcs = evaluate_fault_tree(child, answer_event)
            if not matched:
                return False, set()  # AND fails if any child fails
            all_mcs.update(mcs)
        return True, all_mcs


def _evaluate_condition(condition, answer_event):
    if not condition:
        return True   # unconditional LEAF
    checks = []
    if "answer_selected" in condition:
        checks.append(answer_event["answer_selected"] == condition["answer_selected"])
    if "time_bracket" in condition:
        checks.append(answer_event["time_bracket"] == condition["time_bracket"])
    if "prior_error_pattern" in condition:
        checks.append(condition["prior_error_pattern"] in answer_event["prior_error_patterns"])
    return all(checks)
```

### 6.4 Error Classifier (Pre-Fault-Tree)

Before the fault tree runs, the answer event is classified at a coarse level:

```python
def classify_error(question, answer_selected, time_taken_ms, error_history):
    if answer_selected == question["correct_answer"]:
        return "correct"
    
    ratio = time_taken_ms / question["avg_time_incorrect_ms"]
    
    # Fast wrong = likely slip (execution failure, not conceptual)
    if ratio < 0.5:
        return "slip"
    
    # Same wrong answer on this concept seen 2+ times = confirmed misconception
    same_errors = [e for e in error_history
                   if e["concept_id"] == question["concept_id"]
                   and e["answer_selected"] == answer_selected]
    if len(same_errors) >= 2:
        return "mistake"     # Confirmed misconception — run full fault tree
    
    # Default: treat as mistake (run fault tree)
    return "mistake"
```

Slips are noted but do NOT trigger fault tree traversal. They increment a session slip counter and, if `slip_count > 3`, the BT may suggest a pace reduction.

---

## 7. Feature 2 — Prerequisite DAG + Blame Backpropagation

### 7.1 What It Does

When the Fault Tree returns a minimal cut set of misconceptions, each misconception is mapped to a concept node in the DAG. The system then runs **backward blame propagation**: a reverse BFS that assigns decaying blame weights to upstream prerequisite concepts.

This answers the question: *"This student failed C09, but is the actual gap in C07 or C08?"*

### 7.2 The DAG

The DAG is stored as two adjacency lists: `prereqs` (parent → children it enables) and `dependents` (child → parents it needs). Both are derived from the concept edge list defined in Section 3.

```python
# dag.py — built once at startup
import json
from collections import defaultdict, deque

class ConceptDAG:
    def __init__(self, concepts, edges):
        self.nodes = {c["id"]: c for c in concepts}
        self.prereqs = defaultdict(list)    # prereqs[C09] = [C07, C08]
        self.dependents = defaultdict(list) # dependents[C07] = [C08, C09, C11]
        for src, dst in edges:
            self.prereqs[dst].append(src)
            self.dependents[src].append(dst)
    
    def is_unlocked(self, concept_id, mastery):
        """A concept is unlocked if all prerequisites are mastered."""
        for prereq_id in self.prereqs[concept_id]:
            if mastery.get(prereq_id, 0) < self.nodes[prereq_id]["mastery_threshold"]:
                return False
        return True
    
    def topological_order(self):
        """Kahn's algorithm — returns valid study order."""
        in_degree = {cid: len(plist) for cid, plist in self.prereqs.items()}
        for cid in self.nodes:
            if cid not in in_degree:
                in_degree[cid] = 0
        queue = deque([cid for cid, d in in_degree.items() if d == 0])
        order = []
        while queue:
            node = queue.popleft()
            order.append(node)
            for dep in self.dependents[node]:
                in_degree[dep] -= 1
                if in_degree[dep] == 0:
                    queue.append(dep)
        return order
```

### 7.3 Blame Backpropagation Algorithm

```
Input:  set of misconception concept IDs from Fault Tree (root_concepts)
        current mastery scores
        decay factor λ = 0.6

Algorithm:
  1. Initialise blame_scores = {}
  2. For each concept in root_concepts:
       blame_scores[concept] += 1.0
  3. BFS backwards through prereqs:
       queue ← root_concepts
       while queue not empty:
           current ← dequeue
           for each prereq of current:
               new_blame = blame_scores[current] × λ
               blame_scores[prereq] = max(blame_scores.get(prereq, 0), new_blame)
               if new_blame > 0.05:   # prune negligible paths
                   enqueue prereq
  4. For each concept, compute priority score:
       priority = blame_weight × (1 - mastery/100) × (1 + len(dependents))
  5. Return concepts sorted descending by priority
```

```python
def backpropagate_blame(dag, root_concept_ids, mastery, decay=0.6):
    blame = {cid: 1.0 for cid in root_concept_ids}
    queue = deque(root_concept_ids)
    visited = set()

    while queue:
        current = queue.popleft()
        if current in visited:
            continue
        visited.add(current)
        current_blame = blame.get(current, 0)
        for prereq in dag.prereqs[current]:
            new_blame = current_blame * decay
            if new_blame > 0.05:
                blame[prereq] = max(blame.get(prereq, 0), new_blame)
                queue.append(prereq)

    # Compute priority scores
    priority = {}
    for cid, bw in blame.items():
        mastery_score = mastery.get(cid, 0) / 100.0
        num_dependents = len(dag.dependents[cid])
        priority[cid] = bw * (1 - mastery_score) * (1 + num_dependents)

    return sorted(priority.items(), key=lambda x: -x[1])
```

### 7.4 Worked Example

Student fails Q16_001 (Substitution Method). Fault Tree returns `{M20}` — student substituted into the same equation used for isolation.

```
M20 is mapped to concept C16.

Backpropagation:
  C16  → blame 1.0  (root)
  C15  → blame 0.6  (C16's prereq)
  C09  → blame 0.36 (C15's prereq)
  C08  → blame 0.22 (C09's prereq)
  C07  → blame 0.13 (C08's prereq)

Priority scores (assuming mastery C15=40, C09=70, C08=80):
  C15: 0.6 × 0.60 × 2 = 0.72  ← TOP PRIORITY
  C09: 0.36 × 0.30 × 3 = 0.32
  C08: 0.22 × 0.20 × 4 = 0.18
```

Result: The system flags **C15 (System Setup — Recognising Structure)** as the priority repair target. The student doesn't actually have a substitution problem — they never grasped *when* and *why* you have two separate equations to work with.

### 7.5 Mastery Update Formula

After every question:

```
mastery[concept] = 
  0.50 × recent_quiz_accuracy         (last 5 questions on this concept)
+ 0.30 × practice_session_accuracy    (all-time on this concept)
+ 0.20 × retention_score              (decays 5% per day without review)

Where:
  retention_score = mastery_at_last_review × e^(-0.05 × days_since_review)
```

Mastery is clamped to [0, 100]. Thresholds:
- 0–59: **Weak** — concept is locked to dependents, triggers active repair
- 60–79: **Developing** — can proceed but review is scheduled
- 80–100: **Strong** — dependents unlocked, enters spaced review cycle

---

## 8. Feature 3 — IRT Ability Estimation + Confidence Calibration

### 8.1 Item Response Theory (3PL Model)

Each question has three parameters calibrated during content authoring:

| Parameter | Symbol | Meaning | Typical Range |
|-----------|--------|---------|---------------|
| Difficulty | b | Ability level where P(correct) = 0.5 | -3 to +3 |
| Discrimination | a | Slope — how sharply the item differentiates ability levels | 0.5 to 2.5 |
| Guessing | c | Lower asymptote — probability of correct by guessing | 0 to 0.35 |

**Probability of correct response given ability θ:**

```
P(θ | a, b, c) = c + (1 - c) / (1 + e^(-1.702 × a × (θ - b)))
```

The constant 1.702 is the standard scaling factor to align logistic and normal ogive models.

### 8.2 Ability Estimation via Maximum Likelihood (Newton-Raphson)

After each response, `θ` is updated by maximising the log-likelihood across all responses in the session.

```python
import math

def update_theta(theta, responses, questions, max_iter=20, tol=1e-6):
    """
    responses: list of (question_id, was_correct)
    questions: dict of question_id → {a, b, c}
    Returns: (new_theta, standard_error)
    """
    for _ in range(max_iter):
        L1 = 0.0   # First derivative of log-likelihood
        L2 = 0.0   # Second derivative (negative, for Newton-Raphson)
        
        for q_id, correct in responses:
            q = questions[q_id]
            a, b, c = q["discrimination_a"], q["difficulty_b"], q["guessing_c"]
            
            # P(correct | θ)
            exponent = -1.702 * a * (theta - b)
            p_star = 1.0 / (1.0 + math.exp(exponent))  # logistic without guessing
            p = c + (1 - c) * p_star                    # full 3PL probability
            q_prob = 1.0 - p                            # P(incorrect)
            
            # Gradient components
            w = (1 - c) * p_star * (1 - p_star)        # derivative of p w.r.t. θ numerator
            
            if correct:
                L1 += (1.702 * a * w) / p
                L2 -= (1.702 * a * w / p) ** 2
            else:
                L1 -= (1.702 * a * w) / q_prob
                L2 -= (1.702 * a * w / q_prob) ** 2
        
        if abs(L2) < 1e-10:
            break
        
        delta = L1 / (-L2)           # Newton-Raphson step
        theta += delta
        theta = max(-4.0, min(4.0, theta))  # Bound to reasonable range
        
        if abs(delta) < tol:
            break
    
    # Standard error: SE(θ) = 1 / sqrt(Information)
    # Fisher information: I(θ) = -L2
    information = max(-L2, 0.01)     # Avoid division by zero
    se = 1.0 / math.sqrt(information)
    
    return theta, se
```

**Stopping condition for a session:** When `SE(θ) < 0.30`, ability is estimated with sufficient precision. The system stops requesting items from a concept and moves to the next priority.

### 8.3 CAT Item Selection

The Computerized Adaptive Testing (CAT) engine selects the next question to maximise **Fisher Information** at the current `θ`:

```
I_i(θ) = (1.702 × a_i)² × P_i*(θ) × (1 - P_i*(θ)) × [(P_i(θ) - c_i) / P_i(θ)]²  ÷ (1 - P_i(θ))

Where P_i*(θ) = logistic without guessing, P_i(θ) = full 3PL probability.
```

```python
def fisher_information(theta, a, b, c):
    D = 1.702
    exp_val = math.exp(-D * a * (theta - b))
    p_star = 1.0 / (1.0 + exp_val)           # P without guessing
    p = c + (1 - c) * p_star                  # Full 3PL P
    q = 1.0 - p
    numerator = (D * a) ** 2 * p_star * (1 - p_star) * ((p - c) / (1 - c)) ** 2
    return numerator / (p * q + 1e-10)

def select_next_question(available_questions, theta, used_ids):
    best_q, best_info = None, -1
    for q in available_questions:
        if q["id"] in used_ids:
            continue
        info = fisher_information(theta, q["discrimination_a"],
                                  q["difficulty_b"], q["guessing_c"])
        if info > best_info:
            best_info = info
            best_q = q
    return best_q
```

### 8.4 Confidence Calibration (Brier Score)

Before answering, the student rates their confidence: *"How sure are you? 0–100%"*

After the answer is submitted, one **Brier contribution** is computed:

```
BC = (confidence / 100  -  outcome)²

Where outcome = 1 if correct, 0 if wrong.

Examples:
  90% confident, correct → BC = (0.9 - 1)² = 0.01  (good)
  90% confident, wrong   → BC = (0.9 - 0)² = 0.81  (very bad — overconfidence)
  20% confident, correct → BC = (0.2 - 1)² = 0.64  (underconfident)
  50% confident, wrong   → BC = (0.5 - 0)² = 0.25  (uncertain, wrong — acceptable)

Perfect calibration = 0.0 (impossible)
Good calibration = rolling BS < 0.20
```

A **rolling Brier Score** is maintained over the last 10 items.

### 8.5 The 2D Calibration-Ability Matrix

These two measures are combined into a 2×2 state used by the Behavior Tree:

```
                 HIGH ABILITY (θ > 0.5)
                        │
  UNDERCONFIDENT        │        WELL-CALIBRATED EXPERT
  (BT: confidence drill)│        (BT: advance to harder content)
                        │
  ────────────────── θ = 0.5 ─────────────────────────
                        │
  POOR PERFORMER        │        ⚠ DANGER ZONE ⚠
  (BT: prerequisite     │        Overconfident + Low Ability
   drill from root)     │        (BT: mandatory contrast case
                        │         + misconception confrontation)
                LOW ABILITY (θ ≤ 0.5)
```

```python
def get_calibration_state(theta, rolling_brier_score):
    high_ability = theta > 0.5
    well_calibrated = rolling_brier_score < 0.20
    if high_ability and well_calibrated:
        return "well_calibrated"
    if not high_ability and not well_calibrated:
        # Distinguish overconfident vs underconfident
        # Compute mean confidence from history
        return "overconfident"   # handled separately with mean_confidence check
    if high_ability and not well_calibrated:
        return "underconfident"
    return "poor_performer"
```

---

## 9. Feature 4 — Behavior Tree Remediation Sequencer

### 9.1 What It Does

After every student interaction, the **Behavior Tree (BT)** ticks once. It reads the live student state vector and selects the optimal next action. The BT is a reactive decision structure — it evaluates conditions top-down and executes the first matching branch.

Unlike a decision table (flat rules), a BT is composable, debuggable, and produces an execution trace that shows exactly which nodes evaluated and which branch was taken.

### 9.2 Learner State Vector (Input to BT)

```python
state = {
    "calibration_state": "overconfident" | "well_calibrated" | ...,
    "top_priority_concept": concept_id,    # from blame propagation
    "top_priority_blame": float,           # 0–1
    "current_concept_mastery": float,      # 0–100
    "consecutive_correct_streak": int,
    "consecutive_wrong_streak": int,
    "fatigue_score": float,                # 0–1
    "items_in_session": int,
    "theta": float,
    "theta_se": float,
    "slip_count_session": int,
    "active_misconception_id": str | None,
    "session_minutes_elapsed": float,
}
```

**Fatigue Score:** Updated after every item:
```python
FATIGUE_DECAY = 0.92        # Fatigue decays slowly between items
FATIGUE_WRONG_BUMP = 0.12   # Wrong answer adds fatigue
FATIGUE_CORRECT_BUMP = 0.03 # Correct answer adds slight fatigue

fatigue = fatigue * FATIGUE_DECAY
fatigue += FATIGUE_WRONG_BUMP if not correct else FATIGUE_CORRECT_BUMP
fatigue = min(1.0, fatigue)
```

### 9.3 Full Behavior Tree Structure

```
ROOT: Selector
│
├── SEQUENCE — DANGER ZONE (highest priority)
│   ├── Condition: calibration_state == "overconfident"
│   ├── Condition: active_misconception_id is not None
│   └── Action: DELIVER_CONTRAST_CASE(active_misconception_id)
│              [Shows two worked examples: correct vs incorrect procedure
│               side by side, with the misconception labeled explicitly]
│
├── SEQUENCE — FATIGUE BREAK
│   ├── Condition: fatigue_score > 0.75
│   └── Action: DELIVER_PACE_REDUCTION()
│              [Switch to simpler one-step verification items
│               for 2–3 questions; log pace_reduction event]
│
├── SEQUENCE — CRITICAL PREREQUISITE REPAIR
│   ├── Condition: top_priority_blame > 0.65
│   ├── Condition: top_priority_concept.mastery < 60
│   └── Action: DRILL_PREREQUISITE(top_priority_concept_id)
│              [Fetch 2–3 targeted items from priority concept's bank
│               using CAT item selection at current θ]
│
├── SEQUENCE — MISCONCEPTION DRILL (confirmed, non-critical)
│   ├── Condition: active_misconception_id is not None
│   ├── Condition: consecutive_wrong_streak >= 2
│   └── Action: DELIVER_WORKED_EXAMPLE(active_misconception_id)
│              [Step-by-step solution with the error type annotated
│               at the step where students typically go wrong]
│
├── SEQUENCE — ADVANCE (mastery confirmed)
│   ├── Condition: consecutive_correct_streak >= 3
│   ├── Condition: theta_se < 0.35
│   └── Action: ADVANCE_TO_NEXT_CONCEPT()
│              [Topological traversal to find next unlocked concept]
│
├── SEQUENCE — INTERLEAVING (retention)
│   ├── Condition: items_in_session > 0 AND items_in_session % 8 == 0
│   └── Action: DELIVER_INTERLEAVED_REVIEW()
│              [Fetch one item from each of the 2 highest-priority
│               concepts in the spaced review queue]
│
└── DEFAULT ACTION: DELIVER_NEXT_CAT_ITEM(current_concept_id)
    [Standard CAT-selected item on the current concept]
```

### 9.4 BT Implementation

```python
# behavior_tree.py

class BehaviorTree:
    def tick(self, state, question_bank, dag):
        """Returns a BTAction describing what to do next."""
        trace = []   # Audit log of which branches were evaluated

        # DANGER ZONE
        if (state["calibration_state"] == "overconfident"
                and state["active_misconception_id"] is not None):
            trace.append({"branch": "DANGER_ZONE", "fired": True})
            return BTAction(
                type="CONTRAST_CASE",
                params={"misconception_id": state["active_misconception_id"]},
                reason="Overconfident + confirmed misconception. Contrast case forces confrontation.",
                trace=trace
            )
        trace.append({"branch": "DANGER_ZONE", "fired": False})

        # FATIGUE
        if state["fatigue_score"] > 0.75:
            trace.append({"branch": "FATIGUE", "fired": True})
            return BTAction(
                type="PACE_REDUCTION",
                params={},
                reason=f"Fatigue score {state['fatigue_score']:.2f} exceeds threshold 0.75.",
                trace=trace
            )
        trace.append({"branch": "FATIGUE", "fired": False})

        # CRITICAL PREREQUISITE
        if (state["top_priority_blame"] > 0.65
                and state["current_concept_mastery"] < 60):
            trace.append({"branch": "PREREQ_REPAIR", "fired": True})
            return BTAction(
                type="DRILL_PREREQUISITE",
                params={"concept_id": state["top_priority_concept"]},
                reason=(f"Blame weight {state['top_priority_blame']:.2f} on "
                        f"{state['top_priority_concept']} exceeds 0.65 with mastery "
                        f"{state['current_concept_mastery']:.0f}%."),
                trace=trace
            )
        trace.append({"branch": "PREREQ_REPAIR", "fired": False})

        # ... remaining branches follow same pattern

        # DEFAULT
        trace.append({"branch": "DEFAULT", "fired": True})
        return BTAction(
            type="NEXT_CAT_ITEM",
            params={"concept_id": state["current_concept_id"]},
            reason="No special condition met. Continuing with CAT-selected item.",
            trace=trace
        )


class BTAction:
    def __init__(self, type, params, reason, trace):
        self.type = type      # Action type
        self.params = params  # Parameters for the action executor
        self.reason = reason  # Human-readable explanation (for explainability panel)
        self.trace = trace    # Full branch evaluation log
```

---

## 10. Explainability Engine

### 10.1 What It Outputs

After every interaction, the Explainability Engine produces a structured explanation object that is rendered in the UI's decision trace panel.

```typescript
interface ExplanationRecord {
  question_id: string;
  timestamp: number;
  
  // Error classification
  error_type: "correct" | "slip" | "lapse" | "mistake";
  error_type_reason: string;  // Human-readable rationale
  
  // Fault tree result
  fault_tree_trace: {
    evaluated_path: string[];        // Nodes visited in order
    gate_decisions: string[];        // "OR gate → matched child: LEAF(B)"
    minimal_cut_set: string[];       // e.g., ["M11"]
    misconception_descriptions: string[];
  } | null;
  
  // Blame propagation
  blame_propagation: {
    root_concepts: string[];
    propagated_to: Array<{ concept_id: string; blame: number; priority: number }>;
    top_repair_target: string;
    repair_target_reason: string;
  } | null;
  
  // IRT update
  irt_update: {
    theta_before: number;
    theta_after: number;
    se_before: number;
    se_after: number;
    question_information: number;
  };
  
  // Calibration
  calibration: {
    stated_confidence: number;
    was_correct: boolean;
    brier_contribution: number;
    rolling_brier_score: number;
    calibration_state: string;
  };
  
  // BT decision
  bt_decision: {
    branch_fired: string;
    reason: string;
    action_type: string;
    full_trace: Array<{ branch: string; fired: boolean }>;
  };
  
  // Plain English summary (generated by template, NOT LLM)
  summary: string;
}
```

### 10.2 Plain English Template System

Explanations are assembled from string templates — not LLM output.

```python
SUMMARY_TEMPLATES = {
    "CONTRAST_CASE": (
        "You answered {answer} with {confidence}% confidence, but the correct answer is {correct}. "
        "The system detected misconception {mc_desc}. "
        "Because you were highly confident, a side-by-side contrast case has been provided "
        "to directly address this belief."
    ),
    "DRILL_PREREQUISITE": (
        "Your error traces back to a gap in {repair_concept}. "
        "The blame propagation path was: {blame_path}. "
        "We'll drill {repair_concept} before returning to {current_concept}."
    ),
    # etc.
}
```

---

## 11. Spaced Repetition Scheduler

### 11.1 SM-2 Algorithm (Modified)

For each mastered concept, a review item is scheduled using a modified SM-2:

```python
def update_sm2(item, grade):
    """
    grade: 0–5
      5 = perfect recall (correct, fast, high confidence)
      4 = correct with some hesitation
      3 = correct with significant effort
      2 = incorrect, but correct answer felt familiar
      1 = incorrect
      0 = complete blank
    """
    EF = item["ease_factor"]          # Initialised at 2.5
    n  = item["consecutive_correct"]  # Consecutive correct reviews
    
    if grade >= 3:
        if n == 0:   interval = 1
        elif n == 1: interval = 6
        else:        interval = round(item["interval_days"] * EF)
        n += 1
    else:
        interval = 1
        n = 0        # Reset streak
    
    # Update ease factor
    EF = EF + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
    EF = max(1.3, EF)   # EF floor = 1.3 (hardest items)
    
    item["interval_days"] = interval
    item["ease_factor"] = EF
    item["consecutive_correct"] = n
    item["due_date"] = now() + interval * 86400   # seconds
    
    return item
```

**Grade mapping from Episteme's response data:**
- `grade = 5` → correct + fast + confidence ≥ 80%
- `grade = 4` → correct + medium time + confidence ≥ 60%
- `grade = 3` → correct + slow or confidence < 60%
- `grade = 2` → incorrect, slip classified
- `grade = 0–1` → incorrect, misconception confirmed

### 11.2 Priority Queue

All due review items are stored in a min-heap by `due_date`. At session start, overdue items are loaded and merged with the active concept queue using a weighted ratio:

```
session_item_allocation = 70% active_concept_items + 30% review_queue_items
```

---

## 12. User Flow — End to End

```
1.  Student opens Episteme
2.  System loads their StudentState (or creates a new one)
3.  System computes: which concepts are unlocked? which are overdue for review?
4.  BT (pre-session tick) selects starting concept based on:
      - Highest blame score concept with unlocked status
      - OR next concept in topological order if no blame signals
5.  CAT selects first question from starting concept's bank at θ=0
6.  Student reads question → enters confidence (0–100 slider) → selects answer
7.  System measures time_taken_ms

8.  Error Classifier runs:
      → returns "slip", "lapse", or "mistake"
9.  If "mistake":
      → Fault Tree Engine evaluates the question's tree against the answer event
      → Returns Minimal Cut Set of misconception IDs
10. Blame Backpropagation runs from misconception concept nodes
      → Returns prioritised list of upstream concepts
11. Mastery score updated for current concept
12. IRT: theta and SE updated via Newton-Raphson MLE
13. Brier Score updated; rolling_brier_score recomputed
14. Calibration state recomputed from (theta, rolling_brier_score)
15. BT ticks with updated state vector
      → Returns BTAction with type, params, and reason
16. Explainability Engine assembles ExplanationRecord
17. UI renders:
      → Correct answer revealed
      → Explanation panel (summary + expandable trace)
      → Next action delivered (contrast case / drill / next question)
18. SM-2 grade computed from response; review queue updated
19. Repeat from step 6 until:
      → Session time limit reached
      → theta_se < 0.25 for all active concepts
      → Student ends session
20. Session summary shown: concepts visited, misconceptions resolved,
    theta movement, calibration trend, mastery changes
```

---

## 13. UI Requirements

### 13.1 Student View

**Question Screen**
- Question stem + 4 answer options (A/B/C/D)
- Confidence slider: 0–100% with labels at 0 (Guessing), 50 (Unsure), 100 (Certain)
- Timer displayed (used for time_bracket classification)
- Submit button (disabled until confidence is set)

**Result Panel (shown after submission)**
- Correct answer highlighted
- Error type badge: `SLIP` / `LAPSE` / `MISCONCEPTION` (with colour coding)
- Plain English explanation from template
- Expandable "Why this next action?" section showing BT decision

**Concept Map Panel (sidebar)**
- DAG visualisation with node colour:
  - Grey = Locked
  - Blue = Unlocked / In Progress
  - Green = Mastered
  - Orange = In Repair Queue
  - Red = High Blame Score
- Clicking a node shows: mastery %, blame score, last reviewed, misconceptions flagged

**Session Stats Bar**
- Current θ (ability estimate) with confidence band
- Rolling Brier Score with calibration state label
- Session progress: items done / items planned

### 13.2 Debug / Judge View (Key for Hackathon Demo)

This view is the **explainability showpiece** for judges.

**Fault Tree Visualiser**
- Renders the evaluated fault tree as an interactive tree diagram
- Fired nodes highlighted in red; non-fired nodes greyed out
- Shows the minimal cut set in a box at the bottom

**Decision Trace Panel**
- Timestamped log of every decision made in the session
- Each entry shows: input state → algorithm used → output + reason
- Filterable by component (Fault Tree / Blame / IRT / BT)

**Concept Graph Heatmap**
- DAG with mastery % as colour intensity (white=0%, deep green=100%)
- Blame scores shown as red overlay intensity
- Arrows show prerequisite direction

**Theta Timeline**
- Line chart of θ over time in the session
- Standard error band shown
- Markers where BT switched action type

---

## 14. Build Guide

### 14.1 Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Frontend | React + TypeScript | Component-based, good graph libraries |
| State Management | Zustand or React Context | Simple, no server needed for hackathon |
| Graph Rendering | React Flow or D3.js | DAG and fault tree visualisation |
| Charts | Recharts | θ timeline, Brier score trend |
| Backend (optional) | FastAPI (Python) | If IRT math is cleaner in Python |
| Data | JSON files | All questions, fault trees, concept graph as static JSON |
| Storage | localStorage | Student state persisted between sessions |

**For a pure frontend hackathon build:** All algorithms (IRT, BT, FTA, blame propagation) can run in TypeScript in the browser. The JSON question bank is imported as a module.

### 14.2 Repository Structure

```
episteme/
├── data/
│   ├── concepts.json          # All 18 concept nodes
│   ├── edges.json             # DAG prerequisite edges
│   ├── questions.json         # All questions with fault trees + IRT params
│   └── misconceptions.json    # Misconception taxonomy (24 entries)
│
├── src/
│   ├── engine/
│   │   ├── dag.ts             # ConceptDAG class, topological sort, blame propagation
│   │   ├── faultTree.ts       # FaultTree evaluator, Error classifier
│   │   ├── irt.ts             # 3PL model, Newton-Raphson MLE, Fisher information, CAT selector
│   │   ├── calibration.ts     # Brier score, calibration state machine
│   │   ├── behaviorTree.ts    # BT node definitions, tick function
│   │   ├── mastery.ts         # Mastery formula, retention decay
│   │   ├── sm2.ts             # Spaced repetition scheduler
│   │   └── explainability.ts  # ExplanationRecord assembler, template renderer
│   │
│   ├── store/
│   │   └── studentState.ts    # Zustand store for StudentState, persistence
│   │
│   ├── components/
│   │   ├── QuestionCard.tsx
│   │   ├── ConfidenceSlider.tsx
│   │   ├── ResultPanel.tsx
│   │   ├── ConceptMap.tsx     # React Flow DAG
│   │   ├── FaultTreeViz.tsx   # React Flow fault tree
│   │   ├── DecisionTrace.tsx
│   │   └── SessionStats.tsx
│   │
│   └── App.tsx
│
└── tests/
    ├── faultTree.test.ts
    ├── irt.test.ts
    ├── blamePropagate.test.ts
    └── behaviorTree.test.ts
```

### 14.3 Development Order (Hackathon Sprint)

**Hour 1–2: Data Foundation**
- Write `concepts.json` (18 concepts) and `edges.json`
- Write `misconceptions.json` (24 misconceptions)
- Write 20 seed questions in `questions.json` with distractors tagged to misconception IDs

**Hour 3–4: Core Engine**
- Implement `dag.ts`: adjacency lists, `is_unlocked`, `topological_order`
- Implement `faultTree.ts`: recursive evaluator
- Implement `mastery.ts`: formula + update function
- Write unit tests for all three

**Hour 5–6: IRT + Calibration**
- Implement `irt.ts`: 3PL probability, Newton-Raphson, Fisher information, CAT selector
- Implement `calibration.ts`: Brier score, rolling average, state classifier
- Write unit tests against known IRT values

**Hour 7–8: Behavior Tree + Blame**
- Implement `dag.ts` blame backpropagation
- Implement `behaviorTree.ts`: tick function, all 7 branches
- Implement `sm2.ts`

**Hour 9–10: Explainability + UI Shell**
- Implement `explainability.ts`: template renderer, record assembler
- Build `QuestionCard`, `ConfidenceSlider`, `ResultPanel` components
- Wire up store and session loop

**Hour 11–12: Debug View + Polish**
- Build `FaultTreeViz` and `ConceptMap` (React Flow)
- Build `DecisionTrace` panel
- End-to-end test with 5+ student sessions
- Add remaining questions to hit 40+ in bank

### 14.4 Authoring Fault Trees (JSON Format)

```json
{
  "id": "Q09_002",
  "concept_id": "C09",
  "difficulty_b": 0.8,
  "discrimination_a": 1.4,
  "guessing_c": 0.25,
  "stem": "Solve for x: 4x - 3 = 2x + 9",
  "correct_answer": "A",
  "options": {
    "A": { "text": "x = 6",   "error_tag": null,  "error_type": null },
    "B": { "text": "x = -6",  "error_tag": "M11", "error_type": "misconception" },
    "C": { "text": "x = 3",   "error_tag": "M10", "error_type": "misconception" },
    "D": { "text": "x = 1.5", "error_tag": "M05", "error_type": "misconception" }
  },
  "avg_time_correct_ms": 35000,
  "avg_time_incorrect_ms": 28000,
  "fault_tree": {
    "type": "OR",
    "label": "Wrong answer on Q09_002",
    "children": [
      {
        "type": "LEAF",
        "label": "Chose B — variable moved without sign flip",
        "misconception_id": "M11",
        "condition": { "answer_selected": "B" }
      },
      {
        "type": "LEAF",
        "label": "Chose C — divided before subtracting constant",
        "misconception_id": "M10",
        "condition": { "answer_selected": "C" }
      },
      {
        "type": "AND",
        "label": "Chose D AND has prior M05 pattern",
        "children": [
          {
            "type": "LEAF",
            "label": "Selected option D",
            "condition": { "answer_selected": "D" }
          },
          {
            "type": "LEAF",
            "label": "M05 seen in prior sessions",
            "misconception_id": "M05",
            "condition": { "prior_error_pattern": "M05" }
          }
        ]
      }
    ]
  }
}
```

---

## 15. Content Authoring — Question Bank

### 15.1 Questions Per Concept (Target: 50 Questions MVP)

| Concept | Questions | Fault Trees Needed |
|---------|-----------|-------------------|
| C07 One-Step Equations | 4 | 4 |
| C08 Two-Step Equations | 4 | 4 |
| C09 Variables Both Sides | 4 | 4 |
| C10 Brackets + Distribution | 3 | 3 |
| C11 Slope | 4 | 4 |
| C12 Slope-Intercept Form | 4 | 4 |
| C13 Graphing | 3 | 3 |
| C15 System Setup | 3 | 3 |
| C16 Substitution Method | 4 | 4 |
| C17 Elimination Method | 4 | 4 |
| C18 Interpreting Solutions | 3 | 3 |
| Review/Mixed | 10 | — |

### 15.2 IRT Parameter Calibration (Hackathon Estimate)

Since you won't have real test data, assign IRT parameters by design intent:

| Difficulty Level | b range | Target Questions |
|-----------------|---------|-----------------|
| Easy (Tier 1–2 intro) | -1.5 to -0.5 | 15 |
| Medium (Tier 2–3 core) | -0.5 to +0.5 | 20 |
| Hard (Tier 3–4 advanced) | +0.5 to +1.5 | 15 |

Set `a = 1.2` uniformly as a reasonable default discrimination value. Set `c = 0.25` for all 4-option questions (chance level). Refine after observing user data.

---

## 16. MVP Scope

### Must Have (Demo Day)
- 18 concept nodes in DAG with correct prerequisite edges
- 50 questions with distractor error tags and fault trees
- Fault Tree Engine: full AND/OR/LEAF evaluator returning MCS
- Blame Backpropagation: reverse BFS with priority scoring
- IRT θ estimation: 3PL + Newton-Raphson (even simplified is fine)
- Brier Score + calibration state classifier
- Behavior Tree: minimum 4 branches (Danger Zone, Prereq Repair, Advance, Default)
- Explainability: decision trace panel showing BT branch that fired
- Concept Map: DAG with mastery colour coding
- Student session loop: question → answer → explain → next

### Good to Have
- Fault Tree Visualiser (interactive React Flow diagram)
- Full 7-branch Behavior Tree
- SM-2 spaced review scheduler
- Fatigue detection and pace reduction
- CAT item selection (vs. simple difficulty-ordered selection)
- Teacher/judge debug view with full audit trail

### Out of Scope for Hackathon
- Multi-subject expansion
- Backend persistence (localStorage is fine)
- Social features
- Question authoring UI

---

## 17. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Decision latency | < 50ms per full pipeline tick |
| Determinism | Identical inputs must always produce identical outputs |
| No runtime LLM calls | Zero external AI API calls |
| Explainability | Every output has a traceable reason chain |
| Offline operation | Fully functional without network |
| Browser compatibility | Chrome, Firefox, Safari (modern) |
| Mobile | Responsive layout for tablet use |

---

## 18. Judging Rubric Mapping

| Criterion | Points | How Episteme Scores |
|-----------|--------|---------------------|
| **Intelligence Design** | 30 | Four distinct algorithmic layers: FTA (boolean logic), DAG blame propagation (graph algorithm), IRT 3PL (mathematical model), Behavior Tree (reactive AI). Each handles a different type of reasoning. Edge cases handled: slip vs. lapse vs. mistake; AND-gated fault conditions; BT priority ordering; IRT bounds clamping. |
| **Problem Framing** | 20 | Target user is clear: high school / early college students failing linear algebra. The problem is precise: tools identify *what* is wrong but not *why*. Scope is tight enough for one hackathon but rich enough to demonstrate all four algorithmic layers. |
| **Explainability** | 20 | Every output is fully traceable. The Decision Trace panel shows: fault tree nodes evaluated → MCS returned → blame path → IRT update → BT branch fired → action reason. Template-generated plain-English explanations, not LLM black-box outputs. |
| **Correctness** | 15 | Deterministic by design. Same wrong answer on same question always produces the same diagnosis. IRT uses well-validated 3PL math. SM-2 is a 35-year-validated algorithm. Fault trees are statically authored (no inference). |
| **Technical Depth** | 10 | Three graph structures in one system (DAG, fault tree, behavior tree). Newton-Raphson numerical optimization. Min-heap priority queue for scheduler. Clean modular architecture separating data, engine, store, and UI layers. |
| **Communication** | 5 | Demo path: show a student answering incorrectly → watch fault tree fire → see blame propagate on the concept heatmap → see BT select a contrast case → show the decision trace. Input-to-output path is visual and step-by-step. |

---

*End of PRD — Episteme v2.0*