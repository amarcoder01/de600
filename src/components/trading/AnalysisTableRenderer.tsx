import * as React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import rehypeRaw from 'rehype-raw'

interface AnalysisTableRendererProps {
  content: string
}

export function AnalysisTableRenderer({ content }: AnalysisTableRendererProps) {
  // Enhanced text preprocessing to ensure proper markdown table format
  const preprocessContent = (text: string): string => {
    if (!text) return text
    
    let processedText = text
    
    // Remove any stray table separators
    processedText = processedText.replace(/^\|[\s\-]*\|[\s\-]*$/gm, '')
    processedText = processedText.replace(/^[\-\s]+$/gm, '')
    
    // Ensure proper table spacing
    processedText = processedText.replace(/(\|[^|\n]*\|)\n(?!\|)/g, '$1\n\n')
    
    // Clean up multiple newlines
    processedText = processedText.replace(/\n{3,}/g, '\n\n')
    
    return processedText.trim()
  }

  // Custom components for professional table rendering
  const components = {
    table: ({ children, ...props }: any) => (
      <div className="my-6 overflow-hidden rounded-lg border border-gray-200 shadow-lg">
        <div className="overflow-x-auto" role="region" tabIndex={0} aria-label="Financial data table">
          <table 
            className="min-w-full divide-y divide-gray-300 border-collapse"
            role="table"
            {...props}
          >
            {children}
          </table>
        </div>
      </div>
    ),
    
    thead: ({ children, ...props }: any) => (
      <thead 
        className="bg-gradient-to-r from-slate-50 to-slate-100"
        role="rowgroup"
        {...props}
      >
        {children}
      </thead>
    ),
    
    tbody: ({ children, ...props }: any) => (
      <tbody 
        className="divide-y divide-gray-200 bg-white"
        role="rowgroup"
        {...props}
      >
        {children}
      </tbody>
    ),
    
    tr: ({ children, ...props }: any) => (
      <tr 
        className="hover:bg-gray-50 transition-colors duration-150"
        role="row"
        {...props}
      >
        {children}
      </tr>
    ),
    
    th: ({ children, ...props }: any) => (
      <th
        className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-300 bg-gradient-to-b from-gray-50 to-gray-100"
        scope="col"
        role="columnheader"
        {...props}
      >
        {children}
      </th>
    ),
    
    td: ({ children, ...props }: any) => {
      const cellContent = String(children || '')
      
      // Format financial numbers
      const formatCellContent = (content: string) => {
        // Check if it's a percentage
        if (content.includes('%')) {
          const isPositive = !content.includes('-')
          return (
            <span className={`font-medium ${isPositive ? 'text-green-700' : 'text-red-700'}`}>
              {content}
            </span>
          )
        }
        
        // Check if it's a monetary value
        if (content.includes('$') || content.includes('€') || content.includes('£')) {
          return (
            <span className="font-mono text-gray-900">
              {content}
            </span>
          )
        }
        
        // Check if it's a ratio or decimal
        if (/^\d+\.?\d*$/.test(content.trim())) {
          return (
            <span className="font-mono text-gray-800">
              {content}
            </span>
          )
        }
        
        return content
      }

      return (
        <td
          className="px-6 py-4 text-sm text-gray-700 border-b border-gray-100 whitespace-nowrap"
          role="cell"
          {...props}
        >
          {formatCellContent(cellContent)}
        </td>
      )
    },
    
    // Enhanced bullet points
    ul: ({ children, ...props }: any) => (
      <ul className="space-y-2 my-4" {...props}>
        {children}
      </ul>
    ),
    
    li: ({ children, ...props }: any) => (
      <li className="flex items-start" {...props}>
        <span className="inline-block w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
        <span className="text-gray-700 leading-relaxed">{children}</span>
      </li>
    ),
    
    // Enhanced headers
    h1: ({ children, ...props }: any) => (
      <h1 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-blue-600 pb-2" {...props}>
        {children}
      </h1>
    ),
    
    h2: ({ children, ...props }: any) => (
      <h2 className="text-xl font-semibold text-gray-800 mb-3 mt-6 border-b border-gray-300 pb-2" {...props}>
        {children}
      </h2>
    ),
    
    h3: ({ children, ...props }: any) => (
      <h3 className="text-lg font-medium text-gray-800 mb-2 mt-4" {...props}>
        {children}
      </h3>
    ),
    
    // Enhanced paragraphs
    p: ({ children, ...props }: any) => (
      <p className="text-gray-700 leading-relaxed mb-3" {...props}>
        {children}
      </p>
    ),
    
    // Code blocks for any technical content
    code: ({ children, ...props }: any) => (
      <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-800" {...props}>
        {children}
      </code>
    ),
    
    pre: ({ children, ...props }: any) => (
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono" {...props}>
        {children}
      </pre>
    )
  }

  const processedContent = preprocessContent(content)

  return (
    <div className="prose prose-gray max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize, rehypeRaw]}
        components={components}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}
