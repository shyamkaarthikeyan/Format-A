/**
 * Academic writing suggestions and auto-completion data
 */

export const academicPhrases = [
  // Introduction phrases
  "This paper presents",
  "This study investigates",
  "The purpose of this research is to",
  "In this paper, we propose",
  "The main contribution of this work is",
  "This research aims to",
  "The objective of this study is to",
  "We introduce a novel approach",
  "This work addresses the problem of",
  "The significance of this research lies in",

  // Methodology phrases
  "The methodology employed in this study",
  "We conducted experiments to",
  "The experimental setup consists of",
  "Data was collected using",
  "The analysis was performed using",
  "We implemented the algorithm using",
  "The evaluation metrics include",
  "Statistical analysis was conducted",
  "The dataset comprises",
  "We compared our approach with",

  // Results phrases
  "The results demonstrate that",
  "Our findings indicate that",
  "The experimental results show",
  "As shown in Figure",
  "Table X presents the results",
  "The performance evaluation reveals",
  "Compared to existing methods",
  "The proposed approach achieves",
  "Statistical significance was observed",
  "The analysis reveals that",

  // Discussion phrases
  "These results suggest that",
  "The findings are consistent with",
  "This can be attributed to",
  "One possible explanation is",
  "The implications of these findings",
  "However, it should be noted that",
  "Despite these limitations",
  "Future research should focus on",
  "The practical applications include",
  "These observations support the hypothesis",

  // Conclusion phrases
  "In conclusion, this study",
  "The main findings of this research",
  "This work contributes to",
  "The results provide evidence for",
  "Future work will focus on",
  "The limitations of this study include",
  "This research opens new avenues for",
  "The proposed method demonstrates",
  "In summary, we have presented",
  "The key contributions are",
];

export const technicalTerms = [
  // Computer Science
  "algorithm", "artificial intelligence", "machine learning", "deep learning",
  "neural network", "convolutional neural network", "recurrent neural network",
  "natural language processing", "computer vision", "data mining", "big data",
  "cloud computing", "distributed systems", "parallel processing", "optimization",
  "classification", "regression", "clustering", "supervised learning",
  "unsupervised learning", "reinforcement learning", "feature extraction",
  "dimensionality reduction", "cross-validation", "overfitting", "underfitting",

  // Engineering
  "methodology", "implementation", "evaluation", "performance", "efficiency",
  "scalability", "reliability", "robustness", "accuracy", "precision", "recall",
  "sensitivity", "specificity", "throughput", "latency", "bandwidth",
  "architecture", "framework", "infrastructure", "protocol", "interface",

  // Research Methods
  "hypothesis", "experiment", "analysis", "statistical significance",
  "correlation", "causation", "variable", "parameter", "metric", "benchmark",
  "baseline", "validation", "verification", "simulation", "modeling",
  "quantitative", "qualitative", "empirical", "theoretical", "comparative",

  // Mathematics
  "equation", "function", "matrix", "vector", "probability", "statistics",
  "distribution", "variance", "standard deviation", "mean", "median", "mode",
  "regression", "correlation coefficient", "confidence interval", "p-value",
  "null hypothesis", "alternative hypothesis", "significance level",
];

export const institutionSuggestions = [
  // Universities
  "Massachusetts Institute of Technology",
  "Stanford University",
  "Harvard University",
  "University of California, Berkeley",
  "Carnegie Mellon University",
  "California Institute of Technology",
  "Princeton University",
  "University of Cambridge",
  "University of Oxford",
  "ETH Zurich",
  "University of Toronto",
  "University of Washington",
  "Georgia Institute of Technology",
  "University of Illinois at Urbana-Champaign",
  "University of Michigan",
  "Cornell University",
  "University of Pennsylvania",
  "Columbia University",
  "Yale University",
  "University of Chicago",

  // Research Institutions
  "Google Research",
  "Microsoft Research",
  "IBM Research",
  "Facebook AI Research",
  "OpenAI",
  "DeepMind",
  "Adobe Research",
  "NVIDIA Research",
  "Intel Labs",
  "Amazon Research",
  "Apple Machine Learning Research",
  "Baidu Research",
  "Tencent AI Lab",
  "Alibaba DAMO Academy",

  // Government Labs
  "National Institute of Standards and Technology",
  "Lawrence Berkeley National Laboratory",
  "Los Alamos National Laboratory",
  "Oak Ridge National Laboratory",
  "Argonne National Laboratory",
  "Sandia National Laboratories",
  "NASA Jet Propulsion Laboratory",
  "National Institutes of Health",
  "Centers for Disease Control and Prevention",
];

