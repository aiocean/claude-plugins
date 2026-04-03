import json
import os
import re

def parse_frontmatter(text):
    match = re.search(r'^---\s*\n(.*?)\n---\s*\n', text, re.DOTALL)
    if not match:
        return None
    fm_text = match.group(1)
    
    # Name is usually `name: something`
    name_match = re.search(r'^name:\s*(.+)$', fm_text, re.MULTILINE)
    name = name_match.group(1).strip() if name_match else ""
    
    # For description, it might be multi-line.
    # Find 'description:' until the next field (which starts with ^[a-zA-Z0-9_-]+:) or end of string
    desc_match = re.search(r'^description:\s*(.*?)(?=\n^[a-zA-Z0-9_-]+:|\Z)', fm_text, re.MULTILINE | re.DOTALL)
    desc = ""
    if desc_match:
        raw_desc = desc_match.group(1).strip()
        # remove > or | at the start if present
        if raw_desc.startswith('>') or raw_desc.startswith('|'):
            raw_desc = raw_desc[1:].strip()
        desc = re.sub(r'\s+', ' ', raw_desc)
        
    return {"name": name, "desc": desc}

def main():
    marketplace_path = '.claude-plugin/marketplace.json'
    with open(marketplace_path, 'r') as f:
        marketplace = json.load(f)

    plugins_data = []
    for p in marketplace.get('plugins', []):
        plugin_name = p['name']
        plugin_dir = os.path.join('plugins', plugin_name)
        skills_dir = os.path.join(plugin_dir, 'skills')
        
        skills_list = []
        if os.path.exists(skills_dir):
            for skill_folder in os.listdir(skills_dir):
                if not os.path.isdir(os.path.join(skills_dir, skill_folder)):
                    continue
                skill_md_path = os.path.join(skills_dir, skill_folder, 'SKILL.md')
                if os.path.exists(skill_md_path):
                    with open(skill_md_path, 'r') as f:
                        content = f.read()
                        fm = parse_frontmatter(content)
                        if fm and fm['name']:
                            skills_list.append(fm)
        
        p_data = {
            "name": p['name'],
            "version": p.get('version', ''),
            "desc": p.get('description', ''),
            "skills": skills_list
        }
        plugins_data.append(p_data)

    # Output to docs/data.json
    os.makedirs('docs', exist_ok=True)
    with open('docs/data.json', 'w') as f:
        json.dump(plugins_data, f, indent=2)
    print(f"Successfully generated docs/data.json with {len(plugins_data)} plugins.")

if __name__ == "__main__":
    main()
