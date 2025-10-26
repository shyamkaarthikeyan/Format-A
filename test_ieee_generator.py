#!/usr/bin/env python3
"""
Test script for IEEE PDF Generator
"""

import json
import subprocess
import sys
import os

# Sample IEEE paper data
sample_data = {
    "title": "Advanced Machine Learning Techniques for Data Classification",
    "authors": [
        {
            "name": "John Smith",
            "department": "Department of Computer Science",
            "organization": "University of Technology",
            "city": "San Francisco",
            "state": "CA",
            "customFields": [
                {"value": "Email: john.smith@university.edu"}
            ]
        },
        {
            "name": "Jane Doe",
            "department": "Department of Electrical Engineering", 
            "organization": "Tech Institute",
            "city": "Boston",
            "state": "MA",
            "customFields": [
                {"value": "Email: jane.doe@techinst.edu"}
            ]
        }
    ],
    "abstract": "This paper presents novel machine learning techniques for improving data classification accuracy. We propose a hybrid approach combining deep neural networks with traditional statistical methods. Our experimental results demonstrate significant improvements over existing baseline methods, achieving 95.2% accuracy on standard benchmark datasets.",
    "keywords": "machine learning, data classification, neural networks, statistical analysis, benchmark evaluation",
    "sections": [
        {
            "title": "Introduction",
            "contentBlocks": [
                {
                    "type": "text",
                    "content": "Machine learning has become increasingly important in modern data analysis applications. <b>Classification algorithms</b> form the backbone of many intelligent systems, from <i>image recognition</i> to natural language processing."
                },
                {
                    "type": "text", 
                    "content": "Traditional approaches often struggle with <u>high-dimensional data</u> and complex feature interactions. This paper addresses these challenges by proposing a novel hybrid methodology."
                }
            ]
        },
        {
            "title": "Methodology",
            "contentBlocks": [
                {
                    "type": "text",
                    "content": "Our approach combines three key components: <b>feature extraction</b>, <b>dimensionality reduction</b>, and <b>ensemble classification</b>. Each component is optimized for maximum performance while maintaining computational efficiency."
                }
            ],
            "subsections": [
                {
                    "title": "Feature Extraction",
                    "content": "We employ a multi-scale feature extraction process that captures both local and global patterns in the input data. The extraction process uses <i>convolutional neural networks</i> with varying kernel sizes."
                },
                {
                    "title": "Classification Framework", 
                    "content": "The classification framework integrates multiple learning algorithms through a <b>weighted voting mechanism</b>. This ensemble approach reduces overfitting and improves generalization."
                }
            ]
        },
        {
            "title": "Experimental Results",
            "contentBlocks": [
                {
                    "type": "text",
                    "content": "We evaluated our method on three standard benchmark datasets: CIFAR-10, ImageNet, and MNIST. The results demonstrate consistent improvements across all test scenarios."
                },
                {
                    "type": "text",
                    "content": "Performance metrics include <b>accuracy</b>, <b>precision</b>, <b>recall</b>, and <b>F1-score</b>. Our hybrid approach achieved state-of-the-art results on two of the three datasets."
                }
            ]
        },
        {
            "title": "Conclusion",
            "contentBlocks": [
                {
                    "type": "text",
                    "content": "This work presents a significant advancement in machine learning classification techniques. The proposed hybrid methodology offers both <i>improved accuracy</i> and <i>computational efficiency</i>."
                },
                {
                    "type": "text",
                    "content": "Future work will focus on extending these techniques to <u>real-time applications</u> and exploring their applicability to other domains such as natural language processing and computer vision."
                }
            ]
        }
    ],
    "references": [
        {
            "text": "A. Johnson and B. Williams, \"Deep Learning Approaches for Data Classification,\" IEEE Transactions on Neural Networks, vol. 28, no. 3, pp. 145-158, March 2021."
        },
        {
            "text": "C. Davis et al., \"Ensemble Methods in Machine Learning: A Comprehensive Survey,\" Journal of Machine Learning Research, vol. 15, pp. 2847-2883, 2020."
        },
        {
            "text": "E. Thompson and F. Garcia, \"Feature Engineering for High-Dimensional Data,\" Proceedings of the International Conference on Machine Learning, pp. 892-901, 2021."
        },
        {
            "text": "G. Lee and H. Kim, \"Hybrid Classification Algorithms: Theory and Practice,\" ACM Computing Surveys, vol. 53, no. 2, Article 42, April 2020."
        }
    ]
}

def test_ieee_generator():
    """Test the IEEE PDF generator with sample data."""
    try:
        # Convert sample data to JSON
        json_input = json.dumps(sample_data, indent=2)
        
        # Run the IEEE generator
        process = subprocess.Popen(
            [sys.executable, 'server/ieee_pdf_generator.py'],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # Send JSON data and get PDF output
        pdf_output, error_output = process.communicate(input=json_input.encode('utf-8'))
        
        if process.returncode != 0:
            print(f"Error running IEEE generator: {error_output.decode('utf-8')}")
            return False
        
        # Save the generated PDF
        output_file = 'sample_ieee_paper.pdf'
        with open(output_file, 'wb') as f:
            f.write(pdf_output)
        
        print(f"✅ IEEE PDF generated successfully: {output_file}")
        print(f"📄 File size: {len(pdf_output)} bytes")
        print(f"📋 Document contains:")
        print(f"   - Title: {sample_data['title']}")
        print(f"   - Authors: {len(sample_data['authors'])}")
        print(f"   - Sections: {len(sample_data['sections'])}")
        print(f"   - References: {len(sample_data['references'])}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing IEEE generator: {e}")
        return False

if __name__ == "__main__":
    print("🔬 Testing IEEE PDF Generator...")
    print("=" * 50)
    
    # Check if the generator file exists
    if not os.path.exists('server/ieee_pdf_generator.py'):
        print("❌ IEEE generator not found at server/ieee_pdf_generator.py")
        sys.exit(1)
    
    # Run the test
    success = test_ieee_generator()
    
    if success:
        print("\n🎉 Test completed successfully!")
        print("📖 You can now open 'sample_ieee_paper.pdf' to preview the generated document.")
    else:
        print("\n💥 Test failed. Check the error messages above.")
        sys.exit(1)