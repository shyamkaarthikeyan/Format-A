/**
 * Document templates and content snippets for academic papers
 */

import type { Section, ContentBlock, Document } from '@shared/schema';

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category: 'research' | 'conference' | 'journal' | 'thesis';
  sections: Omit<Section, 'id'>[];
  suggestedKeywords: string[];
  estimatedLength: string;
}

export interface ContentSnippet {
  id: string;
  name: string;
  description: string;
  category: 'introduction' | 'methodology' | 'results' | 'discussion' | 'conclusion';
  content: string;
  type: ContentBlock['type'];
}

export const documentTemplates: DocumentTemplate[] = [
  {
    id: 'research-paper',
    name: 'Research Paper',
    description: 'Standard academic research paper structure with introduction, methodology, results, and conclusion',
    category: 'research',
    estimatedLength: '6-8 pages',
    suggestedKeywords: ['research', 'methodology', 'analysis', 'results'],
    sections: [
      {
        title: 'Introduction',
        contentBlocks: [
          {
            id: 'intro-text',
            type: 'text',
            content: 'This paper presents...',
            order: 0,
          }
        ],
        subsections: [],
        order: 0,
      },
      {
        title: 'Literature Review',
        contentBlocks: [
          {
            id: 'lit-review-text',
            type: 'text',
            content: 'Previous research in this area has shown...',
            order: 0,
          }
        ],
        subsections: [],
        order: 1,
      },
      {
        title: 'Methodology',
        contentBlocks: [
          {
            id: 'method-text',
            type: 'text',
            content: 'The methodology employed in this study...',
            order: 0,
          }
        ],
        subsections: [
          {
            id: 'data-collection',
            title: 'Data Collection',
            content: 'Data was collected using...',
            order: 0,
            level: 1,
          },
          {
            id: 'analysis-method',
            title: 'Analysis Method',
            content: 'The analysis was performed using...',
            order: 1,
            level: 1,
          }
        ],
        order: 2,
      },
      {
        title: 'Results',
        contentBlocks: [
          {
            id: 'results-text',
            type: 'text',
            content: 'The results demonstrate that...',
            order: 0,
          }
        ],
        subsections: [],
        order: 3,
      },
      {
        title: 'Discussion',
        contentBlocks: [
          {
            id: 'discussion-text',
            type: 'text',
            content: 'These results suggest that...',
            order: 0,
          }
        ],
        subsections: [],
        order: 4,
      },
      {
        title: 'Conclusion',
        contentBlocks: [
          {
            id: 'conclusion-text',
            type: 'text',
            content: 'In conclusion, this study...',
            order: 0,
          }
        ],
        subsections: [],
        order: 5,
      }
    ],
  },
  {
    id: 'conference-paper',
    name: 'Conference Paper',
    description: 'Concise conference paper format focusing on key contributions and results',
    category: 'conference',
    estimatedLength: '4-6 pages',
    suggestedKeywords: ['conference', 'contribution', 'innovation'],
    sections: [
      {
        title: 'Introduction',
        contentBlocks: [
          {
            id: 'intro-text',
            type: 'text',
            content: 'This work addresses the problem of...',
            order: 0,
          }
        ],
        subsections: [],
        order: 0,
      },
      {
        title: 'Related Work',
        contentBlocks: [
          {
            id: 'related-work-text',
            type: 'text',
            content: 'Existing approaches to this problem include...',
            order: 0,
          }
        ],
        subsections: [],
        order: 1,
      },
      {
        title: 'Approach',
        contentBlocks: [
          {
            id: 'approach-text',
            type: 'text',
            content: 'We propose a novel approach that...',
            order: 0,
          }
        ],
        subsections: [],
        order: 2,
      },
      {
        title: 'Evaluation',
        contentBlocks: [
          {
            id: 'evaluation-text',
            type: 'text',
            content: 'We evaluated our approach using...',
            order: 0,
          }
        ],
        subsections: [],
        order: 3,
      },
      {
        title: 'Conclusion and Future Work',
        contentBlocks: [
          {
            id: 'conclusion-text',
            type: 'text',
            content: 'The main contributions of this work are...',
            order: 0,
          }
        ],
        subsections: [],
        order: 4,
      }
    ],
  },
  {
    id: 'journal-article',
    name: 'Journal Article',
    description: 'Comprehensive journal article with detailed methodology and extensive analysis',
    category: 'journal',
    estimatedLength: '8-12 pages',
    suggestedKeywords: ['journal', 'comprehensive', 'detailed analysis'],
    sections: [
      {
        title: 'Introduction',
        contentBlocks: [
          {
            id: 'intro-text',
            type: 'text',
            content: 'The significance of this research lies in...',
            order: 0,
          }
        ],
        subsections: [
          {
            id: 'background',
            title: 'Background',
            content: 'The background to this research...',
            order: 0,
            level: 1,
          },
          {
            id: 'objectives',
            title: 'Research Objectives',
            content: 'The objectives of this study are...',
            order: 1,
            level: 1,
          }
        ],
        order: 0,
      },
      {
        title: 'Literature Review',
        contentBlocks: [
          {
            id: 'lit-review-text',
            type: 'text',
            content: 'A comprehensive review of the literature reveals...',
            order: 0,
          }
        ],
        subsections: [],
        order: 1,
      },
      {
        title: 'Theoretical Framework',
        contentBlocks: [
          {
            id: 'theory-text',
            type: 'text',
            content: 'The theoretical framework for this study is based on...',
            order: 0,
          }
        ],
        subsections: [],
        order: 2,
      },
      {
        title: 'Methodology',
        contentBlocks: [
          {
            id: 'method-text',
            type: 'text',
            content: 'This study employs a mixed-methods approach...',
            order: 0,
          }
        ],
        subsections: [
          {
            id: 'research-design',
            title: 'Research Design',
            content: 'The research design is...',
            order: 0,
            level: 1,
          },
          {
            id: 'participants',
            title: 'Participants',
            content: 'The study participants were...',
            order: 1,
            level: 1,
          },
          {
            id: 'data-collection',
            title: 'Data Collection',
            content: 'Data collection procedures included...',
            order: 2,
            level: 1,
          },
          {
            id: 'data-analysis',
            title: 'Data Analysis',
            content: 'Data analysis was conducted using...',
            order: 3,
            level: 1,
          }
        ],
        order: 3,
      },
      {
        title: 'Results',
        contentBlocks: [
          {
            id: 'results-text',
            type: 'text',
            content: 'The analysis revealed several key findings...',
            order: 0,
          }
        ],
        subsections: [],
        order: 4,
      },
      {
        title: 'Discussion',
        contentBlocks: [
          {
            id: 'discussion-text',
            type: 'text',
            content: 'The findings of this study have several important implications...',
            order: 0,
          }
        ],
        subsections: [
          {
            id: 'implications',
            title: 'Implications',
            content: 'The implications of these findings include...',
            order: 0,
            level: 1,
          },
          {
            id: 'limitations',
            title: 'Limitations',
            content: 'This study has several limitations...',
            order: 1,
            level: 1,
          }
        ],
        order: 5,
      },
      {
        title: 'Conclusion',
        contentBlocks: [
          {
            id: 'conclusion-text',
            type: 'text',
            content: 'This research contributes to the field by...',
            order: 0,
          }
        ],
        subsections: [],
        order: 6,
      }
    ],
  },
  {
    id: 'thesis-chapter',
    name: 'Thesis Chapter',
    description: 'Detailed thesis chapter structure with comprehensive subsections',
    category: 'thesis',
    estimatedLength: '15-25 pages',
    suggestedKeywords: ['thesis', 'chapter', 'comprehensive'],
    sections: [
      {
        title: 'Introduction',
        contentBlocks: [
          {
            id: 'intro-text',
            type: 'text',
            content: 'This chapter examines...',
            order: 0,
          }
        ],
        subsections: [
          {
            id: 'chapter-overview',
            title: 'Chapter Overview',
            content: 'This chapter is organized as follows...',
            order: 0,
            level: 1,
          }
        ],
        order: 0,
      },
      {
        title: 'Theoretical Background',
        contentBlocks: [
          {
            id: 'theory-text',
            type: 'text',
            content: 'The theoretical foundation for this chapter...',
            order: 0,
          }
        ],
        subsections: [],
        order: 1,
      },
      {
        title: 'Detailed Analysis',
        contentBlocks: [
          {
            id: 'analysis-text',
            type: 'text',
            content: 'A detailed analysis reveals...',
            order: 0,
          }
        ],
        subsections: [
          {
            id: 'analysis-part1',
            title: 'First Analysis Component',
            content: 'The first component of the analysis...',
            order: 0,
            level: 1,
          },
          {
            id: 'analysis-part2',
            title: 'Second Analysis Component',
            content: 'The second component focuses on...',
            order: 1,
            level: 1,
          }
        ],
        order: 2,
      },
      {
        title: 'Chapter Summary',
        contentBlocks: [
          {
            id: 'summary-text',
            type: 'text',
            content: 'This chapter has demonstrated...',
            order: 0,
          }
        ],
        subsections: [],
        order: 3,
      }
    ],
  }
];

