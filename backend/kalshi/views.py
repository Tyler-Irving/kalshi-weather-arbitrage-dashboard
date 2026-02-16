"""
Kalshi API proxy views for Django dashboard.

All endpoints are read-only (GET) and proxy to the live Kalshi API.
Errors are handled gracefully and return JSON (not 500 tracebacks).
"""
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.core.cache import cache
import logging

from .kalshi_client import get_client, KalshiClientError

logger = logging.getLogger(__name__)


@api_view(['GET'])
def balance_view(request):
    """
    GET /api/v1/kalshi/balance/
    
    Returns account balance from Kalshi API (60s cache).
    
    Response:
        200: {"balance": <cents>}
        500: {"error": "message"}
    """
    try:
        client = get_client()
        data = client.get_balance()
        return Response(data, status=status.HTTP_200_OK)
    except KalshiClientError as e:
        logger.error(f"Kalshi balance error: {e}")
        return Response(
            {"error": str(e)},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    except Exception as e:
        logger.exception("Unexpected error in balance view")
        return Response(
            {"error": "Internal server error"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def positions_view(request):
    """
    GET /api/v1/kalshi/positions/
    
    Returns portfolio positions from Kalshi API (30s cache).
    
    Response:
        200: {"event_positions": [...]}
        500: {"error": "message"}
    """
    try:
        client = get_client()
        data = client.get_positions()
        return Response(data, status=status.HTTP_200_OK)
    except KalshiClientError as e:
        logger.error(f"Kalshi positions error: {e}")
        return Response(
            {"error": str(e)},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    except Exception as e:
        logger.exception("Unexpected error in positions view")
        return Response(
            {"error": "Internal server error"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def orders_view(request):
    """
    GET /api/v1/kalshi/orders/
    
    Returns portfolio orders from Kalshi API (30s cache).
    
    Query params:
        - status: Filter by order status (e.g., 'open', 'resting')
        - limit: Max orders to return (default: 100)
    
    Response:
        200: {"orders": [...], "cursor": <str or null>}
        500: {"error": "message"}
    """
    try:
        client = get_client()
        order_status = request.query_params.get('status', None)
        limit = int(request.query_params.get('limit', 100))
        
        data = client.get_orders(status=order_status, limit=limit)
        return Response(data, status=status.HTTP_200_OK)
    except KalshiClientError as e:
        logger.error(f"Kalshi orders error: {e}")
        return Response(
            {"error": str(e)},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    except ValueError as e:
        return Response(
            {"error": f"Invalid query parameter: {e}"},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.exception("Unexpected error in orders view")
        return Response(
            {"error": "Internal server error"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def events_view(request):
    """
    GET /api/v1/kalshi/events/
    
    Returns events from Kalshi API (60s cache).
    
    Query params:
        - series_ticker: Filter by series (e.g., 'KXHIGHTPHX')
        - status: Event status (default: 'open')
        - with_nested_markets: Include market details (default: true)
        - limit: Max events to return (default: 100)
    
    Response:
        200: {"events": [...], "cursor": <str or null>}
        500: {"error": "message"}
    """
    try:
        client = get_client()
        series_ticker = request.query_params.get('series_ticker', None)
        event_status = request.query_params.get('status', 'open')
        with_nested = request.query_params.get('with_nested_markets', 'true').lower() == 'true'
        limit = int(request.query_params.get('limit', 100))
        
        data = client.get_events(
            series_ticker=series_ticker,
            status=event_status,
            with_nested_markets=with_nested,
            limit=limit
        )
        return Response(data, status=status.HTTP_200_OK)
    except KalshiClientError as e:
        logger.error(f"Kalshi events error: {e}")
        return Response(
            {"error": str(e)},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    except ValueError as e:
        return Response(
            {"error": f"Invalid query parameter: {e}"},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.exception("Unexpected error in events view")
        return Response(
            {"error": "Internal server error"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def market_detail_view(request, ticker):
    """
    GET /api/v1/kalshi/markets/<ticker>/
    
    Returns market details from Kalshi API (60s cache).
    
    Path params:
        - ticker: Market ticker (e.g., 'KXHIGHTPHX-26FEB12-T84')
    
    Response:
        200: {"market": {...}}
        500: {"error": "message"}
    """
    try:
        client = get_client()
        data = client.get_market(ticker)
        return Response(data, status=status.HTTP_200_OK)
    except KalshiClientError as e:
        logger.error(f"Kalshi market detail error for {ticker}: {e}")
        return Response(
            {"error": str(e)},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    except Exception as e:
        logger.exception(f"Unexpected error in market detail view for {ticker}")
        return Response(
            {"error": "Internal server error"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
