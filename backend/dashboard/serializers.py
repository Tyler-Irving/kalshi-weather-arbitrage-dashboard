"""
DRF serializers for dashboard models.
"""
from rest_framework import serializers
from .models import DashboardSettings, TradeAnnotation, AlertRule


class DashboardSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = DashboardSettings
        fields = ['refresh_interval_seconds', 'log_lines_visible', 'dark_mode', 'telegram_alerts_enabled']


class TradeAnnotationSerializer(serializers.ModelSerializer):
    class Meta:
        model = TradeAnnotation
        fields = ['id', 'ticker', 'note', 'created_at']
        read_only_fields = ['created_at']


class AlertRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlertRule
        fields = ['id', 'name', 'condition_type', 'threshold_value', 'enabled', 'created_at']
        read_only_fields = ['created_at']
