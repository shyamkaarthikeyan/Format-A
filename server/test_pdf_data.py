import json
import sys
import os

# Test data for PDF generation
test_document = {
    "title": "Test IEEE Paper",
    "authors": [
        {
            "name": "John Doe",
            "department": "Computer Science",
            "organization": "Test University",
            "city": "Test City",
            "state": "TC"
        }
    ],
    "abstract": "This is a test abstract for the IEEE paper generation.",
    "keywords": "test, ieee, paper, generation",
    "sections": [
        {
            "title": "Introduction",
            "contentBlocks": [
                {
                    "type": "text",
                    "content": "This is the introduction section of the test paper."
                }
            ]
        }
    ],
    "references": [
        {
            "text": "J. Doe, 'Test Reference,' Test Journal, vol. 1, no. 1, pp. 1-10, 2025."
        }
    ]
}

if __name__ == "__main__":
    # Write test data to stdout as JSON
    json.dump(test_document, sys.stdout)