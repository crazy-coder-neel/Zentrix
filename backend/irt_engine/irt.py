import math

def fisher_information(theta: float, a: float, b: float, c: float) -> float:
    """
    Compute Fisher Information for a 3PL item.
    I_i(theta) = (1.702 * a)^2 * P_i*(theta) * (1 - P_i*(theta)) * [(P_i(theta) - c) / P_i(theta)]^2 / (1 - P_i(theta))
    """
    D = 1.702
    try:
        exp_val = math.exp(-D * a * (theta - b))
    except OverflowError:
        exp_val = float('inf')
        
    p_star = 1.0 / (1.0 + exp_val)           # P without guessing
    p = c + (1.0 - c) * p_star               # Full 3PL P
    q = 1.0 - p
    
    if (1.0 - c) <= 0.0 or p <= 0.0 or q <= 0.0:
        return 0.0
        
    numerator = ((D * a) ** 2) * p_star * (1.0 - p_star) * (((p - c) / (1.0 - c)) ** 2)
    return numerator / (p * q + 1e-10)

def update_theta(theta: float, responses: list[tuple[str, bool]], questions: dict[str, dict], max_iter=20, tol=1e-6) -> tuple[float, float]:
    """
    responses: list of (question_id, was_correct)
    questions: dict of question_id -> {a, b, c}
    Returns: (new_theta, standard_error)
    """
    if not responses:
        return theta, float('inf')
        
    for _ in range(max_iter):
        L1 = 0.0   # First derivative of log-likelihood
        L2 = 0.0   # Second derivative (negative, for Newton-Raphson)
        
        for q_id, correct in responses:
            if q_id not in questions:
                continue
            q = questions[q_id]
            a, b, c = q.get("discrimination_a", 1.0), q.get("difficulty_b", 0.0), q.get("guessing_c", 0.0)
            
            try:
                exponent = -1.702 * a * (theta - b)
                exp_val = math.exp(exponent)
            except OverflowError:
                exp_val = float('inf')
                
            p_star = 1.0 / (1.0 + exp_val)  # logistic without guessing
            p = c + (1.0 - c) * p_star                    # full 3PL probability
            q_prob = 1.0 - p                            # P(incorrect)
            
            # Derivative of p w.r.t. theta numerator
            w = (1.0 - c) * p_star * (1.0 - p_star)        
            
            # Add small epsilon to probabilities to avoid division by zero
            p_safe = max(p, 1e-10)
            q_prob_safe = max(q_prob, 1e-10)
            
            if correct:
                L1 += (1.702 * a * w) / p_safe
                L2 -= ((1.702 * a * w) / p_safe) ** 2
            else:
                L1 -= (1.702 * a * w) / q_prob_safe
                L2 -= ((1.702 * a * w) / q_prob_safe) ** 2
        
        if abs(L2) < 1e-10:
            break
        
        delta = L1 / (-L2)           # Newton-Raphson step
        theta += delta
        theta = max(-4.0, min(4.0, theta))  # Bound to reasonable range
        
        if abs(delta) < tol:
            break
    
    # Standard error: SE(theta) = 1 / sqrt(Information)
    # Fisher information: I(theta) = -L2
    information = max(-L2, 0.01)     # Avoid division by zero
    se = 1.0 / math.sqrt(information)
    
    return theta, se

def select_next_question(available_questions: list[dict], theta: float, used_ids: set[str]) -> dict | None:
    best_q, best_info = None, -1.0
    for q in available_questions:
        if q["id"] in used_ids:
            continue
            
        a = q.get("discrimination_a", 1.0)
        b = q.get("difficulty_b", 0.0)
        c = q.get("guessing_c", 0.0)
        
        info = fisher_information(theta, a, b, c)
        if info > best_info:
            best_info = info
            best_q = q
            
    return best_q
