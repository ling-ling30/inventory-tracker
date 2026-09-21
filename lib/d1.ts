interface D1Response<T> {
  result: Array<{
    results: T[];
    success: boolean;
    meta?: any;
  }>;
  success: boolean;
  errors: any[];
  messages: any[];
}

export async function queryD1<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !databaseId || !apiToken) {
    throw new Error('Missing Cloudflare D1 environment variables: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, or CLOUDFLARE_API_TOKEN');
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql, params }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`D1 API HTTP Error ${res.status}: ${text}`);
  }

  const data: D1Response<T> = await res.json();
  if (!data.success) {
    throw new Error(`D1 Query Error: ${JSON.stringify(data.errors)}`);
  }

  return data.result?.[0]?.results || [];
}

export async function executeD1(sql: string, params: any[] = []): Promise<{ success: boolean; changes?: number }> {
  const results = await queryD1(sql, params);
  return { success: true };
}
