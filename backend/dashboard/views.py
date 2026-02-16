"""
REST API views for dashboard data.
Per TICK-002 §6.1: 7 endpoints reading daemon files.
Per TICK-011: 11 analytics endpoints for reliability metrics.
Per TICK-020a: 2 paper trades endpoints with schema normalizer.
Per TICK-022a: 1 health check endpoint for monitoring.
"""
from datetime import datetime, timedelta, date
from collections import defaultdict
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .file_readers import file_reader, normalize_paper_trade
from .analytics import ReliabilityAnalytics


@api_view(['GET'])
def health_view(request):
    """
    GET /api/v1/health/
    Returns: {"status": "ok", "timestamp": ISO timestamp}
    Per TICK-022a: Simple health check for monitoring daemon
    """
    return Response({
        'status': 'ok',
        'timestamp': datetime.now().isoformat(),
    })


@api_view(['GET'])
def status_view(request):
    """
    GET /api/v1/status/
    Returns: balance, starting_balance, total_pnl_cents, today_pnl_cents, daily_trades, position_count, 
             daemon_running, last_update, win_rate_today
    Source: kalshi_unified_state.json + kalshi_unified_pnl.json + log file mtime
    
    TICK-023: Total P&L now calculated as: current_balance - starting_balance
    This is the source of truth, more accurate than summing pnl.json which may miss early trades.
    """
    state = file_reader.read_json('kalshi_unified_state.json')
    pnl = file_reader.read_json('kalshi_unified_pnl.json')
    
    # Calculate daemon status from log file mtime
    log_mtime = file_reader.get_file_mtime('kalshi_unified_log.txt')
    daemon_running = False
    last_update = None
    
    if log_mtime:
        age_minutes = (datetime.now().timestamp() - log_mtime) / 60
        daemon_running = age_minutes <= 20
        last_update = datetime.fromtimestamp(log_mtime).isoformat()
    
    positions = state.get('positions', [])
    
    # Get today's P&L and win rate
    today_str = str(date.today())
    today_pnl = pnl.get('daily', {}).get(today_str, {})
    today_pnl_cents = today_pnl.get('pnl_cents', 0)
    today_trades = today_pnl.get('trades', 0)
    today_wins = today_pnl.get('wins', 0)
    win_rate_today = (today_wins / today_trades * 100) if today_trades > 0 else 0
    
    # TICK-023: Calculate total P&L from actual balance change (source of truth)
    # Starting balance when trading began
    STARTING_BALANCE_CENTS = 10000  # $100.00
    
    # Current balance from Kalshi API
    balance_cents = state.get('balance', 0)  # Already in cents
    
    # Total P&L = current - starting
    total_pnl_cents = balance_cents - STARTING_BALANCE_CENTS
    
    return Response({
        'balance': balance_cents,
        'starting_balance': STARTING_BALANCE_CENTS,
        'total_pnl_cents': total_pnl_cents,
        'today_pnl_cents': today_pnl_cents,
        'position_count': len(positions),
        'daily_trades': state.get('daily_trades', 0),
        'daemon_running': daemon_running,
        'last_update': last_update,
        'win_rate_today': round(win_rate_today, 2),
    })


@api_view(['GET'])
def positions_view(request):
    """
    GET /api/v1/positions/
    Returns: Full positions array with ensemble details (LIVE trades only, not paper)
    Source: kalshi_unified_state.json
    """
    state = file_reader.read_json('kalshi_unified_state.json')
    all_positions = state.get('positions', [])
    
    # Filter out paper trades - only show live positions
    live_positions = [p for p in all_positions if not p.get('paper_trade', False)]
    
    return Response({
        'positions': live_positions,
        'count': len(live_positions),
    })


@api_view(['GET'])
def pnl_view(request):
    """
    GET /api/v1/pnl/
    Returns: {daily: {...}, weeks: {...}}
    Source: kalshi_unified_pnl.json
    """
    pnl = file_reader.read_json('kalshi_unified_pnl.json')
    
    return Response({
        'daily': pnl.get('daily', {}),
        'weeks': pnl.get('weeks', {}),
    })


