#!/usr/bin/env python3
"""Fix malformed stock symbols by removing trailing numbers"""
import csv
import re
import os

def clean_symbol(symbol):
    """Remove trailing numbers from symbol names"""
    # Remove trailing digits (e.g., EICHERMOT539 -> EICHERMOT, UPL71 -> UPL)
    cleaned = re.sub(r'\d+$', '', symbol)
    return cleaned

# Fix all CSV files
for page in range(1, 12):
    csv_file = f'data/page{page}/sensibull_trades.csv'
    
    if not os.path.exists(csv_file):
        print(f'Page {page}: File not found')
        continue
    
    rows = []
    with open(csv_file, 'r', newline='') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        for row in reader:
            original = row['Symbol']
            cleaned = clean_symbol(original)
            if original != cleaned:
                print(f'Page {page}: {original} -> {cleaned}')
                row['Symbol'] = cleaned
            rows.append(row)
    
    # Write back
    with open(csv_file, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    
    print(f'Page {page}: Fixed {len(rows)} trades')

print('\n✓ All CSV files cleaned!')
