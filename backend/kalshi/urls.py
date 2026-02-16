"""
URL routing for Kalshi API proxy endpoints.

All routes are under /api/v1/kalshi/
"""
from django.urls import path
from . import views

app_name = 'kalshi'

urlpatterns = [
    # Balance
    path('balance/', views.balance_view, name='balance'),
    
    # Positions
    path('positions/', views.positions_view, name='positions'),
    
    # Orders
    path('orders/', views.orders_view, name='orders'),
    
    # Events
    path('events/', views.events_view, name='events'),
    
    # Market detail
    path('markets/<str:ticker>/', views.market_detail_view, name='market-detail'),
]