@api_view(['GET'])
def pnl_summary_view(request):
    """
    GET /api/v1/pnl/summary/
    Returns: Aggregated stats - total trades, wins, losses, win rate, total P&L, best/worst day
    Source: kalshi_unified_pnl.json
    """
    pnl = file_reader.read_json('kalshi_unified_pnl.json')
    
    # Aggregate across all daily entries
    total_pnl = 0
    total_trades = 0
    total_wins = 0
    total_losses = 0
    
    daily = pnl.get('daily', {})
    
    for day_data in daily.values():
        total_pnl += day_data.get('pnl_cents', 0)
        total_trades += day_data.get('trades', 0)
        total_wins += day_data.get('wins', 0)
        total_losses += day_data.get('losses', 0)
    
    win_rate = (total_wins / total_trades * 100) if total_trades > 0 else 0
    
    # Calculate best and worst day
    best_day = None
    worst_day = None
    
    if daily:
        best = max(daily.items(), key=lambda x: x[1].get('pnl_cents', 0))
        worst = min(daily.items(), key=lambda x: x[1].get('pnl_cents', 0))
        best_day = {'date': best[0], 'pnl_cents': best[1]['pnl_cents']}
        worst_day = {'date': worst[0], 'pnl_cents': worst[1]['pnl_cents']}
    
    return Response({
        'total_pnl_cents': total_pnl,
        'total_trades': total_trades,
        'total_wins': total_wins,
        'total_losses': total_losses,
        'win_rate': round(win_rate, 2),
        'best_day': best_day,
        'worst_day': worst_day,
    })


@api_view(['GET'])
def pnl_by_city_view(request):
    """
    GET /api/v1/pnl/by-city/
    Returns: Array of {city, pnl_cents, trades, wins, losses, win_rate}
    Source: kalshi_settlement_log.jsonl (aggregated by city)
    """
    settlements = file_reader.read_jsonl('kalshi_settlement_log.jsonl')
    
    # Aggregate by city
    city_stats = defaultdict(lambda: {'pnl_cents': 0, 'trades': 0, 'wins': 0, 'losses': 0})
    
    for entry in settlements:
        city = entry.get('city', 'UNKNOWN')
        pnl = entry.get('pnl_cents', 0)
        
        city_stats[city]['pnl_cents'] += pnl
        city_stats[city]['trades'] += 1
        
        if pnl > 0:
            city_stats[city]['wins'] += 1
        elif pnl < 0:
            city_stats[city]['losses'] += 1
    
    # Convert to array with win_rate
    result = []
    for city, stats in city_stats.items():
        win_rate = (stats['wins'] / stats['trades'] * 100) if stats['trades'] > 0 else 0
        result.append({
            'city': city,
            'pnl_cents': stats['pnl_cents'],
            'trades': stats['trades'],
            'wins': stats['wins'],
            'losses': stats['losses'],
            'win_rate': round(win_rate, 2),
        })
    
    # Sort by P&L descending
    result.sort(key=lambda x: x['pnl_cents'], reverse=True)
    
    return Response(result)


@api_view(['GET'])
def backtest_view(request):
    """
    GET /api/v1/backtest/
    Returns: Today's backtest entries (supports ?date=YYYY-MM-DD, ?city=, ?action=)
    Source: kalshi_backtest_log.jsonl
    """
    # Get query params
    date_param = request.GET.get('date', str(date.today()))
    city_filter = request.GET.get('city')
    action_filter = request.GET.get('action')
    
    # Read JSONL with date filter
    entries = file_reader.read_jsonl('kalshi_backtest_log.jsonl', date_filter=date_param)
    
    # Apply additional filters
    if city_filter:
        entries = [e for e in entries if e.get('city') == city_filter.upper()]
    
    if action_filter:
        entries = [e for e in entries if e.get('action') == action_filter]
    
    return Response({
        'entries': entries,
        'count': len(entries),
        'date': date_param,
    })


@api_view(['GET'])
def backtest_stats_view(request):
    """
    GET /api/v1/backtest/stats/
    Returns: Funnel stats - scanned, traded, skipped (by reason)
    Source: kalshi_backtest_log.jsonl
    """
    # Default to today
    date_param = request.GET.get('date', str(date.today()))
    
    entries = file_reader.read_jsonl('kalshi_backtest_log.jsonl', date_filter=date_param)
    
    scanned = len(entries)
    traded = len([e for e in entries if e.get('action') == 'trade'])
    skipped = len([e for e in entries if e.get('action') == 'skip'])
    
    # Group skip reasons
    skip_reasons = {}
    for entry in entries:
        if entry.get('action') == 'skip':
            reason = entry.get('skip_reason', 'unknown')
            skip_reasons[reason] = skip_reasons.get(reason, 0) + 1
    
    return Response({
        'date': date_param,
        'scanned': scanned,
        'traded': traded,
        'skipped': skipped,
        'skip_reasons': skip_reasons,
    })


