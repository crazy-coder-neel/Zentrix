import sys
import os

# Ensure the backend directory is on sys.path so that
# `import dag_engine` and `import fault_tree_engine` work from tests.
sys.path.insert(0, os.path.dirname(__file__))
