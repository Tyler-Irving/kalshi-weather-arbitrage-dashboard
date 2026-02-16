"""
WebSocket consumer for real-time log streaming.
Per TICK-009: Tails kalshi_unified_log.txt and streams new lines to connected clients.
"""
import asyncio
import json
from pathlib import Path
import aiofiles
from channels.generic.websocket import AsyncWebsocketConsumer
from django.conf import settings


class LogConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for log streaming.
    
    On connect:
    - Sends last 50 lines as {type: 'history', lines: [...]}
    
    Then continuously:
    - Tails log file with 1s poll interval
    - Sends new lines as {type: 'line', text: '...'}
    """
    
    async def connect(self):
        await self.accept()
        self.running = True
        self.log_path = Path(settings.TRADING_DIR) / 'kalshi_unified_log.txt'
        
        # Start tailing task and store reference for cleanup
        self.tail_task = asyncio.create_task(self.tail_log())
    
    async def disconnect(self, close_code):
        self.running = False
        
        # Cancel the tailing task to prevent leaks
        if hasattr(self, 'tail_task') and not self.tail_task.done():
            self.tail_task.cancel()
            try:
                await self.tail_task
            except asyncio.CancelledError:
                pass  # Expected when cancelling
    
    async def tail_log(self):
        """
        Tail the log file asynchronously using aiofiles.
        Sends initial history, then streams new lines.
        """
        try:
            # Send last 50 lines on connect
            if self.log_path.exists():
                async with aiofiles.open(self.log_path, 'r') as f:
                    content = await f.read()
                    lines = content.strip().split('\n')
                    history = [line for line in lines[-50:] if line.strip()]
                    
                    await self.send(text_data=json.dumps({
                        'type': 'history',
                        'lines': history
                    }))
                
                # Start tailing from end
                file_size = self.log_path.stat().st_size
            else:
                # File doesn't exist yet - send empty history
                await self.send(text_data=json.dumps({
                    'type': 'history',
                    'lines': []
                }))
                file_size = 0
            
            # Tail loop
            while self.running:
                if self.log_path.exists():
                    current_size = self.log_path.stat().st_size
                    
                    if current_size > file_size:
                        # File grew - read new content asynchronously
                        async with aiofiles.open(self.log_path, 'r') as f:
                            await f.seek(file_size)
                            new_content = await f.read()
                            
                            # Send each new line
                            for line in new_content.split('\n'):
                                if line.strip():
                                    await self.send(text_data=json.dumps({
                                        'type': 'line',
                                        'text': line.strip()
                                    }))
                        
                        file_size = current_size
                    elif current_size < file_size:
                        # File was truncated/rotated - resync
                        file_size = 0
                
                await asyncio.sleep(1)
                
        except Exception as e:
            # Send error to client
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': f'Log streaming error: {str(e)}'
            }))
