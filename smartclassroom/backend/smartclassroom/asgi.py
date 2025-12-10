"""
ASGI config for smartclassroom project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os

from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "smartclassroom.settings")

django_asgi_app = get_asgi_application()


application = ProtocolTypeRouter(
	{
		"http": django_asgi_app,
		# WebSocket routes will be added when realtime endpoints are implemented.
		"websocket": URLRouter([]),
	}
)
