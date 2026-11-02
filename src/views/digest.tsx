import type { Digest, DigestRow } from '../digest/types.js';

const dash = '—';

function flags(r: DigestRow): string[] {
  const f: string[] = [];
  if (r.lastStatus === 'fail') f.push('FAIL');
  if (r.retries >= 3) f.push('RETRIES');
  return f;
}

export function DigestPage({ digest }: { digest: Digest }) {
  return (
    <>
      <h1>digest {digest.night}</h1>
      {digest.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th><th>owner</th><th>runs</th><th>retries</th><th>last status</th>
              <th>last error</th><th>first</th><th>last</th>
            </tr>
          </thead>
          <tbody>
            {digest.rows.map((r) => {
              const f = flags(r);
              return (
                <tr class={f.length > 0 ? 'warn' : undefined}>
                  <td>{r.job}{f.length > 0 ? <strong> [{f.join(' ')}]</strong> : null}</td>
                  <td>{r.owner ?? dash}</td>
                  <td>{r.runs}</td>
                  <td>{r.retries}</td>
                  <td>{r.lastStatus}</td>
                  <td>{r.lastError ?? dash}</td>
                  <td>{r.first}</td>
                  <td>{r.last}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {digest.badLines > 0 ? <p class="mute">{digest.badLines} unparsed line(s) skipped</p> : null}
    </>
  );
}
