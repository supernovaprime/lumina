import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TestApi() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/services');
        if (!response.ok) {
          throw new Error('Failed to fetch services');
        }
        const data = await response.json();
        setData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="p-4 bg-gray-100">
      <h2 className="text-lg font-bold mb-4">API Test</h2>
      <p className="mb-2">Status: {loading ? 'Loading' : 'Loaded'}</p>
      {error && <p className="text-red-500">Error: {error}</p>}
      {data && (
        <div className="mt-4">
          <h3 className="text-lg font-bold">API Response:</h2>
          <pre className="whitespace-pre-whitespace bg-gray-100 p-4 rounded">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}