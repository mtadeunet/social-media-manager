#!/usr/bin/env python3
"""
Test script to verify API responses use camelCase
"""

import requests
import json
from typing import Dict, Any

BASE_URL = "http://localhost:8000"

def test_endpoint(endpoint: str, method: str = "GET") -> Dict[str, Any]:
    """Test an endpoint and return response"""
    url = f"{BASE_URL}{endpoint}"
    
    if method == "GET":
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    elif method == "POST":
        response = requests.post(url)
        response.raise_for_status()
        return response.json()

def check_camel_case(data: Any, path: str = "") -> None:
    """Recursively check if all keys are camelCase"""
    if isinstance(data, dict):
        for key, value in data.items():
            # Skip checking if key is not a string (unlikely but possible)
            if not isinstance(key, str):
                continue
                
            # Check if key follows camelCase or PascalCase convention
            # Allow: camelCase, PascalCase, or simple single words
            if "_" in key and key not in ["__init__", "__repr__"]:
                print(f"⚠️  Snake case found at {path}.{key}: {key}")
            
            # Recursively check nested values
            check_camel_case(value, f"{path}.{key}" if path else key)
    elif isinstance(data, list):
        for i, item in enumerate(data):
            check_camel_case(item, f"{path}[{i}]")

def main():
    """Main test function"""
    print("Testing API responses for camelCase conversion...\n")
    
    # Test content types endpoint
    print("1. Testing /api/content-types")
    try:
        response = test_endpoint("/api/content-types")
        check_camel_case(response)
        print("✅ Content types API checked\n")
    except Exception as e:
        print(f"❌ Error testing content types: {e}\n")
    
    # Test media vault endpoint
    print("2. Testing /api/media-vault")
    try:
        response = test_endpoint("/api/media-vault")
        check_camel_case(response)
        print("✅ Media vault API checked\n")
    except Exception as e:
        print(f"❌ Error testing media vault: {e}\n")
    
    # Test enhancement tags endpoint
    print("3. Testing /api/tags/enhancement")
    try:
        response = test_endpoint("/api/tags/enhancement")
        check_camel_case(response)
        print("✅ Enhancement tags API checked\n")
    except Exception as e:
        print(f"❌ Error testing enhancement tags: {e}\n")
    
    # Test posts endpoint
    print("4. Testing /api/posts")
    try:
        response = test_endpoint("/api/posts")
        check_camel_case(response)
        print("✅ Posts API checked\n")
    except Exception as e:
        print(f"❌ Error testing posts: {e}\n")
    
    print("Test completed!")

if __name__ == "__main__":
    main()
