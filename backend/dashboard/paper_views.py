"""
Paper trading API endpoints.
Per TICK-020c: Returns normalized paper trade data from paper_trades.jsonl.
"""
import re
from collections import defaultdict
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .file_readers import file_reader


CITY_REGEX = re.compile(r'KX(?:HIGH|LOW)T(\w{2,4})-')


def normalize_paper_trade(entry: dict) -> dict:
    """
    Normalize both paper trade formats (A and B) into consistent schema.
    
    Format A: ts, price_cents, cost_cents, order_id
    Format B: timestamp, price, cost, + enriched fields
    
    Returns normalized dict with all fields present (nulls where missing).
    """
    # Timestamp field (ts → timestamp)
    ts = entry.get('timestamp') or entry.get('ts', '')
    
    # Price (price_cents or price, both already in cents)
    price_cents = entry.get('price_cents') or entry.get('price', 0)
    
    # Cost (cost_cents or cost, both already in cents)
    cost_cents = entry.get('cost_cents') or entry.get('cost', 0)
    
    # Extract city from entry or parse from ticker
    city = entry.get('city')
    if not city:
        ticker = entry.get('ticker', '')
        match = CITY_REGEX.search(ticker)
        city = match.group(1) if match else None
    
    return {
        'ts': ts,
        'ticker': entry.get('ticker', ''),
        'side': entry.get('side', ''),
        'count': entry.get('count', 0),
        'price_cents': price_cents,
        'cost_cents': cost_cents,
        'order_id': entry.get('order_id'),
        'city': city,
        'forecast': entry.get('forecast'),
        'fair_cents': entry.get('fair_cents'),
        'edge': entry.get('edge'),
        'confidence': entry.get('confidence'),
        'settlement_date': entry.get('settlement_date'),
        'status': entry.get('status'),
        'description': entry.get('description'),
    }


@api_view(['GET'])
def paper_trades_view(request):
    """
    GET /api/v1/paper/trades/
    Returns: All paper trades (normalized), optionally filtered by date
    Query params: ?date=YYYY-MM-DD (optional)
    Source: paper_trades.jsonl
    """
    date_param = request.GET.get('date')
    
    # Read JSONL with optional date filter
    raw_entries = file_reader.read_jsonl('paper_trades.jsonl', date_filter=date_param)
    
    # Normalize all entries
    normalized = [normalize_paper_trade(e) for e in raw_entries]
    
    return Response({
        'trades': normalized,
        'count': len(normalized),
    })


@api_view(['GET'])
def paper_positions_view(request):
    """
    GET /api/v1/paper/positions/
    Returns: Open paper positions (marked with paper_trade: true)
    Source: kalshi_unified_state.json
    Note: Normalizes field names to match frontend expectations
    """
    state = file_reader.read_json('kalshi_unified_state.json')
    all_positions = state.get('positions', [])
    
    # Filter for paper trades only and normalize fields
    paper_positions = []
    for p in all_positions:
        if not p.get('paper_trade', False):
            continue
        
        # Normalize fields to match frontend expectations
        count = p.get('count', 0)
        price = p.get('price', 0)
        total_cost = price * count
        
        # Generate description from ticker
        ticker = p.get('ticker', '')
        city = p.get('city', '')
        target_date = p.get('target_date', '')
        side = p.get('side', '').upper()
        description = f"{city} {target_date} {side}" if city and target_date else ticker
        
        normalized = {
            'ticker': ticker,
            'side': p.get('side', ''),
            'count': count,
            'avg_price_cents': price,  # Field name frontend expects
            'total_cost_cents': total_cost,  # Field name frontend expects
            'city': city,
            'edge': p.get('adjusted_edge'),  # Field name frontend expects
            'confidence': p.get('confidence'),
            'forecast': p.get('forecast'),
            'description': description,  # Generate from available data
            'trade_time': p.get('trade_time'),
            'target_date': target_date,
        }
        paper_positions.append(normalized)
    
    return Response({
        'positions': paper_positions,
        'count': len(paper_positions),
    })


