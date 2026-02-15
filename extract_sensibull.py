#!/usr/bin/env python3
"""
Sensibull Verified P&L Extractor - Python Version
Extracts trading data from Sensibull verified P&L pages page by page
"""

import json
import re
import csv
import os
import sys
from datetime import datetime
from playwright.sync_api import sync_playwright

URL = 'https://web.sensibull.com/verified-pnl/fanged-okra/d1wUwvRTgrtPsD'

def clean_num(text):
    """Extract numeric value from text"""
    if not text:
        return '0'
    match = re.search(r'[\d.-]+', text.replace(',', ''))
    return match.group(0) if match else '0'

def parse_contract(name):
    """Parse option contract details from strings like 'NRML24thFeb2500 PE' or '24th Feb 960 PE'"""
    # Clean up the name - remove NRML/EML/CNC/MIS etc. at the start
    cleaned = re.sub(r'^(NRML|EML|CNC|MIS|SL|BO|CO)\s*', '', name, flags=re.IGNORECASE)
    
    # Try to match date pattern: 24thFeb or 24th Feb
    pattern = r'(\d+(?:st|nd|rd|th)?)\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d+(?:\.\d+)?)\s*(CE|PE)'
    match = re.search(pattern, cleaned, re.IGNORECASE)
    
    if match:
        day, month_str, strike, opt_type = match.groups()
        months = {
            'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
            'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
        }
        month = months.get(month_str.lower()[:3], '01')
        year = '2026' if month in ['01', '02'] else '2025'
        expiry = f"{year}-{month}-{day.zfill(2)}"
        return opt_type.upper(), strike, expiry
    
    # Try alternate pattern: just strike and type
    pattern2 = r'(\d+(?:\.\d+)?)\s*(CE|PE)'
    match2 = re.search(pattern2, cleaned, re.IGNORECASE)
    if match2:
        strike, opt_type = match2.groups()
        return opt_type.upper(), strike, ''
    
    return 'STOCK', '', ''

def parse_date(text):
    """Parse date from text like '13Feb', '30Jan', '31Dec', '27Nov'"""
    match = re.search(r'(\d{1,2})\s*(\w{3})', text, re.IGNORECASE)
    if match:
        day, month_str = match.groups()
        months = {
            'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
            'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
        }
        month = months.get(month_str.lower()[:3], '01')
        # Determine year based on month
        if month in ['01', '02', '03']:
            year = '2026'
        else:
            year = '2025'
        return f"{year}-{month}-{day.zfill(2)}"
    return ''

