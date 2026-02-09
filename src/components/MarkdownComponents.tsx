// src/components/markdownComponents.tsx
import React from 'react';

export const MarkdownComponents = {
  h1: ({ children }: React.PropsWithChildren) => (
    <h1 className="text-3xl font-bold mt-6 mb-6">{children}</h1>
  ),
  h2: ({ children }: React.PropsWithChildren) => (
    <h2 className="text-2xl font-semibold mt-6 mb-5">{children}</h2>
  ),
  h3: ({ children }: React.PropsWithChildren) => (
    <h3 className="text-xl font-semibold mt-5 mb-4">{children}</h3>
  ),
  h4: ({ children }: React.PropsWithChildren) => (
    <h4 className="text-lg font-semibold mt-4 mb-3">{children}</h4>
  ),
  h5: ({ children }: React.PropsWithChildren) => (
    <h5 className="text-lg font-semibold mt-3 mb-3">{children}</h5>
  ),
  h6: ({ children }: React.PropsWithChildren) => (
    <h6 className="text-lg font-semibold mt-3 mb-3">{children}</h6>
  ),
  p: ({ children }: React.PropsWithChildren ) => (
    <p className="mt-3 mb-3">{children}</p>
  ),
  code: ({ children }: React.PropsWithChildren) => (
    <code className="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-1 rounded text-sm">{children}</code>
  ),
  pre: ({ children }: React.PropsWithChildren) => (
    <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap my-4">
      <code>{children}</code>
    </pre>
  ),
  table: ({ children }: React.PropsWithChildren) => (
    <table className="w-full border-collapse border border-gray-600 dark:border-gray-300 mt-6 mb-6">
      {children}
    </table>
  ),
  thead: ({ children }: React.PropsWithChildren) => (
    <thead className="bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-white">
      {children}
    </thead>
  ),
  tbody: ({ children }: React.PropsWithChildren) => (
    <tbody className="bg-gray-100 dark:bg-gray-900 border-gray-900 dark:border-gray-300 border-t">
      {children}
    </tbody>
  ),
  tr: ({ children }: React.PropsWithChildren) => (
    <tr className="border-gray-900 dark:border-gray-300 border-b last:border-b-0">
      {children}
    </tr>
  ),
  th: ({ children }: React.PropsWithChildren) => (
    <th className="p-3 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }: React.PropsWithChildren) => (
    <td className="p-3 border-l border-gray-900 dark:border-gray-300 first:border-l-0">
      {children}
    </td>
  ),
  ol: ({ children }: React.PropsWithChildren) => (
    <ol className="list-decimal ml-4">{children}</ol>
  ),
  ul: ({ children }: React.PropsWithChildren) => (
    <ul className="list-disc ml-4">{children}</ul>
  ),
  a: ({ href, children }: React.PropsWithChildren<{ href?: string }>) => (
    <a href={href} target="_blank" className="text-blue-700 dark:text-blue-300 hover:underline">
      {children}
    </a>
  ),
  blockquote: ({ children }: React.PropsWithChildren) => (
    <blockquote className="border-l-4 border-gray-300 pl-6 italic bg-gray-100 dark:bg-gray-900 my-4 py-2">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="divide-solid mt-6 mb-6" />,
};