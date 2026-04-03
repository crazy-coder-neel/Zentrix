import py_trees
from py_trees import common
from asteval import Interpreter
from dataclasses import dataclass, asdict

@dataclass
class BTAction:
    type: str
    params: dict
    reason: str
    trace: list

class EvalCondition(py_trees.behaviour.Behaviour):
    def __init__(self, name: str, expression: str):
        super().__init__(name=name)
        self.expression = expression
        self.aeval = Interpreter()

    def update(self) -> common.Status:

        bb = py_trees.blackboard.Client(name=self.name)
        bb.register_key(key="state", access=py_trees.common.Access.READ)
        state_dict = bb.state

        for k, v in state_dict.items():
            self.aeval.symtable[k] = v

        result = self.aeval(self.expression)

        trace_logger = bb.get("trace_logger")

        if result is True:
            if trace_logger is not None:
                trace_logger.append({"branch": self.name, "fired": True})
            return common.Status.SUCCESS
        else:
            if trace_logger is not None:
                trace_logger.append({"branch": self.name, "fired": False})
            return common.Status.FAILURE

class ActionNode(py_trees.behaviour.Behaviour):
    def __init__(self, name: str, action_type: str, reason_template: str, params_extractor: callable = None):
        super().__init__(name=name)
        self.action_type = action_type
        self.reason_template = reason_template
        self.params_extractor = params_extractor or (lambda s: {})

    def update(self) -> common.Status:
        bb = py_trees.blackboard.Client(name=self.name)
        bb.register_key(key="state", access=py_trees.common.Access.READ)
        state_dict = bb.state

        params = self.params_extractor(state_dict)
        reason = self.reason_template.format(**state_dict)

        bb.register_key(key="output_action", access=py_trees.common.Access.WRITE)
        bb.output_action = {
            "type": self.action_type,
            "params": params,
            "reason": reason
        }
        return common.Status.SUCCESS

root = py_trees.composites.Selector(name="ROOT", memory=False)

danger_seq = py_trees.composites.Sequence(name="DANGER_ZONE", memory=False)
danger_cond = EvalCondition("Check Overconfident Misconception", "calibration_state == 'overconfident' and active_misconception_id is not None")
danger_act = ActionNode("Contrast Case", "CONTRAST_CASE", "Overconfident + confirmed misconception {active_misconception_id}.", lambda s: {"misconception_id": s.get("active_misconception_id")})
danger_seq.add_children([danger_cond, danger_act])

root.add_child(danger_seq)

py_trees.blackboard.Blackboard.set("state", {"calibration_state": "overconfident", "active_misconception_id": "M01"})
py_trees.blackboard.Blackboard.set("trace_logger", [])

root.tick_once()

print(py_trees.blackboard.Blackboard.get("output_action"))
print(py_trees.blackboard.Blackboard.get("trace_logger"))

