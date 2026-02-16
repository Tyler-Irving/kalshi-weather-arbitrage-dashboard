#!/usr/bin/env python3
"""
Quick test to verify WebSocket log streaming consumer works.
"""
import asyncio
import websockets
import json

async def test_log_stream():
    uri = "ws://localhost:8000/ws/logs/"
    
    print(f"Connecting to {uri}...")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✓ Connected!")
            
            # Receive first message (should be history)
            message = await websocket.recv()
            data = json.loads(message)
            
            print(f"\n✓ Received history message:")
            print(f"  Type: {data.get('type')}")
            print(f"  Lines: {len(data.get('lines', []))}")
            
            if data.get('lines'):
                print(f"\n  Last 3 lines:")
                for line in data['lines'][-3:]:
                    print(f"    {line}")
            
            # Wait for a few more messages (new lines)
            print(f"\n✓ Waiting for new log lines (10 seconds)...")
            try:
                for _ in range(10):
                    message = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                    data = json.loads(message)
                    if data.get('type') == 'line':
                        print(f"  New line: {data.get('text')}")
            except asyncio.TimeoutError:
                print("  (No new lines written to log file, this is normal)")
            
            print("\n✓ Test passed!")
            
    except Exception as e:
        print(f"\n✗ Error: {e}")
        print(f"\nMake sure Django is running with:")
        print(f"  cd backend/")
        print(f"  source venv/bin/activate")
        print(f"  daphne -b 127.0.0.1 -p 8000 config.asgi:application")

if __name__ == '__main__':
    asyncio.run(test_log_stream())
