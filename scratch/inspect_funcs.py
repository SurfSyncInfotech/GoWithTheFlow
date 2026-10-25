with open('js/workspace.js', 'r', encoding='utf-8') as f:
    js_content = f.read()

# Let's inspect navigatePointsWithArrows, isCaretAtBeginning, isCaretAtEnd
start = js_content.find('function isCaretAtBeginning')
end = js_content.find('function openEvidenceDrawer')
print('=== CARET & ARROW NAV ===')
print(js_content[start:end])