export const contentSnippets: ContentSnippet[] = [
  // Introduction snippets
  {
    id: 'intro-problem-statement',
    name: 'Problem Statement',
    description: 'Clear statement of the research problem',
    category: 'introduction',
    type: 'text',
    content: 'The problem addressed in this research is [describe the specific problem]. This issue is significant because [explain why it matters]. Current approaches to this problem have limitations including [list key limitations].',
  },
  {
    id: 'intro-research-gap',
    name: 'Research Gap',
    description: 'Identification of gaps in existing research',
    category: 'introduction',
    type: 'text',
    content: 'While previous research has made significant contributions to [area], there remains a gap in understanding [specific gap]. This study addresses this gap by [how your research fills the gap].',
  },
  {
    id: 'intro-objectives',
    name: 'Research Objectives',
    description: 'Clear statement of research objectives',
    category: 'introduction',
    type: 'text',
    content: 'The primary objective of this research is to [main objective]. Secondary objectives include: (1) [objective 1], (2) [objective 2], and (3) [objective 3].',
  },

  // Methodology snippets
  {
    id: 'method-experimental-design',
    name: 'Experimental Design',
    description: 'Description of experimental methodology',
    category: 'methodology',
    type: 'text',
    content: 'This study employs a [type of design] experimental design. The independent variables are [list variables] and the dependent variable is [dependent variable]. Control variables include [control variables].',
  },
  {
    id: 'method-data-collection',
    name: 'Data Collection Procedure',
    description: 'Detailed data collection methodology',
    category: 'methodology',
    type: 'text',
    content: 'Data collection was conducted over [time period] using [methods]. The sample consisted of [sample description]. Data collection instruments included [list instruments].',
  },
  {
    id: 'method-statistical-analysis',
    name: 'Statistical Analysis',
    description: 'Description of statistical methods used',
    category: 'methodology',
    type: 'text',
    content: 'Statistical analysis was performed using [software]. Descriptive statistics were calculated for all variables. [Specific tests] were used to test the hypotheses. The significance level was set at α = 0.05.',
  },

  // Results snippets
  {
    id: 'results-descriptive',
    name: 'Descriptive Results',
    description: 'Presentation of descriptive statistics',
    category: 'results',
    type: 'text',
    content: 'Descriptive statistics for the study variables are presented in Table [X]. The mean [variable] was [value] (SD = [value], range = [range]). [Additional descriptive findings].',
  },
  {
    id: 'results-hypothesis-testing',
    name: 'Hypothesis Testing Results',
    description: 'Results of statistical hypothesis testing',
    category: 'results',
    type: 'text',
    content: 'The results of [statistical test] indicated [result], [test statistic] = [value], p [< or >] [p-value]. This [supports/does not support] the hypothesis that [hypothesis statement].',
  },
  {
    id: 'results-figure-reference',
    name: 'Figure Reference',
    description: 'Reference to figures in results',
    category: 'results',
    type: 'text',
    content: 'As shown in Figure [X], [description of what the figure shows]. The pattern observed suggests [interpretation of the pattern].',
  },

  // Discussion snippets
  {
    id: 'discussion-interpretation',
    name: 'Results Interpretation',
    description: 'Interpretation of research findings',
    category: 'discussion',
    type: 'text',
    content: 'The findings of this study suggest that [main finding]. This result is consistent with [previous research] and supports the theory that [theoretical implication]. The practical implications include [practical implications].',
  },
  {
    id: 'discussion-limitations',
    name: 'Study Limitations',
    description: 'Acknowledgment of research limitations',
    category: 'discussion',
    type: 'text',
    content: 'Several limitations should be considered when interpreting these results. First, [limitation 1]. Second, [limitation 2]. Finally, [limitation 3]. Future research should address these limitations by [suggestions].',
  },
  {
    id: 'discussion-future-work',
    name: 'Future Research Directions',
    description: 'Suggestions for future research',
    category: 'discussion',
    type: 'text',
    content: 'Future research should focus on [direction 1]. Additionally, investigating [direction 2] would provide valuable insights. Long-term studies examining [direction 3] are also needed.',
  },

  // Conclusion snippets
  {
    id: 'conclusion-summary',
    name: 'Research Summary',
    description: 'Summary of key research findings',
    category: 'conclusion',
    type: 'text',
    content: 'This research investigated [research question] and found that [key finding 1], [key finding 2], and [key finding 3]. These findings contribute to [field/area] by [contribution].',
  },
  {
    id: 'conclusion-contributions',
    name: 'Research Contributions',
    description: 'Statement of research contributions',
    category: 'conclusion',
    type: 'text',
    content: 'The main contributions of this work are: (1) [contribution 1], (2) [contribution 2], and (3) [contribution 3]. These contributions advance the field by [how they advance the field].',
  },
  {
    id: 'conclusion-final-thoughts',
    name: 'Final Thoughts',
    description: 'Concluding remarks and broader implications',
    category: 'conclusion',
    type: 'text',
    content: 'In conclusion, this research demonstrates [main demonstration]. The broader implications of this work extend to [broader implications]. As the field continues to evolve, [future outlook].',
  },
];

// Helper functions
export const getTemplatesByCategory = (category: DocumentTemplate['category']) => {
  return documentTemplates.filter(template => template.category === category);
};

export const getSnippetsByCategory = (category: ContentSnippet['category']) => {
  return contentSnippets.filter(snippet => snippet.category === category);
};

export const applyTemplate = (template: DocumentTemplate): Partial<Document> => {
  return {
    title: `New ${template.name}`,
    sections: template.sections.map((section, index) => ({
      ...section,
      id: `section_${Date.now()}_${index}`,
      contentBlocks: section.contentBlocks.map((block, blockIndex) => ({
        ...block,
        id: `block_${Date.now()}_${blockIndex}`,
      })),
      subsections: section.subsections.map((sub, subIndex) => ({
        ...sub,
        id: `subsection_${Date.now()}_${subIndex}`,
      })),
    })),
    keywords: template.suggestedKeywords.join(', '),
  };
};