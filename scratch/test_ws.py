import re

with open('js/workspace.js', 'r', encoding='utf-8') as f:
    js_lines = [l.rstrip('\r\n') for l in f.readlines()]

with open('explanations/workspace.txt', 'r', encoding='utf-8') as f:
    exp_text = f.read()

# Let's inspect which lines in js_lines are not in exp_text
missing_lines = []
for i, line in enumerate(js_lines):
    s = line.strip()
    if s and s not in exp_text:
        missing_lines.append((i+1, line))

print(f"Total lines in js/workspace.js: {len(js_lines)}")
print(f"Missing lines: {len(missing_lines)}")
for ln, l in missing_lines[:15]:
    print(f"  Line {ln}: {l}")
