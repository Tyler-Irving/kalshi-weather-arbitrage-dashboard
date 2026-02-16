"""
Django admin configuration for dashboard models.
"""
from django.contrib import admin
from .models import DashboardSettings, TradeAnnotation, AlertRule


@admin.register(DashboardSettings)
class DashboardSettingsAdmin(admin.ModelAdmin):
    list_display = ['user', 'refresh_interval_seconds', 'log_lines_visible', 'dark_mode']


@admin.register(TradeAnnotation)
class TradeAnnotationAdmin(admin.ModelAdmin):
    list_display = ['ticker', 'note', 'created_at']
    list_filter = ['created_at']
    search_fields = ['ticker', 'note']


@admin.register(AlertRule)
class AlertRuleAdmin(admin.ModelAdmin):
    list_display = ['name', 'condition_type', 'threshold_value', 'enabled', 'created_at']
    list_filter = ['condition_type', 'enabled']
