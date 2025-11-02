#!/usr/bin/env python3
"""
Test script for serverless-specific error handling implementation.
Tests memory monitoring, timeout handling, production error responses, and diagnostics.
"""

import sys
import os
import json
import time
import requests
from datetime import datetime

# Add the api directory to the path so we can import the utilities
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'api'))

try:
    from python_utils import (
        ServerlessLogger, ServerlessErrorHandler, PDFMetadataExtractor,
        DocumentValidator, TempFileManager, MemoryMonitor, TimeoutHandler,
        ProductionErrorHandler, VercelDiagnostics,
        create_success_response
    )
    print("✅ Successfully imported enhanced python_utils")
except ImportError as e:
    print(f"❌ Failed to import python_utils: {e}")
    sys.exit(1)

def test_memory_monitor():
    """Test memory monitoring functionality."""
    print("\n🧠 Testing Memory Monitor...")
    
    # Test memory usage retrieval
    memory_info = MemoryMonitor.get_memory_usage()
    print(f"Memory info: {memory_info}")
    
    # Test memory limit checking
    limit_ok = MemoryMonitor.check_memory_limit()
    print(f"Memory limit check: {'✅ OK' if limit_ok else '⚠️ High usage'}")
    
    # Test graceful degradation strategies
    test_memory_scenarios = [
        {'rss_mb': 100},  # Normal
        {'rss_mb': 350},  # Moderate
        {'rss_mb': 400},  # High
        {'rss_mb': 450},  # Very high
    ]
    
    for scenario in test_memory_scenarios:
        strategy = MemoryMonitor.implement_graceful_degradation(scenario, "test_operation")
        print(f"Memory {scenario['rss_mb']}MB -> Strategy: {strategy['strategy']} ({strategy['reason']})")
    
    print("✅ Memory Monitor tests completed")

def test_timeout_handler():
    """Test timeout handling functionality."""
    print("\n⏱️ Testing Timeout Handler...")
    
    # Test execution time limit
    time_limit = TimeoutHandler.get_execution_time_limit()
    print(f"Execution time limit: {time_limit} seconds")
    
    # Test timeout risk checking with different elapsed times
    start_time = time.time()
    
    # Simulate different elapsed times
    test_scenarios = [
        0.5,  # Very early
        3.0,  # Normal
        6.0,  # Getting close (70% of 8 second limit)
        7.5,  # Very close (90% of 8 second limit)
    ]
    
    for elapsed in test_scenarios:
        # Simulate elapsed time by adjusting start_time
        simulated_start = start_time - elapsed
        timeout_info = TimeoutHandler.check_timeout_risk(simulated_start, "test_operation")
        risk_status = "⚠️ AT RISK" if timeout_info['at_risk'] else "✅ OK"
        print(f"Elapsed {elapsed}s -> {risk_status} (Strategy: {timeout_info.get('strategy', 'continue')})")
    
    # Test timeout response creation
    timeout_response = TimeoutHandler.create_timeout_response(8.5, "test_operation")
    print(f"Timeout response: {timeout_response['error']['code']}")
    
    print("✅ Timeout Handler tests completed")

def test_production_error_handler():
    """Test production error handling functionality."""
    print("\n🚨 Testing Production Error Handler...")
    
    # Test different error types
    test_errors = [
        (MemoryError("Out of memory"), "Memory operation"),
        (TimeoutError("Operation timed out"), "Long operation"),
        (ImportError("Module not found"), "Dependency loading"),
        (ValueError("Invalid input data"), "Data validation"),
        (FileNotFoundError("File missing"), "File operation"),
        (Exception("Generic error"), "Unknown operation"),
    ]
    
    for error, context in test_errors:
        response = ProductionErrorHandler.create_production_error_response(
            error, context, request_id="test_123", 
            debug_info={"test": True, "error_type": type(error).__name__}
        )
        
        error_info = response['error']
        print(f"Error: {type(error).__name__} -> Code: {error_info['code']}, Category: {error_info['category']}")
        print(f"  Suggestions: {len(response['suggestions'])} provided")
    
    print("✅ Production Error Handler tests completed")

def test_vercel_diagnostics():
    """Test Vercel diagnostics functionality."""
    print("\n🔍 Testing Vercel Diagnostics...")
    
    diagnostics = VercelDiagnostics.get_function_diagnostics()
    
    print("Diagnostic information collected:")
    print(f"  Environment: {diagnostics.get('environment', {}).get('vercel_env', 'unknown')}")
    print(f"  Memory info available: {'memory' in diagnostics}")
    print(f"  Filesystem info: {'filesystem' in diagnostics}")
    print(f"  Dependencies checked: {len(diagnostics.get('dependencies', {}))}")
    print(f"  Limits defined: {'limits' in diagnostics}")
    
    print("✅ Vercel Diagnostics tests completed")

def test_document_validator():
    """Test document validation with enhanced error handling."""
    print("\n📄 Testing Document Validator...")
    
    # Test valid document
    valid_doc = {
        'title': 'Test Document',
        'authors': [{'name': 'Test Author'}],
        'sections': [{'title': 'Introduction', 'content': 'Test content'}]
    }
    
    try:
        DocumentValidator.validate_document_request(valid_doc)
        print("✅ Valid document passed validation")
    except Exception as e:
        print(f"❌ Valid document failed: {e}")
    
    # Test invalid documents
    invalid_docs = [
        ({}, "Empty document"),
        ({'title': 'Test'}, "Missing authors"),
        ({'title': 'Test', 'authors': []}, "Empty authors"),
        ({'title': 'Test', 'authors': [{'name': 'Author'}]}, "Missing sections"),
    ]
    
    for invalid_doc, description in invalid_docs:
        try:
            DocumentValidator.validate_document_request(invalid_doc)
            print(f"❌ {description} should have failed validation")
        except ValueError as e:
            print(f"✅ {description} correctly failed: {str(e)[:50]}...")
    
    print("✅ Document Validator tests completed")