def extract_symbol(page_text):
    """Extract stock symbol from page text - dynamic extraction without hardcoded list"""
    
    # Pattern 1: "Notes" followed by LETTERS ONLY (no digits), then price number
    # Format: "NotesADANIGREEN 950.50" or "NotesADANIGREEN950.50"
    # Use [A-Z]+ to match only letters, then require digit or space+digit
    match = re.search(r'Notes([A-Z]{3,20})(?=\s*\d)', page_text, re.IGNORECASE)
    if match:
        return match.group(1).upper()
    
    # Pattern 2: "Total P&L" followed by +/-amount then SYMBOL price
    # Format: "Total P&L+16,410ADANIGREEN 950.50"
    match = re.search(r'Total P&L[\+\-]?[\d,]+([A-Z]{3,20})\s+[\d,]+\.\d{2}', page_text, re.IGNORECASE)
    if match:
        return match.group(1).upper()
    
    # Pattern 3: Look for uppercase LETTERS ONLY word followed by price
    # SYMBOL followed by space and price like "123.45" or "1,234.56"
    matches = re.findall(r'([A-Z]{3,20})\s+[\d,]+\.\d{2}', page_text)
    if matches:
        # Filter out common non-stock words and return first valid
        invalid_words = {'TOTAL', 'P&L', 'NAME', 'QTY', 'AVG', 'LTP', 'NOTES', 'PAGE', 'FEB', 'JAN', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'}
        for m in matches:
            if m.upper() not in invalid_words and not any(c.isdigit() for c in m):
                return m.upper()
    
    # Pattern 4: Look for symbol near "Notes" with any whitespace pattern
    # Handle cases where Notes and symbol might have variable spacing
    matches = re.findall(r'Notes\s*([A-Z]{3,20})', page_text, re.IGNORECASE)
    if matches:
        for m in matches:
            if len(m) >= 3 and m.upper() not in {'NOTES', 'TOTAL', 'P&L'}:
                return m.upper()
    
    # Pattern 5: Find all uppercase words that look like stock symbols
    # Strict pattern: 3-20 letters, no digits, before a price
    matches = re.findall(r'\b([A-Z]{3,20})\b[^\n]{0,100}\d+\.\d{2}', page_text)
    if matches:
        invalid_words = {'TOTAL', 'PRICE', 'VALUE', 'STOCK', 'SHARE', 'TRADE', 'MARKET', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY', 'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'}
        for m in matches:
            if m.upper() not in invalid_words and m.isalpha():
                return m.upper()
    
    return 'UNKNOWN'

def extract_pnl(page_text):
    """Extract Total P&L from page text"""
    match = re.search(r'Total P&L\s*([\+\-]?[\d,]+)', page_text, re.IGNORECASE)
    if match:
        return clean_num(match.group(1))
    return ''

def extract_trades_from_table(page, symbol, daily_pnl):
    """Extract trade data from table rows"""
    trades = []
    
    try:
        # Get all table rows that have data cells
        rows = page.locator('tr:has(td)').all()
        
        for row in rows:
            try:
                cells = row.locator('td').all()
                if len(cells) >= 5:
                    name = cells[0].text_content().strip() if cells[0].text_content() else ''
                    if not name or name == 'Name' or name.lower() == 'name':
                        continue
                    
                    # Parse contract details from name like "NRML24thFeb2500 PE"
                    option_type, strike, expiry = parse_contract(name)
                    
                    qty = clean_num(cells[1].text_content())
                    avg = clean_num(cells[2].text_content())
                    ltp = clean_num(cells[3].text_content())
                    pnl = clean_num(cells[4].text_content())
                    
                    trades.append({
                        'Date': '',
                        'Symbol': symbol,
                        'Option_Type': option_type,
                        'Strike': strike,
                        'Expiry': expiry,
                        'Qty': qty,
                        'Avg_Price': avg,
                        'LTP': ltp,
                        'P_L': pnl,
                        'Daily_Total_PnL': daily_pnl,
                        'Verification_Timestamp': '',
                        'Page': 1
                    })
            except Exception as e:
                continue
    except Exception as e:
        pass
    
    return trades

def extract_page(page, page_num, timestamp):
    """Extract all trades from current page"""
    all_trades = []
    daily_summaries = []
    
    # Find all date elements (all months: Jan-Dec)
    all_date_elements = page.locator('text=/^\\d{1,2}(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i').all()
    date_elements = []
    seen_dates = set()
    
    for elem in all_date_elements:
        text = (elem.text_content() or '').strip()
        if text and text not in seen_dates:
            seen_dates.add(text)
            date_elements.append(elem)
    
    print(f'Found {len(date_elements)} date cards on page {page_num}')
    
    for i, date_elem in enumerate(date_elements):
        date_str = (date_elem.text_content() or '').strip()
        date = parse_date(date_str)
        
        try:
            # Check if no-trade day
            parent_text = date_elem.locator('xpath=../..').text_content() or ''
            if 'NoTradeDay' in parent_text or 'not shared' in parent_text.lower():
                print(f'  [SKIP] No Trade Day: {date_str}')
                continue
            
            # Scroll and click using JavaScript
            date_elem.scroll_into_view_if_needed()
            page.wait_for_timeout(300)
            
            # JavaScript click for reliability
            handle = date_elem.element_handle()
            if handle:
                handle.evaluate('el => el.click()')
            
            # Retry mechanism for failed extractions
            max_retries = 3
            symbol = 'UNKNOWN'
            daily_pnl = ''
            
            for retry in range(max_retries):
                page.wait_for_timeout(2000)
                
                page_text = page.text_content('body') or ''
                symbol = extract_symbol(page_text)
                daily_pnl = extract_pnl(page_text)
                
                if symbol != 'UNKNOWN':
                    break
                
                # Retry click and wait - get fresh handle
                if retry < max_retries - 1:
                    print(f'    Retry {retry + 1} for {date_str}...')
                    fresh_elems = [e for e in page.locator('text=/^\\d{1,2}(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i').all() 
                                  if (e.text_content() or '').strip() == date_str]
                    if fresh_elems:
                        fresh_handle = fresh_elems[0].element_handle()
                        if fresh_handle:
                            fresh_handle.evaluate('el => el.click()')
            
            if symbol != 'UNKNOWN':
                trades = extract_trades_from_table(page, symbol, daily_pnl)
                
                # Add date to trades
                for trade in trades:
                    trade['Date'] = date
                    trade['Verification_Timestamp'] = timestamp
                    trade['Page'] = page_num
                
                all_trades.extend(trades)
                
                daily_summaries.append({
                    'date': date,
                    'totalPnL': daily_pnl,
                    'timestamp': timestamp,
                    'numTrades': len(trades) or 1,
                    'trades': trades
                })
                
                # If no table rows, add summary trade
                if not trades:
                    summary_trade = {
                        'Date': date,
                        'Symbol': symbol,
                        'Option_Type': 'STOCK',
                        'Strike': '',
                        'Expiry': '',
                        'Qty': '0',
                        'Avg_Price': '0.00',
                        'LTP': '',
                        'P_L': daily_pnl,
                        'Daily_Total_PnL': daily_pnl,
                        'Verification_Timestamp': timestamp,
                        'Page': page_num
                    }
                    all_trades.append(summary_trade)
                
                print(f'  [{i+1}/{len(date_elements)}] {date} | {symbol} | {len(trades) or 1} trades | P&L: {daily_pnl}')
            else:
                print(f'  [{i+1}/{len(date_elements)}] {date} | FAILED to extract symbol')
            
        except Exception as e:
            print(f'  [!] Error on {date_str}: {e}')
    
    return all_trades, daily_summaries

def go_to_page(page, page_num):
    """Navigate to specific page number using pagination buttons"""
    if page_num == 1:
        return True
    
    try:
        print(f'  Navigating to page {page_num}...')
        
        for i in range(page_num - 1):
            # Find the pagination container
            pagination = page.locator('text=/Page.*of 11/i').first
            if pagination.count() == 0:
                print(f'  Pagination not found')
                return False
            
            # Get parent and find buttons
            parent = pagination.locator('xpath=..')
            buttons = parent.locator('button').all()
            
            if len(buttons) < 3:
                print(f'  Not enough navigation buttons found')
                return False
            
            # Check if button is enabled before clicking
            next_btn = buttons[2]
            is_enabled = next_btn.is_enabled()
            
            if not is_enabled:
                print(f'  Next button disabled, waiting...')
                page.wait_for_timeout(3000)
                # Refresh buttons list
                buttons = parent.locator('button').all()
                next_btn = buttons[2]
            
            # Click the "next" button (typically index 2)
            print(f'  Clicking next button ({i+1}/{page_num-1})...')
            next_btn.click(timeout=10000)
            page.wait_for_timeout(5000)
        
        return True
    except Exception as e:
        print(f'  Error navigating to page {page_num}: {e}')
        return False

def save_page_data(page_num, trades, summaries):
    """Save data for a specific page to its own folder"""
    folder = f'data/page{page_num}'
    os.makedirs(folder, exist_ok=True)
    
    output_csv = f'{folder}/sensibull_trades.csv'
    output_json = f'{folder}/sensibull_trades.json'
    
    if trades:
        # Save CSV
        headers = ['Date', 'Symbol', 'Option_Type', 'Strike', 'Expiry', 
                   'Qty', 'Avg_Price', 'LTP', 'P_L', 
                   'Daily_Total_PnL', 'Verification_Timestamp', 'Page']
        
        with open(output_csv, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=headers)
            writer.writeheader()
            writer.writerows(trades)
        print(f'  Saved CSV: {output_csv}')
        
        # Save JSON
        output_data = {
            'totalTrades': len(trades),
            'totalDays': len(summaries),
            'extractedAt': datetime.now().isoformat(),
            'trades': trades,
            'dailySummaries': summaries
        }
        
        with open(output_json, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2)
        print(f'  Saved JSON: {output_json}')
        
        # Print symbol stats
        symbol_count = {}
        for trade in trades:
            sym = trade['Symbol']
            symbol_count[sym] = symbol_count.get(sym, 0) + 1
        
        print(f'\n  Page {page_num} Symbol distribution:')
        for sym, count in sorted(symbol_count.items(), key=lambda x: -x[1]):
            print(f'    {sym}: {count}')

def main():
    print('=' * 70)
    print('SENSIBULL EXTRACTOR - Page by Page')
    print('=' * 70)
    
    # Extract single page
    pages_to_extract = [11]
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = context.new_page()
        
        print(f'\nLoading page...')
        page.goto(URL, wait_until='networkidle', timeout=60000)
        page.wait_for_timeout(5000)
        
        # Get verification timestamp
        timestamp = ''
        try:
            header_elem = page.locator('text=/Taken @/').first
            timestamp = header_elem.text_content() or ''
        except Exception:
            pass
        
        # Extract multiple pages
        for target_page in pages_to_extract:
            print(f'\n{"=" * 70}')
            print(f'EXTRACTING PAGE {target_page}')
            print('=' * 70)
            
            # Navigate to target page if needed
            if not go_to_page(page, target_page):
                print(f'Failed to navigate to page {target_page}, skipping...')
                continue
            
            # Extract page data
            trades, summaries = extract_page(page, target_page, timestamp)
            
            # Save data
            if trades:
                save_page_data(target_page, trades, summaries)
                
                print(f'\nPAGE {target_page} COMPLETE: {len(trades)} trades from {len(summaries)} days')
            else:
                print(f'\nNo trades extracted from page {target_page}')
            
            # Small delay between pages
            if target_page != pages_to_extract[-1]:
                page.wait_for_timeout(2000)
        
        browser.close()
        
        print(f'\nPage {target_page} extraction finished!')

if __name__ == '__main__':
    main()
