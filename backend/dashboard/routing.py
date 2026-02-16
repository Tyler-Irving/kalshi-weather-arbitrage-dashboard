"""
WebSocket URL routing for Django Channels.
TICK-009: WebSocket log streaming.
"""
from django.urls import path
from .consumers import LogConsumer

websocket_urlpatterns = [
    path('ws/logs/', LogConsumer.as_asgi()),
]