@api_view(['GET'])
def logs_view(request):
    """
    GET /api/v1/logs/
    Returns: Last N lines from log file (?lines=50)
    Source: kalshi_unified_log.txt
    """
    lines_param = request.GET.get('lines', '50')
    
    try:
        lines_count = int(lines_param)
    except ValueError:
        lines_count = 50
    
    log_lines = file_reader.read_log_tail('kalshi_unified_log.txt', lines=lines_count)
    
    return Response({
        'lines': log_lines,
        'count': len(log_lines),
    })


@api_view(['GET'])
def cities_view(request):
    """
    GET /api/v1/cities/
    Returns: City forecast data aggregated from positions
    Source: kalshi_unified_state.json
    """
    CITY_ORDER = ['PHX', 'SFO', 'SEA', 'DC', 'HOU', 'NOLA', 'DAL', 'BOS', 'OKC', 'ATL', 'MIN']
    
    state = file_reader.read_json('kalshi_unified_state.json')
    positions = state.get('positions', [])
    
    # Initialize city data
    city_map = {city: {
        'city': city,
        'ensemble_forecast': None,
        'active_positions': 0,
        'confidence': None,
        'noaa_stale': False,
        'provider_count': 0,
    } for city in CITY_ORDER}
    
    # Aggregate from positions
    for pos in positions:
        city = pos.get('city')
        if city in city_map:
            ensemble_details = pos.get('ensemble_details', {})
            city_data = city_map[city]
            
            # Use the highest values when multiple positions exist
            city_data['ensemble_forecast'] = ensemble_details.get('ensemble_forecast')
            city_data['active_positions'] += 1
            
            current_confidence = pos.get('confidence')
            if city_data['confidence'] is None or current_confidence > city_data['confidence']:
                city_data['confidence'] = current_confidence
            
            city_data['noaa_stale'] = city_data['noaa_stale'] or ensemble_details.get('noaa_stale', False)
            city_data['provider_count'] = max(
                city_data['provider_count'],
                ensemble_details.get('provider_count', 0)
            )
    
    # Convert to list and sort by confidence (descending, highest first)
    cities = list(city_map.values())
    cities.sort(key=lambda c: c['confidence'] if c['confidence'] is not None else 0, reverse=True)
    
    return Response({
        'cities': cities,
        'count': len(cities),
    })


@api_view(['GET'])
def paper_trades_view(request):
    """
    GET /api/v1/paper-trades/
    Returns: All paper trades, normalized, newest first
    Query params: ?date=YYYY-MM-DD (optional filter)
    Source: paper_trades.jsonl
    Per TICK-020a: Normalizes two incompatible formats
    """
    # Get optional date filter
    date_param = request.GET.get('date')
    
    # Read JSONL with optional date filter
    entries = file_reader.read_jsonl('paper_trades.jsonl', date_filter=date_param)
    
    # Normalize all entries
    normalized_trades = [normalize_paper_trade(entry) for entry in entries]
    
    # Sort by timestamp descending (newest first)
    normalized_trades.sort(key=lambda t: t.get('timestamp') or '', reverse=True)
    
    return Response({
        'trades': normalized_trades,
        'count': len(normalized_trades),
    })


@api_view(['GET'])
def paper_trades_summary_view(request):
    """
    GET /api/v1/paper-trades/summary/
    Returns: Aggregated paper trading metrics
    Source: paper_trades.jsonl
    Per TICK-020a: total_trades, total_cost_cents, cities, by_side, avg_edge, avg_confidence
    """
    # Read all paper trades
    entries = file_reader.read_jsonl('paper_trades.jsonl')
    
    # Normalize all entries
    normalized_trades = [normalize_paper_trade(entry) for entry in entries]
    
    # Initialize aggregations
    total_trades = len(normalized_trades)
    total_cost_cents = 0
    cities = set()
    by_side = {'yes': 0, 'no': 0}
    edges = []
    confidences = []
    
    # Aggregate data
    for trade in normalized_trades:
        # Total cost
        cost = trade.get('cost_cents')
        if cost is not None:
            total_cost_cents += cost
        
        # Cities
        city = trade.get('city')
        if city:
            cities.add(city)
        
        # By side
        side = trade.get('side')
        if side in by_side:
            by_side[side] += 1
        
        # Edge
        edge = trade.get('edge')
        if edge is not None:
            edges.append(edge)
        
        # Confidence
        confidence = trade.get('confidence')
        if confidence is not None:
            confidences.append(confidence)
    
    # Calculate averages
    avg_edge = round(sum(edges) / len(edges), 1) if edges else None
    avg_confidence = round(sum(confidences) / len(confidences), 3) if confidences else None
    
    return Response({
        'total_trades': total_trades,
        'total_cost_cents': total_cost_cents,
        'cities': sorted(list(cities)),
        'by_side': by_side,
        'avg_edge': avg_edge,
        'avg_confidence': avg_confidence,
    })


