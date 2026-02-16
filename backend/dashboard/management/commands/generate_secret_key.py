"""
Management command to generate a new Django SECRET_KEY.

Usage:
    python manage.py generate_secret_key
    
This prints a new random SECRET_KEY that should be added to your .env file.
"""
from django.core.management.base import BaseCommand
from django.core.management.utils import get_random_secret_key


class Command(BaseCommand):
    help = 'Generate a new Django SECRET_KEY for .env file'

    def handle(self, *args, **options):
        secret_key = get_random_secret_key()
        
        self.stdout.write(self.style.SUCCESS('\n' + '=' * 60))
        self.stdout.write(self.style.SUCCESS('Generated new SECRET_KEY:'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(f'\n{secret_key}\n')
        self.stdout.write(self.style.WARNING('\nAdd this to your .env file:'))
        self.stdout.write(f'SECRET_KEY={secret_key}\n')
        self.stdout.write(self.style.SUCCESS('=' * 60 + '\n'))
