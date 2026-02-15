import requests
import json

# NSE F&O list URL
url = "https://www.nseindia.com/api/master-derivative"

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json",
}

try:
    # Get F&O list
    session = requests.Session()
    # First get cookies from main page
    session.get("https://www.nseindia.com", headers=headers)
    
    response = session.get(url, headers=headers, timeout=30)
    data = response.json()
    
    print(f"Fetched {len(data)} F&O stocks")
    print("\nSample:")
    for stock in data[:10]:
        print(f"  {stock}")
        
    # Save to file
    with open('data/fno_stocks.json', 'w') as f:
        json.dump(data, f, indent=2)
        
except Exception as e:
    print(f"Error: {e}")
    print("\nTrying alternative approach...")
