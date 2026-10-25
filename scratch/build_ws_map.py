with open('explanations/workspace.txt', 'r', encoding='utf-8') as f:
    exp_lines = f.readlines()

print("Total lines in workspace.txt:", len(exp_lines))

# Build a mapping of js_line -> explanation line(s) from existing workspace.txt
mapping = {}
i = 0
while i < len(exp_lines):
    line = exp_lines[i].rstrip('\r\n')
    # if line is code and next line is explanation
    if line.strip() and not line.startswith('//'):
        if i + 1 < len(exp_lines):
            exp = exp_lines[i+1].rstrip('\r\n')
            if exp.strip() and not exp.startswith('  ') and not exp.endswith(';') and not exp.endswith('{') and not exp.endswith('}'):
                mapping[line.strip()] = exp
    i += 1

print("Mapped unique code lines from existing workspace.txt:", len(mapping))
