import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

interface ParameterObject {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required?: boolean;
  schema?: Record<string, any>;
}

interface RequestBodyObject {
  description?: string;
  required?: boolean;
  content?: Record<string, { schema?: Record<string, any> }>;
}

interface ResponseObject {
  description?: string;
  content?: Record<string, { schema?: Record<string, any> }>;
}

interface OperationObject {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: ParameterObject[];
  requestBody?: RequestBodyObject;
  responses?: Record<string, ResponseObject>;
}

interface ApiToolsProps {
  specUrl?: string;
}

function getOperation(spec: Record<string, any>, path: string, method: string): OperationObject | undefined {
  const pathItem = spec?.paths?.[path];
  if (!pathItem) return undefined;
  return pathItem[method.toLowerCase()] as OperationObject | undefined;
}

export default function ApiTools({ specUrl }: ApiToolsProps) {
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<string>('get');

  const { data: spec, isLoading } = useQuery<Record<string, any>>({
    queryKey: ['openapi-spec', specUrl],
    queryFn: async () => {
      const res = await api.get(specUrl ?? '/openapi.json');
      return res.data;
    },
    enabled: Boolean(specUrl),
  });

  const paths = useMemo(() => {
    if (!spec?.paths) return [] as string[];
    return Object.keys(spec.paths);
  }, [spec]);

  const methods = useMemo(() => {
    if (!spec?.paths || !selectedPath) return [] as string[];
    return Object.keys(spec.paths[selectedPath] ?? {});
  }, [spec, selectedPath]);

  const operation = useMemo<OperationObject | undefined>(() => {
    if (!spec || !selectedPath) return undefined;
    return getOperation(spec, selectedPath, selectedMethod);
  }, [spec, selectedPath, selectedMethod]);

  if (isLoading) {
    return <div className="p-4 text-sm text-gray-500">Loading API spec…</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold">API Tools</h2>

      <div className="flex gap-2">
        <select
          className="border rounded px-2 py-1 text-sm"
          value={selectedPath}
          onChange={(e) => {
            setSelectedPath(e.target.value);
            setSelectedMethod('get');
          }}
        >
          <option value="">Select a path…</option>
          {paths.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <select
          className="border rounded px-2 py-1 text-sm"
          value={selectedMethod}
          onChange={(e) => setSelectedMethod(e.target.value)}
          disabled={!selectedPath}
        >
          {methods.map((m) => (
            <option key={m} value={m}>
              {m.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      {operation && (
        <div className="border rounded p-3 space-y-2 text-sm">
          {operation.summary && <p className="font-medium">{operation.summary}</p>}
          {operation.description && <p className="text-gray-600">{operation.description}</p>}

          {operation.parameters && operation.parameters.length > 0 && (
            <div>
              <h3 className="font-medium">Parameters</h3>
              <ul className="list-disc list-inside">
                {operation.parameters.map((param) => (
                  <li key={`${param.in}-${param.name}`}>
                    <span className="font-mono">{param.name}</span> ({param.in})
                    {param.required ? ' — required' : ''}
                    {param.description ? ` — ${param.description}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {operation.requestBody && (
            <div>
              <h3 className="font-medium">Request Body</h3>
              <p className="text-gray-600">
                {operation.requestBody.description ?? 'No description'}
              </p>
            </div>
          )}

          {operation.responses && (
            <div>
              <h3 className="font-medium">Responses</h3>
              <ul className="list-disc list-inside">
                {Object.entries(operation.responses).map(([code, resp]) => (
                  <li key={code}>
                    <span className="font-mono">{code}</span>
                    {resp.description ? ` — ${resp.description}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
