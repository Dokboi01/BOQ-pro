import re

try:
    with open('src/components/workspace/BOQWorkspace.jsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the main return statement of BOQWorkspace
    # It should look like `return (` followed by JSX.
    # Searching from the end to find the main return and not an inner component's return.
    returns = [m.start() for m in re.finditer(r'return\s*\(\s*<[^>]+>', content)]
    
    if returns:
        # The last matches are likely the main component's return
        start_idx = returns[-1]
        
        # Get a snippet of the JSX structure (first 3000 chars)
        snippet = content[start_idx:start_idx+3000]
        print("--- JSX Layout Structure ---")
        lines = snippet.split('\n')
        for i, line in enumerate(lines[:100]):
            print(f"{i}: {line}")

except Exception as e:
    print(f"Error: {e}")
