import os

target_dir = r"d:\Zentrix\frontend\src\pages\intellirev"

replacements = {

    "bg-[
    "bg-[
    "bg-violet-600": "bg-primary text-on-primary",
    "bg-violet-500": "bg-primary-dim text-on-primary",
    "bg-violet-400": "bg-primary text-on-primary",
    "bg-violet-900": "bg-primary-container",
    "bg-violet-500/10": "bg-primary/10",
    "bg-violet-500/20": "bg-primary/20",
    "bg-violet-500/30": "bg-primary/30",

    "from-violet-600/20": "from-primary/20",
    "to-violet-900/10": "to-primary/5",
    "from-indigo-600/20": "from-secondary/20",
    "to-indigo-900/10": "to-secondary/5",
    "from-purple-600/20": "from-primary/20",
    "to-purple-900/10": "to-primary/5",
    "from-fuchsia-600/20": "from-secondary/20",
    "to-fuchsia-900/10": "to-secondary/5",
    "shadow-violet-900/20": "shadow-primary/20",
    "shadow-violet-600/30": "shadow-primary/30",

    "text-violet-300": "text-primary",
    "text-violet-400": "text-primary",
    "text-violet-500": "text-primary-dim",
    "text-violet-600": "text-primary",
    "text-indigo-400": "text-secondary",
    "text-indigo-300": "text-secondary",

    "border-violet-500/10": "border-primary/10",
    "border-violet-500/20": "border-primary/20",
    "border-violet-500/30": "border-primary/30",
    "border-violet-500/40": "border-primary/40",
    "border-violet-500/50": "border-primary/50",
    "border-violet-500": "border-primary",
    "ring-violet-400": "ring-primary",
}

for root, _, files in os.walk(target_dir):
    for f in files:
        if f.endswith(".jsx"):
            p = os.path.join(root, f)
            with open(p, "r", encoding="utf-8") as file:
                content = file.read()

            for old, new in replacements.items():
                content = content.replace(old, new)

            with open(p, "w", encoding="utf-8") as file:
                file.write(content)

print("Theme Fix Applied!")
