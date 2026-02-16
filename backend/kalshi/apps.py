"""
Django app configuration for Kalshi proxy.
"""
from django.apps import AppConfig


class KalshiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'kalshi'
    verbose_name = 'Kalshi API Proxy'
    
    def ready(self):
        """
        App initialization - verify credentials on startup.
        """
        # Import here to avoid circular imports
        try:
            from .kalshi_client import get_client
            # Initialize client to verify credentials exist
            get_client()
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to initialize Kalshi client: {e}")
            # Don't fail startup - just log warning
