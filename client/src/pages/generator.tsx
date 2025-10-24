import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ContentEditor from '@/components/ContentEditor';
import { FileText, Send, Save } from 'lucide-react';

const Generator = () => {
  const [formData, setFormData] = useState({
    title: '',
    authors: '',
    abstract: '',
    keywords: ''
  });

  const sections = [
    { id: 'introduction', title: 'Introduction', required: true },
    { id: 'methodology', title: 'Methodology', required: true },
    { id: 'results', title: 'Results', required: true },
    { id: 'discussion', title: 'Discussion', required: false },
    { id: 'conclusion', title: 'Conclusion', required: true },
    { id: 'references', title: 'References', required: true }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            IEEE Paper Generator
          </h1>
          <p className="text-xl text-gray-600">
            Create your research paper with our intelligent content editor
          </p>
        </div>

        {/* Basic Info Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Paper Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Paper Title</label>
              <input
                type="text"
                placeholder="Enter your paper title..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Authors</label>
                <input
                  type="text"
                  placeholder="John Doe, Jane Smith..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.authors}
                  onChange={(e) => setFormData({...formData, authors: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Keywords</label>
                <input
                  type="text"
                  placeholder="machine learning, AI, research..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={formData.keywords}
                  onChange={(e) => setFormData({...formData, keywords: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Abstract</label>
              <textarea
                placeholder="Write your abstract here..."
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.abstract}
                onChange={(e) => setFormData({...formData, abstract: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>

        {/* Content Sections */}
        <div className="space-y-8">
          {sections.map((section, index) => (
            <Card key={section.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>
                    {index + 1}. {section.title}
                    {section.required && <span className="text-red-500 ml-1">*</span>}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Save className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ContentEditor />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mt-12 mb-8">
          <Button variant="outline" size="lg" className="px-8">
            <Save className="w-5 h-5 mr-2" />
            Save Draft
          </Button>
          
          <Button size="lg" className="px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
            <Send className="w-5 h-5 mr-2" />
            Generate IEEE Paper
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Generator;