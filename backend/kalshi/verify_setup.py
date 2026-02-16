#!/usr/bin/env python3
"""
Quick verification script for Kalshi proxy setup.

Run this to verify:
1. Credentials are loadable
2. Daemon auth code is importable
3. API calls work

Usage:
    python verify_setup.py
"""
import sys
from pathlib import Path

# Add Django project to path
sys.path.insert(0, str(Path(__file__).parent.parent))

def main():
    print("=" * 60)
    print("Kalshi Proxy Setup Verification")
    print("=" * 60)
    
    # 1. Check credential files
    print("\n1. Checking credential files...")
    import os
    secrets_dir = Path(os.getenv('KALSHI_SECRETS_DIR', os.path.expanduser('~/.openclaw/.secrets')))
    kalshi_json = secrets_dir / 'kalshi.json'
    kalshi_pem = secrets_dir / 'kalshi_private.pem'
    
    if not kalshi_json.exists():
        print(f"   ❌ Missing: {kalshi_json}")
        return False
    print(f"   ✅ Found: {kalshi_json}")
    
    if not kalshi_pem.exists():
        print(f"   ❌ Missing: {kalshi_pem}")
        return False
    print(f"   ✅ Found: {kalshi_pem}")
    
    # 2. Check daemon code is importable
    print("\n2. Checking daemon import...")
    try:
        import os
        daemon_dir = os.getenv('KALSHI_DAEMON_DIR')
        if not daemon_dir:
            print(f"   ❌ KALSHI_DAEMON_DIR environment variable not set")
            return False
        sys.path.insert(0, daemon_dir)
        from kalshi_unified import kalshi_request
        print("   ✅ Successfully imported kalshi_request from daemon")
    except ImportError as e:
        print(f"   ❌ Failed to import daemon code: {e}")
        return False
    
    # 3. Try loading client
    print("\n3. Initializing Kalshi client...")
    try:
        from kalshi_client import get_client
        client = get_client()
        print("   ✅ Client initialized successfully")
    except Exception as e:
        print(f"   ❌ Failed to initialize client: {e}")
        return False
    
    # 4. Test API call
    print("\n4. Testing live API call (balance)...")
    try:
        result = client.get_balance()
        balance_cents = result['balance']
        balance_dollars = balance_cents / 100
        print(f"   ✅ Balance: ${balance_dollars:,.2f} ({balance_cents:,} cents)")
    except Exception as e:
        print(f"   ❌ API call failed: {e}")
        return False
    
    # 5. Test caching
    print("\n5. Testing cache (second call should be instant)...")
    import time
    start = time.time()
    result2 = client.get_balance()
    elapsed_ms = (time.time() - start) * 1000
    
    if elapsed_ms < 10:  # Should be near-instant from cache
        print(f"   ✅ Cache working (response in {elapsed_ms:.2f}ms)")
    else:
        print(f"   ⚠️  Cache might not be working ({elapsed_ms:.2f}ms)")
    
    # 6. Test positions endpoint
    print("\n6. Testing positions endpoint...")
    try:
        result = client.get_positions()
        positions = result['event_positions']
        print(f"   ✅ Positions: {len(positions)} open event(s)")
        
        if positions:
            # Show first position summary
            first = positions[0]
            ticker = first.get('event_ticker', 'N/A')
            exposure = first.get('event_exposure', 0)
            print(f"      Example: {ticker} (exposure: {exposure} cents)")
    except Exception as e:
        print(f"   ❌ Positions call failed: {e}")
        return False
    
    # Success!
    print("\n" + "=" * 60)
    print("✅ ALL CHECKS PASSED - Kalshi proxy is ready!")
    print("=" * 60)
    print("\nNext steps:")
    print("  1. Add 'kalshi' to INSTALLED_APPS in config/settings.py")
    print("  2. Add 'kalshi.urls' to config/urls.py")
    print("  3. Test endpoints via Django dev server")
    print("  4. Wire into /api/v1/status/ endpoint (TICK-004)")
    print()
    return True

if __name__ == '__main__':
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
