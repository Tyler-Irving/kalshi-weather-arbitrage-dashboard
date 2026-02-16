"""
Analytics computation layer for trade reliability and cost-effectiveness metrics.
Per TICK-003 architecture §6.2: Reads from kalshi_settlement_log.jsonl
"""
from pathlib import Path
from collections import defaultdict
from datetime import datetime, timedelta, date
import json
from typing import Optional, Dict, List, Any
from django.conf import settings


class ReliabilityAnalytics:
    """Computes all TICK-003 reliability metrics from the settlement log."""

    def __init__(self, days: Optional[int] = None, city: Optional[str] = None, min_trades: int = 0):
        """
        Initialize analytics with optional filters.
        
        Args:
            days: Lookback window in days (None = all time)
            city: Filter by city code (None = all cities)
            min_trades: Minimum sample size for bucketed metrics
        """
        self.days = days
        self.city = city
        self.min_trades = min_trades
        self.entries = self._load()

    def _load(self) -> List[Dict[str, Any]]:
        """Load settlement log entries with filters applied."""
        settlement_log_path = Path(settings.TRADING_DIR) / 'kalshi_settlement_log.jsonl'
        
        if not settlement_log_path.exists():
            return []
        
        entries = []
        cutoff_date = None
        
        if self.days:
            cutoff_date = datetime.now() - timedelta(days=self.days)
        
        try:
            with open(settlement_log_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    
                    try:
                        entry = json.loads(line)
                        
                        # Date filter
                        if cutoff_date:
                            ts = datetime.fromisoformat(entry['ts'].replace('Z', '+00:00'))
                            if ts < cutoff_date:
                                continue
                        
                        # City filter
                        if self.city and entry.get('city') != self.city:
                            continue
                        
                        entries.append(entry)
                        
                    except (json.JSONDecodeError, KeyError, ValueError):
                        continue
                        
        except IOError:
            return []
        
        return entries

    def win_rate_by(self, field: str, buckets: Optional[List] = None) -> Dict[str, Any]:
        """
        Win rate grouped by a field, optionally with numeric bucketing.
        
        Args:
            field: Field name to group by (city, side, confidence, adjusted_edge)
            buckets: For numeric fields, list of (min, max) tuples
        
        Returns:
            Dict mapping field value -> {wins, total, win_rate}
        """
        groups = defaultdict(lambda: {'wins': 0, 'total': 0})
        
        for e in self.entries:
            if field in e:
                value = e[field]
                
                # Apply bucketing for numeric fields
                if buckets:
                    key = self._bucket_value(value, buckets)
                else:
                    key = str(value)
                
                groups[key]['total'] += 1
                if e.get('won'):
                    groups[key]['wins'] += 1
        
        # Calculate win rates and filter by min_trades
        result = {}
        for key, stats in groups.items():
            if stats['total'] >= self.min_trades:
                result[key] = {
                    **stats,
                    'win_rate': round(stats['wins'] / stats['total'] * 100, 2) if stats['total'] > 0 else 0
                }
        
        return result

    def _bucket_value(self, value: float, buckets: List) -> str:
        """Map a numeric value to a bucket label."""
        for min_val, max_val in buckets:
            if min_val <= value < max_val:
                return f"{min_val}-{max_val}"
        
        # Handle values outside defined buckets
        if value >= buckets[-1][1]:
            return f"{buckets[-1][1]}+"
        
        return "unknown"

    def streaks(self) -> Dict[str, Any]:
        """
        Calculate current and longest win/loss streaks.
        
        Returns:
            {current_streak, current_type, longest_win_streak, longest_loss_streak}
        """
        if not self.entries:
            return {
                'current_streak': 0,
                'current_type': None,
                'longest_win_streak': 0,
                'longest_loss_streak': 0,
            }
        
        sorted_entries = sorted(self.entries, key=lambda e: e['ts'])
        
        current = 0
        current_type = None
        max_win = 0
        max_loss = 0
        
        for e in sorted_entries:
            if e.get('won'):
                if current_type == 'win':
                    current += 1
                else:
                    current = 1
                    current_type = 'win'
                max_win = max(max_win, current)
            else:
                if current_type == 'loss':
                    current += 1
                else:
                    current = 1
                    current_type = 'loss'
                max_loss = max(max_loss, current)
        
        return {
            'current_streak': current,
            'current_type': current_type,
            'longest_win_streak': max_win,
            'longest_loss_streak': max_loss,
        }

    def cost_summary(self) -> Dict[str, Any]:
        """
        Calculate cost-effectiveness metrics.
        
        Returns:
            {avg_cost_cents, avg_profit_cents, avg_roi, breakeven_win_rate, total_trades}
        """
        if not self.entries:
            return {
                'avg_cost_cents': 0,
                'avg_profit_cents': 0,
                'avg_roi': 0,
                'breakeven_win_rate': None,
                'total_trades': 0,
            }
        
        costs = [e['cost_cents'] for e in self.entries]
        pnls = [e['pnl_cents'] for e in self.entries]
        wins = [e for e in self.entries if e['won']]
        losses = [e for e in self.entries if not e['won']]
        
        avg_cost = sum(costs) / len(costs)
        avg_profit = sum(pnls) / len(pnls)
        
        # Calculate ROI (pnl / cost)
        rois = [p / c for p, c in zip(pnls, costs) if c > 0]
        avg_roi = (sum(rois) / len(rois) * 100) if rois else 0
        
        # Break-even win rate calculation
        avg_win_payout = sum(e['pnl_cents'] for e in wins) / len(wins) if wins else 0
        avg_loss_cost = abs(sum(e['pnl_cents'] for e in losses) / len(losses)) if losses else 0
        
        breakeven = None
        if (avg_win_payout + avg_loss_cost) > 0:
            breakeven = round(avg_loss_cost / (avg_win_payout + avg_loss_cost) * 100, 2)
        
        return {
            'avg_cost_cents': round(avg_cost, 2),
            'avg_profit_cents': round(avg_profit, 2),
            'avg_roi': round(avg_roi, 2),
            'breakeven_win_rate': breakeven,
            'total_trades': len(self.entries),
        }

    def edge_calibration(self, bucket_size: int = 5) -> List[Dict[str, Any]]:
        """
        Edge calibration curve data: predicted edge vs actual win rate.
        
        Args:
            bucket_size: Edge bucket size in cents (default 5)
        
        Returns:
            List of {edge_min, edge_max, win_rate, count}
        """
        buckets = defaultdict(lambda: {'wins': 0, 'total': 0})
        
        for e in self.entries:
            edge = e.get('adjusted_edge', 0)
            bucket_key = int(edge // bucket_size) * bucket_size
            
            buckets[bucket_key]['total'] += 1
            if e['won']:
                buckets[bucket_key]['wins'] += 1
        
        result = []
        for edge_min, stats in sorted(buckets.items()):
            if stats['total'] >= self.min_trades:
                result.append({
                    'edge_min': edge_min,
                    'edge_max': edge_min + bucket_size,
                    'win_rate': round(stats['wins'] / stats['total'] * 100, 2),
                    'count': stats['total'],
                })
        
        return result

    def confidence_calibration(self, bucket_size: float = 0.05) -> List[Dict[str, Any]]:
        """
        Confidence calibration: predicted confidence vs actual win rate.
        
        Args:
            bucket_size: Confidence bucket size (default 0.05 = 5%)
        
        Returns:
            List of {confidence_min, confidence_max, win_rate, count}
        """
        buckets = defaultdict(lambda: {'wins': 0, 'total': 0})
        
        for e in self.entries:
            confidence = e.get('confidence', 0)
            bucket_key = round((confidence // bucket_size) * bucket_size, 2)
            
            buckets[bucket_key]['total'] += 1
            if e['won']:
                buckets[bucket_key]['wins'] += 1
        
        result = []
        for conf_min, stats in sorted(buckets.items()):
            if stats['total'] >= self.min_trades:
                result.append({
                    'confidence_min': conf_min,
                    'confidence_max': round(conf_min + bucket_size, 2),
                    'win_rate': round(stats['wins'] / stats['total'] * 100, 2),
                    'count': stats['total'],
                })
        
        return result

    def edge_bias(self) -> Dict[str, Any]:
        """
        Calculate systematic edge bias: over/under-estimation.
        
        Returns:
            {avg_predicted_fair, avg_actual_value, bias}
        """
        if not self.entries:
            return {
                'avg_predicted_fair': 0,
                'avg_actual_value': 0,
                'bias': 0,
            }
        
        # Filter out entries with null fair_cents
        valid_entries = [e for e in self.entries if e.get('fair_cents') is not None]
        
        if not valid_entries:
            return {
                'avg_predicted_fair': 0,
                'avg_actual_value': 0,
                'bias': 0,
            }
        
        predicted = [e['fair_cents'] for e in valid_entries]
        actual = [100 if e['won'] else 0 for e in valid_entries]
        
        avg_predicted = sum(predicted) / len(predicted)
        avg_actual = sum(actual) / len(actual)
        
        return {
            'avg_predicted_fair': round(avg_predicted, 2),
            'avg_actual_value': round(avg_actual, 2),
            'bias': round(avg_predicted - avg_actual, 2),
        }

    def provider_accuracy(self) -> Dict[str, Dict[str, Any]]:
        """
        Per-provider accuracy: how often each provider was on the correct side.
        
        Returns:
            Dict mapping provider -> {correct, total, accuracy}
        """
        providers = defaultdict(lambda: {'correct': 0, 'total': 0})
        
        for e in self.entries:
            ensemble_details = e.get('ensemble_details', {})
            forecasts = ensemble_details.get('individual_forecasts', {})
            
            for provider in forecasts:
                providers[provider]['total'] += 1
                # Provider is "correct" if the trade won
                if e['won']:
                    providers[provider]['correct'] += 1
        
        result = {}
        for provider, stats in providers.items():
            if stats['total'] >= self.min_trades:
                result[provider] = {
                    **stats,
                    'accuracy': round(stats['correct'] / stats['total'] * 100, 2) if stats['total'] > 0 else 0
                }
        
        return result

    def noaa_staleness_impact(self) -> Dict[str, Dict[str, Any]]:
        """
        Compare win rates when NOAA data is stale vs fresh.
        
        Returns:
            {stale: {count, win_rate}, fresh: {count, win_rate}}
        """
        stale = [e for e in self.entries if e.get('ensemble_details', {}).get('noaa_stale')]
        fresh = [e for e in self.entries if not e.get('ensemble_details', {}).get('noaa_stale')]
        
        stale_wins = sum(1 for e in stale if e['won'])
        fresh_wins = sum(1 for e in fresh if e['won'])
        
        return {
            'stale': {
                'count': len(stale),
                'win_rate': round(stale_wins / len(stale) * 100, 2) if stale else None
            },
            'fresh': {
                'count': len(fresh),
                'win_rate': round(fresh_wins / len(fresh) * 100, 2) if fresh else None
            },
        }

    def provider_dropout_impact(self) -> Dict[str, Dict[str, Any]]:
        """
        Compare performance by provider count (full ensemble vs partial).
        
        Returns:
            {full_ensemble: {count, win_rate}, partial_ensemble: {count, win_rate}}
        """
        # Determine max provider count dynamically
        max_providers = max(
            (e.get('ensemble_details', {}).get('provider_count', 0) for e in self.entries),
            default=5
        )
        
        full = [e for e in self.entries if e.get('ensemble_details', {}).get('provider_count', 0) >= max_providers]
        partial = [e for e in self.entries if e.get('ensemble_details', {}).get('provider_count', 0) < max_providers]
        
        full_wins = sum(1 for e in full if e['won'])
        partial_wins = sum(1 for e in partial if e['won'])
        
        return {
            'full_ensemble': {
                'count': len(full),
                'win_rate': round(full_wins / len(full) * 100, 2) if full else None
            },
            'partial_ensemble': {
                'count': len(partial),
                'win_rate': round(partial_wins / len(partial) * 100, 2) if partial else None
            },
        }