# ========== Analytics Endpoints (TICK-011) ==========

def _get_analytics_filters(request):
    """Helper to extract common analytics query parameters."""
    days = request.GET.get('days')
    city = request.GET.get('city')
    min_trades = request.GET.get('min_trades', '0')
    
    return {
        'days': int(days) if days else None,
        'city': city.upper() if city else None,
        'min_trades': int(min_trades),
    }


@api_view(['GET'])
def reliability_summary_view(request):
    """
    GET /api/v1/reliability/summary/
    Returns: Win rates by city/side/confidence/edge + streaks
    Query params: ?days=N, ?city=X, ?min_trades=N
    """
    filters = _get_analytics_filters(request)
    analytics = ReliabilityAnalytics(**filters)
    
    # Define buckets for confidence and edge
    confidence_buckets = [(0.6, 0.7), (0.7, 0.8), (0.8, 0.9), (0.9, 1.0)]
    edge_buckets = [(10, 15), (15, 25), (25, 40), (40, 100)]
    
    return Response({
        'by_city': analytics.win_rate_by('city'),
        'by_side': analytics.win_rate_by('side'),
        'by_confidence': analytics.win_rate_by('confidence', confidence_buckets),
        'by_edge': analytics.win_rate_by('adjusted_edge', edge_buckets),
        'streaks': analytics.streaks(),
        'filters': filters,
    })


@api_view(['GET'])
def reliability_by_city_view(request):
    """
    GET /api/v1/reliability/by-city/
    Returns: Per-city breakdown with trades, wins, losses, win rate, avg edge
    Query params: ?days=N, ?min_trades=N
    """
    filters = _get_analytics_filters(request)
    analytics = ReliabilityAnalytics(**filters)
    
    city_data = analytics.win_rate_by('city')
    
    # Enrich with avg edge calculation
    city_edges = defaultdict(list)
    for e in analytics.entries:
        city_edges[e['city']].append(e.get('adjusted_edge', 0))
    
    result = []
    for city, stats in city_data.items():
        result.append({
            'city': city,
            **stats,
            'avg_edge': round(sum(city_edges[city]) / len(city_edges[city]), 2) if city_edges[city] else 0,
        })
    
    return Response({
        'cities': sorted(result, key=lambda x: x['win_rate'], reverse=True),
        'count': len(result),
        'filters': filters,
    })


@api_view(['GET'])
def reliability_streaks_view(request):
    """
    GET /api/v1/reliability/streaks/
    Returns: Current + longest win/loss streaks
    Query params: ?days=N, ?city=X
    """
    filters = _get_analytics_filters(request)
    analytics = ReliabilityAnalytics(**filters)
    
    return Response({
        **analytics.streaks(),
        'filters': filters,
    })


@api_view(['GET'])
def cost_summary_view(request):
    """
    GET /api/v1/cost/summary/
    Returns: Avg cost, profit, ROI, break-even win rate
    Query params: ?days=N, ?city=X
    """
    filters = _get_analytics_filters(request)
    analytics = ReliabilityAnalytics(**filters)
    
    return Response({
        **analytics.cost_summary(),
        'filters': filters,
    })


