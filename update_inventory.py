import json
import re
import difflib

def clean_pdf_name(name):
    # remove text in parentheses and new lines
    name = re.sub(r'\(.*?\)', '', name)
    name = name.replace('\n', ' ')
    name = ' '.join(name.split())
    return name.lower()

def clean_inv_name(name):
    name = name.lower()
    return ' '.join(name.split())

# 1. Load PDF data
pdf_file = "C:/Users/carri/Desktop/Blessed/pdf_extracted.json"
with open(pdf_file, 'r', encoding='utf-8') as f:
    pdf_rows = json.load(f)

pdf_prices = {}
for row in pdf_rows:
    if len(row) >= 5 and row[2] and row[4]:
        name_clean = clean_pdf_name(row[2])
        # cost is row[4]
        try:
            # extract number from cost
            cost = int(re.sub(r'[^\d]', '', row[4]))
            pdf_prices[name_clean] = cost
        except ValueError:
            pass

# 2. Modify inventory.js
inv_file = "C:/Users/carri/Desktop/Blessed/assets/js/inventory.js"
with open(inv_file, 'r', encoding='utf-8') as f:
    inv_lines = f.readlines()

new_lines = []
success_count = 0
unchanged_count = 0

pdf_price_keys = list(pdf_prices.keys())

for line in inv_lines:
    match = re.search(r'name:\s*"([^"]+)"', line)
    if match:
        orig_name = match.group(1)
        clean_name = clean_inv_name(orig_name)
        
        # Setup specific hardcoded fallback mappings if needed
        hardcoded_map = {
            "m. alhambra n2 men": "m.alhambra n`2 men dupe 212 men",
            "pendora enchantmen blue": "pendora enchantmen blue (dupe d&g light blue intense)",
            "al nashama caprice": "al nashama lattafa caprice",
            "b a d femme (dupe ch)": "b a d femme (dupe carolina herrera)",
            "paris nort express ii": "paris nort express ii deux",
            "qaed al fursan unl": "qaed al fursan unlimited",
            "volare esta puro": "volare",
            "precieux": "precieux",
            "hawas rasasi": "hawas"
        }
        
        if clean_name in hardcoded_map and clean_pdf_name(hardcoded_map[clean_name]) in pdf_prices:
             best_match = clean_pdf_name(hardcoded_map[clean_name])
        else:
            # Exact match first
            best_match = None
            if clean_name in pdf_prices:
                best_match = clean_name
            else:
                # Try finding if clean_name is substring of a pdf key or vice versa
                subs = [k for k in pdf_price_keys if clean_name in k or k in clean_name and len(k)>4]
                if subs:
                    # Prefer exact word matches before substring
                    best_match = max(subs, key=len)
                else:
                    matches = difflib.get_close_matches(clean_name, pdf_price_keys, n=1, cutoff=0.55)
                    if matches:
                        best_match = matches[0]
        
        if best_match:
            new_cost = pdf_prices[best_match]
            # Extra safeguard for anomalies
            if "hawas" in clean_name and "hawas" in best_match:
                pass
            
            # Replace cost in the line
            new_line = re.sub(r'cost:\s*\d+', f'cost: {new_cost}', line)
            
            if new_line != line:
                print(f"Updated '{orig_name}' [{best_match}]: -> {new_cost}")
                success_count += 1
            else:
                unchanged_count += 1
            new_lines.append(new_line)
        else:
            print(f"Warning: Could not find match for '{orig_name}'")
            new_lines.append(line)
    else:
        new_lines.append(line)

with open(inv_file, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"\nDone. Updated {success_count} prices. {unchanged_count} remained unchanged.")
