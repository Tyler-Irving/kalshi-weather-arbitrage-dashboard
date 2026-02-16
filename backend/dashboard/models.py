"""
Django models for dashboard-specific concerns.
Trading data (positions, P&L) lives in daemon JSON files, not the DB.
"""
from django.db import models
from django.contrib.auth.models import User


class DashboardSettings(models.Model):
    """Per-user dashboard preferences."""
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    refresh_interval_seconds = models.IntegerField(default=30)
    log_lines_visible = models.IntegerField(default=50)
    dark_mode = models.BooleanField(default=True)
    telegram_alerts_enabled = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = "Dashboard settings"

    def __str__(self):
        return f"Settings for {self.user.username}"


class TradeAnnotation(models.Model):
    """User notes attached to specific trades."""
    ticker = models.CharField(max_length=64, db_index=True)
    note = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Note on {self.ticker}"


class AlertRule(models.Model):
    """Configurable alert thresholds (future feature)."""
    CONDITION_CHOICES = [
        ('pnl_threshold', 'P&L Threshold'),
        ('position_count', 'Position Count'),
        ('balance_low', 'Low Balance'),
        ('daemon_stale', 'Daemon Not Scanning'),
    ]

    name = models.CharField(max_length=128)
    condition_type = models.CharField(max_length=32, choices=CONDITION_CHOICES)
    threshold_value = models.FloatField()
    enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({'enabled' if self.enabled else 'disabled'})"
