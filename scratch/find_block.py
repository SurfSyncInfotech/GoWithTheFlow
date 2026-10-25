with open('explanations/index.txt', 'r', encoding='utf-8') as f:
    text = f.read()

idx1 = text.find('} else if (action === "rename-round") {')
idx2 = text.find('} else if (action === "duplicate-round") {')
print(repr(text[idx1:idx2]))
