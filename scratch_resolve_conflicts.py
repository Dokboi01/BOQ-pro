import os
import re

files = [
    r'src/data/catalog/building/concreteWorks.js',
    r'src/data/catalog/building/externalWorks.js',
    r'src/data/catalog/building/plumbing.js',
    r'src/data/catalog/building/roofing.js'
]

base_path = r'c:\Users\adedo\.gemini\another one'

for rel_path in files:
    abs_path = os.path.join(base_path, rel_path)
    with open(abs_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Conflict pattern: <<<<<<< HEAD ... ======= ... >>>>>>> ee28f5c...
    # We want to keep the HEAD part.
    new_content = re.sub(r'<<<<<<< HEAD\n(.*?)\n?=======\n(.*?)\n?>>>>>>> [0-9a-f]+', r'\1', content, flags=re.DOTALL)
    
    with open(abs_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Resolved conflict in {rel_path}")