@api_view(['GET'])
def paper_pnl_view(request):
    """
    Enhanced P&L: cost exposure + realized P&L from settlements.
    Sources: paper_trades.jsonl + kalshi_settlement_log.jsonl + state
    Query params: ?days=N (optional, default all)
    Per TICK-021c architecture spec.
    """
    from datetime import datetime, timedelta, timezone
    
    days_param = request.GET.get('days')
    
    # 1. Read settlement log, filter to paper trades only
    all_settlements = file_reader.read_jsonl('kalshi_settlement_log.jsonl')
    paper_settlements = [s for s in all_settlements if s.get('paper_trade')]
    
    # 2. Optional date filter
    if days_param:
        try:
            cutoff = (datetime.now(timezone.utc) - timedelta(days=int(days_param))).isoformat()
            paper_settlements = [s for s in paper_settlements if s.get('ts', '') >= cutoff]
        except (ValueError, TypeError):
            pass  # Ignore invalid days parameter
    
    # 3. Compute realized P&L metrics
    wins = [s for s in paper_settlements if s.get('won')]
    losses = [s for s in paper_settlements if not s.get('won')]
    total_pnl = sum(s.get('pnl_cents', 0) for s in paper_settlements)
    
    realized = {
        'total_pnl_cents': total_pnl,
        'wins': len(wins),
        'losses': len(losses),
        'win_rate': len(wins) / max(len(paper_settlements), 1) if paper_settlements else 0,
        'avg_win_cents': (sum(s.get('pnl_cents', 0) for s in wins) // max(len(wins), 1)) if wins else 0,
        'avg_loss_cents': (sum(s.get('pnl_cents', 0) for s in losses) // max(len(losses), 1)) if losses else 0,
        'best_trade_cents': max((s.get('pnl_cents', 0) for s in paper_settlements), default=0),
        'worst_trade_cents': min((s.get('pnl_cents', 0) for s in paper_settlements), default=0),
    }
    
    # 4. Aggregate by city and date (with P&L)
    by_city = defaultdict(lambda: {'trades': 0, 'cost_cents': 0, 'pnl_cents': 0, 'wins': 0, 'losses': 0})
    by_date = defaultdict(lambda: {'trades': 0, 'cost_cents': 0, 'pnl_cents': 0, 'wins': 0, 'losses': 0})
    
    for s in paper_settlements:
        city = s.get('city') or 'UNKNOWN'
        date_str = s.get('ts', '')[:10] if s.get('ts') else 'UNKNOWN'
        
        for bucket, key in [(by_city, city), (by_date, date_str)]:
            bucket[key]['trades'] += 1
            bucket[key]['cost_cents'] += s.get('cost_cents', 0)
            bucket[key]['pnl_cents'] += s.get('pnl_cents', 0)
            if s.get('won'):
                bucket[key]['wins'] += 1
            else:
                bucket[key]['losses'] += 1
    
    # 5. Add open trade exposure from paper_trades.jsonl
    raw_trades = file_reader.read_jsonl('paper_trades.jsonl')
    # Filter out settled entries (Format B with status='settled' or reason='settlement')
    open_trades = [normalize_paper_trade(t) for t in raw_trades 
                   if t.get('status') != 'settled' and t.get('reason') != 'settlement']
    total_exposure = sum(t['cost_cents'] for t in open_trades if t['cost_cents'])
    
    # 6. Get state data
    state = file_reader.read_json('kalshi_unified_state.json')
    paper_positions = [p for p in state.get('positions', []) if p.get('paper_trade')]
    
    return Response({
        'paper_balance_cents': state.get('paper_balance', 0),
        'total_trades': len(open_trades) + len(paper_settlements),
        'total_cost_cents': total_exposure + sum(s.get('cost_cents', 0) for s in paper_settlements),
        'realized': realized,
        'unrealized': {
            'total_exposure_cents': total_exposure,
            'position_count': len(paper_positions),
        },
        'settlements': paper_settlements[-50:],  # last 50, newest last
        'by_city': dict(by_city),
        'by_date': dict(by_date),
    })
