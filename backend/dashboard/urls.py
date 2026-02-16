"""
URL routing for dashboard API endpoints.
"""
from django.urls import path
from . import views, paper_views

urlpatterns = [
    # Health check endpoint (TICK-022a)
    path('health/', views.health_view, name='health'),
    
    # Core dashboard data endpoints (read daemon files)
    path('status/', views.status_view, name='status'),
    path('positions/', views.positions_view, name='positions'),
    path('pnl/', views.pnl_view, name='pnl'),
    path('pnl/summary/', views.pnl_summary_view, name='pnl-summary'),
    path('pnl/by-city/', views.pnl_by_city_view, name='pnl-by-city'),
    path('backtest/', views.backtest_view, name='backtest'),
    path('backtest/stats/', views.backtest_stats_view, name='backtest-stats'),
    path('logs/', views.logs_view, name='logs'),
    path('cities/', views.cities_view, name='cities'),
    
    # Paper trades endpoints (TICK-020a)
    path('paper-trades/', views.paper_trades_view, name='paper-trades'),
    path('paper-trades/summary/', views.paper_trades_summary_view, name='paper-trades-summary'),
    
    # Paper trading tab endpoints (TICK-020c)
    path('paper/trades/', paper_views.paper_trades_view, name='paper-trades-v2'),
    path('paper/positions/', paper_views.paper_positions_view, name='paper-positions'),
    path('paper/pnl/', paper_views.paper_pnl_view, name='paper-pnl'),
    
    # Analytics endpoints (TICK-011)
    # Reliability
    path('reliability/summary/', views.reliability_summary_view, name='reliability-summary'),
    path('reliability/by-city/', views.reliability_by_city_view, name='reliability-by-city'),
    path('reliability/streaks/', views.reliability_streaks_view, name='reliability-streaks'),
    
    # Cost
    path('cost/summary/', views.cost_summary_view, name='cost-summary'),
    path('cost/by-edge-bucket/', views.cost_by_edge_bucket_view, name='cost-by-edge-bucket'),
    
    # Edge
    path('edge/calibration/', views.edge_calibration_view, name='edge-calibration'),
    path('edge/confidence-calibration/', views.confidence_calibration_view, name='confidence-calibration'),
    path('edge/bias/', views.edge_bias_view, name='edge-bias'),
    
    # Providers
    path('providers/accuracy/', views.provider_accuracy_view, name='provider-accuracy'),
    path('providers/staleness/', views.provider_staleness_view, name='provider-staleness'),
    path('providers/dropout/', views.provider_dropout_view, name='provider-dropout'),
]