export const departmentSuggestions = [
  "Department of Computer Science",
  "Department of Electrical Engineering",
  "Department of Mechanical Engineering",
  "Department of Mathematics",
  "Department of Physics",
  "Department of Chemistry",
  "Department of Biology",
  "Department of Statistics",
  "Department of Information Systems",
  "Department of Data Science",
  "School of Engineering",
  "School of Medicine",
  "College of Computing",
  "Faculty of Science",
  "Institute of Technology",
  "Center for Artificial Intelligence",
  "Laboratory for Computer Science",
  "Research Center for Machine Learning",
  "Institute for Data Science",
  "Center for Computational Biology",
];

export const keywordSuggestions = [
  // AI/ML Keywords
  "artificial intelligence", "machine learning", "deep learning", "neural networks",
  "computer vision", "natural language processing", "reinforcement learning",
  "supervised learning", "unsupervised learning", "transfer learning",
  "generative adversarial networks", "transformer models", "attention mechanism",
  "convolutional neural networks", "recurrent neural networks",

  // Data Science
  "data mining", "big data", "data analytics", "predictive modeling",
  "statistical analysis", "feature selection", "dimensionality reduction",
  "clustering", "classification", "regression", "time series analysis",

  // Computer Science
  "algorithms", "data structures", "software engineering", "distributed systems",
  "cloud computing", "cybersecurity", "human-computer interaction",
  "computer graphics", "database systems", "operating systems",

  // Engineering
  "optimization", "simulation", "modeling", "control systems", "signal processing",
  "image processing", "robotics", "automation", "sensors", "embedded systems",

  // Research Methods
  "experimental design", "statistical methods", "performance evaluation",
  "comparative analysis", "case study", "survey research", "meta-analysis",
];

export const citationStyles = [
  "IEEE",
  "APA",
  "MLA",
  "Chicago",
  "Harvard",
  "Vancouver",
  "ACM",
  "Springer",
  "Nature",
  "Science",
];

// Helper functions
export const getSuggestions = (type: 'phrases' | 'terms' | 'institutions' | 'departments' | 'keywords') => {
  switch (type) {
    case 'phrases':
      return academicPhrases;
    case 'terms':
      return technicalTerms;
    case 'institutions':
      return institutionSuggestions;
    case 'departments':
      return departmentSuggestions;
    case 'keywords':
      return keywordSuggestions;
    default:
      return [];
  }
};

export const getContextualSuggestions = (context: string) => {
  const lowerContext = context.toLowerCase();
  
  if (lowerContext.includes('introduction') || lowerContext.includes('abstract')) {
    return academicPhrases.filter(phrase => 
      phrase.includes('This paper') || 
      phrase.includes('This study') || 
      phrase.includes('research aims') ||
      phrase.includes('objective')
    );
  }
  
  if (lowerContext.includes('methodology') || lowerContext.includes('method')) {
    return academicPhrases.filter(phrase => 
      phrase.includes('methodology') || 
      phrase.includes('experiment') || 
      phrase.includes('analysis') ||
      phrase.includes('implemented')
    );
  }
  
  if (lowerContext.includes('results') || lowerContext.includes('findings')) {
    return academicPhrases.filter(phrase => 
      phrase.includes('results') || 
      phrase.includes('findings') || 
      phrase.includes('demonstrate') ||
      phrase.includes('performance')
    );
  }
  
  if (lowerContext.includes('conclusion') || lowerContext.includes('discussion')) {
    return academicPhrases.filter(phrase => 
      phrase.includes('conclusion') || 
      phrase.includes('findings') || 
      phrase.includes('implications') ||
      phrase.includes('future')
    );
  }
  
  return academicPhrases;
};