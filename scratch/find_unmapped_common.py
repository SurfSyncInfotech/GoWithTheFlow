with open('js/common.js', 'r', encoding='utf-8') as f:
    js_lines = [l.rstrip('\r\n') for l in f.readlines()]

with open('explanations/common.txt', 'r', encoding='utf-8') as f:
    exp_lines = [l.rstrip('\r\n') for l in f.readlines()]

mapping = {}
i = 0
while i < len(exp_lines):
    line = exp_lines[i]
    if line.strip() and not line.startswith('//'):
        if i + 1 < len(exp_lines):
            exp = exp_lines[i+1]
            if exp.strip() and not exp.startswith('  ') and not exp.endswith(';') and not exp.endswith('{') and not exp.endswith('}'):
                mapping[line.strip()] = exp
    i += 1

unmapped = []
for i, line in enumerate(js_lines):
    s = line.strip()
    if s and s not in mapping:
        unmapped.append((i+1, line))

print(f"Total unmapped lines in common.js: {len(unmapped)}")
with open('scratch/unmapped_common.txt', 'w', encoding='utf-8') as out:
    for num, line in unmapped:
        out.write(f"{num:4d}: {line}\n")

print("Written scratch/unmapped_common.txt")