@api_view(['GET'])
def cost_by_edge_bucket_view(request):
    """
    GET /api/v1/cost/by-edge-bucket/
    Returns: ROI by edge bracket
    Query params: ?days=N, ?city=X, ?min_trades=N
    """
    filters = _get_analytics_filters(request)
    analytics = ReliabilityAnalytics(**filters)
    
    # Calculate ROI by edge bucket
    edge_buckets = [(10, 15), (15, 20), (20, 30), (30, 100)]
    bucket_stats = defaultdict(lambda: {'pnl': 0, 'cost': 0, 'count': 0})
    
    for e in analytics.entries:
        edge = e.get('adjusted_edge', 0)
        bucket_key = None
        
        for min_val, max_val in edge_buckets:
            if min_val <= edge < max_val:
                bucket_key = f"{min_val}-{max_val}"
                break
        
        if bucket_key:
            bucket_stats[bucket_key]['pnl'] += e['pnl_cents']
            bucket_stats[bucket_key]['cost'] += e['cost_cents']
            bucket_stats[bucket_key]['count'] += 1
    
    result = []
    for bucket, stats in bucket_stats.items():
        if stats['count'] >= filters['min_trades']:
            roi = (stats['pnl'] / stats['cost'] * 100) if stats['cost'] > 0 else 0
            result.append({
                'edge_bucket': bucket,
                'roi': round(roi, 2),
                'avg_pnl': round(stats['pnl'] / stats['count'], 2),
                'count': stats['count'],
            })
    
    return Response({
        'edge_buckets': sorted(result, key=lambda x: x['edge_bucket']),
        'filters': filters,
    })


@api_view(['GET'])
def edge_calibration_view(request):
    """
    GET /api/v1/edge/calibration/
    Returns: Edge calibration curve data
    Query params: ?days=N, ?city=X, ?min_trades=N, ?bucket_size=N
    """
    filters = _get_analytics_filters(request)
    bucket_size = int(request.GET.get('bucket_size', '5'))
    
    analytics = ReliabilityAnalytics(**filters)
    
    return Response({
        'calibration': analytics.edge_calibration(bucket_size=bucket_size),
        'bucket_size': bucket_size,
        'filters': filters,
    })


@api_view(['GET'])
def confidence_calibration_view(request):
    """
    GET /api/v1/edge/confidence-calibration/
    Returns: Confidence calibration curve
    Query params: ?days=N, ?city=X, ?min_trades=N, ?bucket_size=N
    """
    filters = _get_analytics_filters(request)
    bucket_size = float(request.GET.get('bucket_size', '0.05'))
    
    analytics = ReliabilityAnalytics(**filters)
    
    return Response({
        'calibration': analytics.confidence_calibration(bucket_size=bucket_size),
        'bucket_size': bucket_size,
        'filters': filters,
    })


@api_view(['GET'])
def edge_bias_view(request):
    """
    GET /api/v1/edge/bias/
    Returns: Systematic bias indicator
    Query params: ?days=N, ?city=X
    """
    filters = _get_analytics_filters(request)
    analytics = ReliabilityAnalytics(**filters)
    
    bias_data = analytics.edge_bias()
    
    # Color code bias
    bias_value = bias_data['bias']
    if abs(bias_value) < 5:
        color = 'green'  # Well calibrated
    elif abs(bias_value) < 15:
        color = 'amber'  # Slight bias
    else:
        color = 'red'  # Miscalibrated
    
    return Response({
        **bias_data,
        'color': color,
        'filters': filters,
    })


@api_view(['GET'])
def provider_accuracy_view(request):
    """
    GET /api/v1/providers/accuracy/
    Returns: Per-provider accuracy stats
    Query params: ?days=N, ?city=X, ?min_trades=N
    """
    filters = _get_analytics_filters(request)
    analytics = ReliabilityAnalytics(**filters)
    
    return Response({
        'providers': analytics.provider_accuracy(),
        'filters': filters,
    })


@api_view(['GET'])
def provider_staleness_view(request):
    """
    GET /api/v1/providers/staleness/
    Returns: NOAA staleness impact
    Query params: ?days=N, ?city=X
    """
    filters = _get_analytics_filters(request)
    analytics = ReliabilityAnalytics(**filters)
    
    return Response({
        'staleness_impact': analytics.noaa_staleness_impact(),
        'filters': filters,
    })


@api_view(['GET'])
def provider_dropout_view(request):
    """
    GET /api/v1/providers/dropout/
    Returns: Performance by provider count
    Query params: ?days=N, ?city=X
    """
    filters = _get_analytics_filters(request)
    analytics = ReliabilityAnalytics(**filters)
    
    return Response({
        'dropout_impact': analytics.provider_dropout_impact(),
        'filters': filters,
    })