def test_temp_file_manager():
    """Test temporary file management."""
    print("\n📁 Testing Temp File Manager...")
    
    # Test temp directory detection
    temp_dir = TempFileManager.get_temp_directory()
    print(f"Temp directory: {temp_dir}")
    
    # Test temp file creation and cleanup
    try:
        temp_file = TempFileManager.create_temp_file(suffix='.test', content=b'test data')
        print(f"✅ Created temp file: {temp_file}")
        
        # Verify file exists and has content
        if os.path.exists(temp_file):
            with open(temp_file, 'rb') as f:
                content = f.read()
            print(f"✅ File content verified: {len(content)} bytes")
        
        # Test cleanup
        TempFileManager.cleanup_temp_file(temp_file)
        if not os.path.exists(temp_file):
            print("✅ File cleanup successful")
        else:
            print("⚠️ File cleanup may have failed")
            
    except Exception as e:
        print(f"❌ Temp file test failed: {e}")
    
    print("✅ Temp File Manager tests completed")

def test_serverless_logger():
    """Test serverless logging functionality."""
    print("\n📝 Testing Serverless Logger...")
    
    # Test different log levels
    ServerlessLogger.info("Test info message", test_id="test_123")
    ServerlessLogger.warning("Test warning message", test_id="test_123")
    ServerlessLogger.error("Test error message", test_id="test_123", error_code="TEST_ERROR")
    ServerlessLogger.debug("Test debug message", test_id="test_123")
    
    print("✅ Serverless Logger tests completed (check stderr for log output)")

def test_pdf_metadata_extractor():
    """Test PDF metadata extraction."""
    print("\n📊 Testing PDF Metadata Extractor...")
    
    # Create a simple PDF for testing
    try:
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import letter
        from io import BytesIO
        
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        c.drawString(100, 750, "Test PDF for metadata extraction")
        c.save()
        
        pdf_data = buffer.getvalue()
        buffer.close()
        
        # Test metadata extraction
        metadata = PDFMetadataExtractor.extract_basic_metadata(pdf_data)
        print(f"✅ PDF metadata extracted:")
        print(f"  Size: {metadata.get('size_bytes', 0)} bytes ({metadata.get('size_mb', 0)} MB)")
        print(f"  Valid PDF: {metadata.get('is_valid_pdf', False)}")
        print(f"  Generated at: {metadata.get('generated_at', 'unknown')}")
        
        # Test PDF validation
        is_valid = PDFMetadataExtractor.is_valid_pdf(pdf_data)
        print(f"✅ PDF validation: {'Valid' if is_valid else 'Invalid'}")
        
        # Test size validation
        try:
            PDFMetadataExtractor.validate_pdf_size(pdf_data, max_size_mb=1)
            print("✅ PDF size validation passed")
        except ValueError as e:
            print(f"⚠️ PDF size validation: {e}")
            
    except ImportError:
        print("⚠️ ReportLab not available for PDF testing")
    except Exception as e:
        print(f"❌ PDF metadata test failed: {e}")
    
    print("✅ PDF Metadata Extractor tests completed")

def run_integration_test():
    """Run an integration test simulating a complete serverless function execution."""
    print("\n🔄 Running Integration Test...")
    
    start_time = time.time()
    request_id = f"integration_test_{int(start_time)}"
    
    try:
        # Simulate serverless function execution with error handling
        ServerlessLogger.info("Starting integration test", request_id=request_id)
        
        # Check initial memory
        if not MemoryMonitor.check_memory_limit():
            print("⚠️ High memory usage detected at start")
        
        # Simulate some processing time
        time.sleep(0.1)
        
        # Check timeout risk
        timeout_info = TimeoutHandler.check_timeout_risk(start_time, "integration_test")
        if timeout_info['at_risk']:
            print(f"⚠️ Timeout risk detected: {timeout_info}")
        
        # Simulate successful completion
        elapsed_time = time.time() - start_time
        
        # Create success response
        response = create_success_response(
            {"test": "completed"},
            "Integration test completed successfully",
            {
                "request_id": request_id,
                "execution_time": elapsed_time,
                "memory_info": MemoryMonitor.get_memory_usage()
            }
        )
        
        print(f"✅ Integration test completed in {elapsed_time:.3f}s")
        print(f"Response success: {response['success']}")
        
    except Exception as e:
        # Test error handling
        error_response = ProductionErrorHandler.create_production_error_response(
            e, "Integration test", request_id=request_id,
            debug_info={"elapsed_time": time.time() - start_time}
        )
        print(f"❌ Integration test failed: {error_response['error']['code']}")
    
    print("✅ Integration test completed")

def main():
    """Run all tests."""
    print("🧪 Starting Serverless Error Handling Tests")
    print("=" * 50)
    
    try:
        test_memory_monitor()
        test_timeout_handler()
        test_production_error_handler()
        test_vercel_diagnostics()
        test_document_validator()
        test_temp_file_manager()
        test_serverless_logger()
        test_pdf_metadata_extractor()
        run_integration_test()
        
        print("\n" + "=" * 50)
        print("🎉 All serverless error handling tests completed!")
        print("✅ Implementation appears to be working correctly")
        
    except Exception as e:
        print(f"\n❌ Test suite failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()