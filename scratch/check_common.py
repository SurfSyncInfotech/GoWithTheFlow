with open('js/common.js', 'r', encoding='utf-8') as f:
    js_lines = f.readlines()
with open('explanations/common.txt', 'r', encoding='utf-8') as f:
    exp_text = f.read()

current_func = "GLOBAL"
missing_by_func = {}

for line in js_lines:
    s = line.strip()
    if s.startswith('function ') or ' = function' in s:
        current_func = s
    if s and s not in exp_text:
        missing_by_func.setdefault(current_func, []).append(s)

for func, miss in missing_by_func.items():
    print(f'{func}: {len(miss)} lines missing')
