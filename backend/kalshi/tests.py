"""
Tests for Kalshi API proxy.

Note: These tests require valid Kalshi credentials to be present.
Mock tests can be added for CI/CD environments.
"""
from django.test import TestCase, Client
from unittest.mock import patch, MagicMock
import json


class KalshiClientTests(TestCase):
    """Test KalshiClient caching and error handling."""
    
    def setUp(self):
        from .kalshi_client import get_client
        self.client = get_client()
        self.client.clear_cache()  # Start with empty cache
    
    @patch('kalshi.kalshi_client.kalshi_request')
    def test_balance_caching(self, mock_request):
        """Test balance endpoint caching (60s TTL)."""
        mock_request.return_value = {'balance': 100000}
        
        # First call should hit API
        result1 = self.client.get_balance()
        self.assertEqual(result1['balance'], 100000)
        self.assertEqual(mock_request.call_count, 1)
        
        # Second call within TTL should use cache
        result2 = self.client.get_balance()
        self.assertEqual(result2['balance'], 100000)
        self.assertEqual(mock_request.call_count, 1)  # No additional call
    
    @patch('kalshi.kalshi_client.kalshi_request')
    def test_positions_caching(self, mock_request):
        """Test positions endpoint caching (30s TTL)."""
        mock_request.return_value = {'event_positions': [{'event_ticker': 'TEST'}]}
        
        result = self.client.get_positions()
        self.assertEqual(len(result['event_positions']), 1)
        self.assertEqual(mock_request.call_count, 1)
    
    @patch('kalshi.kalshi_client.kalshi_request')
    def test_error_fallback_to_stale_cache(self, mock_request):
        """Test that errors return stale cache instead of raising."""
        # First call succeeds
        mock_request.return_value = {'balance': 100000}
        result1 = self.client.get_balance()
        
        # Second call fails, should return stale cache
        mock_request.side_effect = Exception("API error")
        result2 = self.client.get_balance()
        
        # Should get stale cached value
        self.assertEqual(result2['balance'], 100000)
    
    @patch('kalshi.kalshi_client.kalshi_request')
    def test_market_detail_with_ticker(self, mock_request):
        """Test market detail endpoint."""
        mock_request.return_value = {'market': {'ticker': 'TEST-TICKER'}}
        
        result = self.client.get_market('TEST-TICKER')
        self.assertEqual(result['market']['ticker'], 'TEST-TICKER')
        
        # Verify correct path was called
        mock_request.assert_called_with('GET', '/trade-api/v2/markets/TEST-TICKER')


class KalshiViewTests(TestCase):
    """Test Django REST views."""
    
    def setUp(self):
        self.client = Client()
    
    @patch('kalshi.views.get_client')
    def test_balance_view_success(self, mock_get_client):
        """Test balance endpoint returns 200."""
        mock_client = MagicMock()
        mock_client.get_balance.return_value = {'balance': 100000}
        mock_get_client.return_value = mock_client
        
        response = self.client.get('/api/v1/kalshi/balance/')
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertEqual(data['balance'], 100000)
    
    @patch('kalshi.views.get_client')
    def test_balance_view_error(self, mock_get_client):
        """Test balance endpoint handles errors gracefully."""
        from .kalshi_client import KalshiClientError
        
        mock_client = MagicMock()
        mock_client.get_balance.side_effect = KalshiClientError("API timeout")
        mock_get_client.return_value = mock_client
        
        response = self.client.get('/api/v1/kalshi/balance/')
        self.assertEqual(response.status_code, 503)
        
        data = response.json()
        self.assertIn('error', data)
        self.assertIn('API timeout', data['error'])
    
    @patch('kalshi.views.get_client')
    def test_orders_view_with_params(self, mock_get_client):
        """Test orders endpoint with query parameters."""
        mock_client = MagicMock()
        mock_client.get_orders.return_value = {'orders': [], 'cursor': None}
        mock_get_client.return_value = mock_client
        
        response = self.client.get('/api/v1/kalshi/orders/?status=open&limit=10')
        self.assertEqual(response.status_code, 200)
        
        # Verify client was called with correct params
        mock_client.get_orders.assert_called_once_with(status='open', limit=10)
    
    @patch('kalshi.views.get_client')
    def test_market_detail_view(self, mock_get_client):
        """Test market detail endpoint with ticker path param."""
        mock_client = MagicMock()
        mock_client.get_market.return_value = {'market': {'ticker': 'TEST-TICKER'}}
        mock_get_client.return_value = mock_client
        
        response = self.client.get('/api/v1/kalshi/markets/TEST-TICKER/')
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertEqual(data['market']['ticker'], 'TEST-TICKER')
    
    @patch('kalshi.views.get_client')
    def test_events_view_with_series_filter(self, mock_get_client):
        """Test events endpoint with series_ticker filter."""
        mock_client = MagicMock()
        mock_client.get_events.return_value = {'events': [], 'cursor': None}
        mock_get_client.return_value = mock_client
        
        response = self.client.get('/api/v1/kalshi/events/?series_ticker=KXHIGHTPHX')
        self.assertEqual(response.status_code, 200)
        
        # Verify filter was passed
        call_args = mock_client.get_events.call_args
        self.assertEqual(call_args.kwargs['series_ticker'], 'KXHIGHTPHX')


class IntegrationTests(TestCase):
    """
    Integration tests that call the real Kalshi API.
    
    Only run if credentials are available.
    Skip in CI/CD.
    """
    
    def setUp(self):
        import os
        from pathlib import Path
        self.secrets_dir = Path(os.getenv('KALSHI_SECRETS_DIR', os.path.expanduser('~/.openclaw/.secrets')))
        self.has_creds = (
            (self.secrets_dir / 'kalshi.json').exists() and
            (self.secrets_dir / 'kalshi_private.pem').exists()
        )
    
    def test_real_balance_call(self):
        """Test real Kalshi balance API call."""
        if not self.has_creds:
            self.skipTest("Kalshi credentials not available")
        
        from .kalshi_client import get_client
        client = get_client()
        
        result = client.get_balance()
        self.assertIn('balance', result)
        self.assertIsInstance(result['balance'], int)
    
    def test_real_positions_call(self):
        """Test real Kalshi positions API call."""
        if not self.has_creds:
            self.skipTest("Kalshi credentials not available")
        
        from .kalshi_client import get_client
        client = get_client()
        
        result = client.get_positions()
        self.assertIn('event_positions', result)
        self.assertIsInstance(result['event_positions'], list)
