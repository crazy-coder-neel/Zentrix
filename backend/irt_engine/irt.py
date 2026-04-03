import math

def fisher_information(theta: float, a: float, b: float, c: float) -> float:

    D = 1.702
    try:
        exp_val = math.exp(-D * a * (theta - b))
    except OverflowError:
        exp_val = float('inf')

    p_star = 1.0 / (1.0 + exp_val)           
    p = c + (1.0 - c) * p_star               
    q = 1.0 - p

    if (1.0 - c) <= 0.0 or p <= 0.0 or q <= 0.0:
        return 0.0

    numerator = ((D * a) ** 2) * p_star * (1.0 - p_star) * (((p - c) / (1.0 - c)) ** 2)
    return numerator / (p * q + 1e-10)

def update_theta(theta: float, responses: list[tuple[str, bool]], questions: dict[str, dict], max_iter=20, tol=1e-6) -> tuple[float, float]:

    if not responses:
        return theta, float('inf')

    for _ in range(max_iter):
        L1 = 0.0   
        L2 = 0.0   

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

            p_star = 1.0 / (1.0 + exp_val)  
            p = c + (1.0 - c) * p_star                    
            q_prob = 1.0 - p                            

            w = (1.0 - c) * p_star * (1.0 - p_star)        

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

        delta = L1 / (-L2)           
        theta += delta
        theta = max(-4.0, min(4.0, theta))  

        if abs(delta) < tol:
            break

    information = max(-L2, 0.01)     
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
