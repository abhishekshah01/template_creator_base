import { useEffect, useState } from 'react';
import { s3api } from './api';
import { bytesToHuman, formatAwsDate, fileExt } from './format';
import { SecondaryBtn, CopyIcon, InfoIcon } from './BucketList';

export default function ObjectDetail({ bucket, objKey, onCopyToast }) {
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    s3api.objectMeta(bucket, objKey).then(d => {
      if (alive) { setMeta(d); setLoading(false); }
    }).catch(e => {
      if (alive) { setErr(e.message); setLoading(false); }
    });
    return () => { alive = false; };
  }, [bucket, objKey]);

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); onCopyToast?.('Copied'); } catch { onCopyToast?.('Copy failed'); }
  }
  async function openIn(download) {
    try {
      const { url } = await s3api.objectUrl(bucket, objKey, download);
      window.open(url, '_blank', 'noopener');
    } catch (e) { setErr(e.message); }
  }

  const name = objKey.split('/').pop();

  return (
    <div>
      <div className="flex items-start justify-between mb-4 gap-4">
        <h1 style={{ fontSize: 28, lineHeight: '36px' }} className="font-bold text-[#ffffff] break-all">
          {name} <InfoIcon />
        </h1>
        <div className="flex items-center gap-2 shrink-0">
          <SecondaryBtn icon={<CopyIcon />} onClick={() => meta && copy(meta.s3_uri)}>Copy S3 URI</SecondaryBtn>
          <SecondaryBtn onClick={() => openIn(true)}>Download</SecondaryBtn>
          <SecondaryBtn onClick={() => openIn(false)}>Open ↗</SecondaryBtn>
          <SecondaryBtn>Object actions ▾</SecondaryBtn>
        </div>
      </div>

      <div className="border-b border-[#3c4451] mb-6 flex gap-6">
        <Tab active>Properties</Tab>
      </div>

      <div className="border border-[#3c4451] rounded-md bg-[#1a212d] p-6 mb-6">
        <h2 className="text-[18px] font-bold text-[#ffffff] mb-5">Object overview</h2>

        {loading && <div className="text-[14px] text-[#8b949e]">Loading…</div>}
        {err && <div className="text-[14px] text-[#f85149]">{err}</div>}

        {meta && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-12">
            <Field label="Owner">
              <span className="font-mono text-[13px] break-all">{meta.metadata?.owner || '—'}</span>
            </Field>
            <Field label="S3 URI">
              <CopyableMono value={meta.s3_uri} onCopy={() => copy(meta.s3_uri)} />
            </Field>
            <Field label="AWS Region">
              <span>{regionLabel(meta.region)}</span>
            </Field>
            <Field label="Amazon Resource Name (ARN)">
              <CopyableMono value={meta.arn} onCopy={() => copy(meta.arn)} />
            </Field>
            <Field label="Last modified">
              <span>{formatAwsDate(meta.last_modified)}</span>
            </Field>
            <Field label="Entity tag (Etag)">
              <CopyableMono value={meta.etag} onCopy={() => copy(meta.etag)} />
            </Field>
            <Field label="Size">
              <span>{bytesToHuman(meta.size)}</span>
            </Field>
            <Field label="Object URL">
              <CopyableLink value={meta.object_url} onCopy={() => copy(meta.object_url)} />
            </Field>
            <Field label="Type">
              <span>{fileExt(objKey) || meta.content_type || '—'}</span>
            </Field>
            <Field label="Key">
              <CopyableMono value={meta.key} onCopy={() => copy(meta.key)} />
            </Field>
          </div>
        )}
      </div>

    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-[14px] font-bold text-[#ffffff] mb-1">{label}</div>
      <div className="text-[14px] text-[#d4d8db]">{children}</div>
    </div>
  );
}

function CopyableMono({ value, onCopy }) {
  return (
    <div className="flex items-start gap-1.5">
      <button onClick={onCopy} className="shrink-0 mt-0.5 text-[#88c4ff] hover:opacity-80" title="Copy">
        <CopyIcon />
      </button>
      <span className="font-mono text-[13px] text-[#d4d8db] break-all">{value}</span>
    </div>
  );
}

function CopyableLink({ value, onCopy }) {
  return (
    <div className="flex items-start gap-1.5">
      <button onClick={onCopy} className="shrink-0 mt-0.5 text-[#88c4ff] hover:opacity-80" title="Copy">
        <CopyIcon />
      </button>
      <a href={value} target="_blank" rel="noreferrer" className="text-[#88c4ff] hover:underline break-all text-[13px]">{value}</a>
    </div>
  );
}

function Tab({ active, children }) {
  return (
    <button className={`relative py-2 text-[15px] font-semibold ${active ? 'text-[#88c4ff]' : 'text-[#d4d8db] hover:text-[#ffffff]'}`}>
      {children}
      {active && <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-[#88c4ff]" />}
    </button>
  );
}

function regionLabel(code) {
  const map = {
    'us-east-1': 'US East (N. Virginia) us-east-1',
    'us-east-2': 'US East (Ohio) us-east-2',
    'us-west-1': 'US West (N. California) us-west-1',
    'us-west-2': 'US West (Oregon) us-west-2',
    'eu-west-1': 'Europe (Ireland) eu-west-1',
    'eu-central-1': 'Europe (Frankfurt) eu-central-1',
    'ap-south-1': 'Asia Pacific (Mumbai) ap-south-1',
  };
  return map[code] || code;
}
