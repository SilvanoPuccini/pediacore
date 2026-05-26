"""
Root conftest for PEDIACORE tests.
Shared fixtures available to all test modules.
"""

import pytest
from django.test import RequestFactory
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def request_factory():
    return RequestFactory()
