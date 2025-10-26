import React, { useState } from 'react';
import { 
  FileText, 
  Image, 
  Table, 
  Calculator, 
  Code, 
  Heading,
  Upload,
  Plus,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ContentBlock {
  id: string;
  type: 'text' | 'image' | 'table' | 'equation' | 'block' | 'subsection';
  content: any;
}

const ContentEditor = () => {
  const [activeTab, setActiveTab] = useState<ContentBlock['type']>('text');
  const [currentContent, setCurrentContent] = useState('');
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);

  const tabs = [
    { id: 'text', icon: FileText, label: 'Text', color: 'text-blue-600' },
    { id: 'image', icon: Image, label: 'Image', color: 'text-green-600' },
    { id: 'table', icon: Table, label: 'Table', color: 'text-purple-600' },
    { id: 'equation', icon: Calculator, label: 'Equation', color: 'text-red-600' },
    { id: 'block', icon: Code, label: 'Block', color: 'text-orange-600' },
    { id: 'subsection', icon: Heading, label: 'Subsection', color: 'text-indigo-600' }
  ];

  const addBlock = () => {
    const newBlock: ContentBlock = {
      id: Date.now().toString(),
      type: activeTab,
      content: currentContent
    };
    setBlocks([...blocks, newBlock]);
    setCurrentContent('');
  };

  const renderContentArea = () => {
    switch (activeTab) {
      case 'text':
        return (
          <div className="space-y-4">
            <textarea
              value={currentContent}
              onChange={(e) => setCurrentContent(e.target.value)}
              placeholder="Type your text content here..."
              className="w-full h-64 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        );

      case 'image':
        return (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-2">Drop image here or click to upload</p>
              <Button variant="outline">Choose File</Button>
            </div>
            <input
              type="text"
              placeholder="Image caption (optional)"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        );

      case 'table':
        return (
          <div className="space-y-4">
            <div className="flex gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Rows</label>
                <input type="number" min="1" max="10" defaultValue="3" className="w-20 p-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Columns</label>
                <input type="number" min="1" max="10" defaultValue="3" className="w-20 p-2 border rounded" />
              </div>
            </div>
            <div className="border border-gray-300 rounded-lg p-4">
              <table className="w-full">
                <tbody>
                  {[...Array(3)].map((_, row) => (
                    <tr key={row}>
                      {[...Array(3)].map((_, col) => (
                        <td key={col} className="border border-gray-200 p-2">
                          <input 
                            type="text" 
                            placeholder={`Cell ${row + 1},${col + 1}`}
                            className="w-full p-1 text-sm"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'equation':
        return (
          <div className="space-y-4">
            <textarea
              placeholder="Enter LaTeX equation (e.g., E = mc^2, \sum_{i=1}^{n} x_i)"
              className="w-full h-32 p-4 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Preview:</p>
              <div className="bg-white p-3 rounded border text-center">
                <span className="text-lg">E = mc²</span>
              </div>
            </div>
          </div>
        );

      case 'block':
        return (
          <div className="space-y-4">
            <select className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500">
              <option>Code Block</option>
              <option>Quote Block</option>
              <option>Note Block</option>
            </select>
            <textarea
              placeholder="Enter your code or quote content..."
              className="w-full h-48 p-4 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        );

      case 'subsection':
        return (
          <div className="space-y-4">
            <select className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
              <option>Heading 1</option>
              <option>Heading 2</option>
              <option>Heading 3</option>
            </select>
            <input
              type="text"
              placeholder="Enter subsection title..."
              className="w-full p-4 border border-gray-300 rounded-lg text-lg font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex h-96 border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div className="w-24 bg-gray-50 border-r border-gray-200 flex flex-col shadow-sm">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ContentBlock['type'])}
              className={`
                flex flex-col items-center justify-center p-3 h-16 transition-all duration-200
                ${isActive 
                  ? 'bg-white shadow-sm border-r-2 border-blue-500' 
                  : 'hover:bg-gray-100'
                }
              `}
              title={tab.label}
            >
              <Icon 
                className={`w-6 h-6 ${isActive ? tab.color : 'text-gray-500'}`} 
              />
              <span className={`text-xs mt-1 ${isActive ? tab.color : 'text-gray-500'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">
              {tabs.find(tab => tab.id === activeTab)?.label} Content
            </h3>
            <Button 
              onClick={addBlock}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
        </div>

        {/* Content Editor */}
        <div className="flex-1 p-4">
          {renderContentArea()}
        </div>
      </div>
    </div>
  );
};

export default ContentEditor;