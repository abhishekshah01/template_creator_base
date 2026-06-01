import { useEffect, useState } from 'react';

import AwsAlert2 from './AwsAlert2';
import {
  AwsButton,
  CopyIcon as AwsCopyIcon,
  DownloadIcon,
  OpenExternalIcon,
} from './AwsControls';
import { s3api } from './api';
import { bytesToHuman, formatAwsDate, fileExt } from './format';
import { colors } from './theme';

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
    try {
      await navigator.clipboard.writeText(text);
      onCopyToast?.('Copied');
    } catch {
      onCopyToast?.('Copy failed');
    }
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
      <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
        <h1 className="text-[24px] font-bold break-all" style={{ color: colors.text.primary }}>
          {name}{' '}
          <span className="text-[14px] font-normal underline decoration-dotted underline-offset-2 cursor-help" style={{ color: colors.text.buttonActive }}>
            Info
          </span>
        </h1>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <AwsButton icon={<AwsCopyIcon />} onClick={() => meta && copy(meta.s3_uri)}>Copy S3 URI</AwsButton>
          <AwsButton icon={<DownloadIcon />} onClick={() => openIn(true)}>Download</AwsButton>
          <AwsButton rightIcon={<OpenExternalIcon />} onClick={() => openIn(false)}>Open</AwsButton>
          <AwsButton disabled>Object actions ▾</AwsButton>
        </div>
      </div>

      <div className="mb-6 flex gap-6" style={{ borderBottom: `2px solid ${colors.border.rowSeparator}` }}>
        <SectionTab active>Properties</SectionTab>
      </div>

      {err && (
        <div className="mb-4">
          <AwsAlert2
            variant="error"
            title="Couldn't load object details"
            onDismiss={() => setErr(null)}
          >
            {err}
          </AwsAlert2>
        </div>
      )}

      <div
        className="rounded-[8px] p-6 mb-6"
        style={{
          backgroundColor: colors.bg.card,
          border: `2px solid ${colors.border.cardOutline}`,
        }}
      >
        <h2 className="text-[18px] font-bold mb-5" style={{ color: colors.text.primary }}>Object overview</h2>

        {loading && (
          <div className="text-[14px]" style={{ color: colors.text.info }}>Loading…</div>
        )}

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
      <div className="text-[14px] font-bold mb-1" style={{ color: colors.text.primary }}>{label}</div>
      <div className="text-[14px]" style={{ color: colors.text.selectedRow }}>{children}</div>
    </div>
  );
}

function CopyableMono({ value, onCopy }) {
  return (
    <div className="flex items-start gap-1.5">
      <button onClick={onCopy} className="shrink-0 mt-0.5 hover:opacity-80" style={{ color: colors.text.buttonActive }} title="Copy">
        <AwsCopyIcon />
      </button>
      <span className="font-mono text-[13px] break-all" style={{ color: colors.text.selectedRow }}>{value}</span>
    </div>
  );
}

function CopyableLink({ value, onCopy }) {
  return (
    <div className="flex items-start gap-1.5">
      <button onClick={onCopy} className="shrink-0 mt-0.5 hover:opacity-80" style={{ color: colors.text.buttonActive }} title="Copy">
        <AwsCopyIcon />
      </button>
      <a href={value} target="_blank" rel="noreferrer" className="underline break-all text-[13px]" style={{ color: colors.text.buttonActive }}>
        {value}
      </a>
    </div>
  );
}

function SectionTab({ active, children }) {
  return (
    <button
      className="relative py-2 text-[15px] font-semibold"
      style={{ color: active ? colors.text.buttonActive : colors.text.info }}
    >
      {children}
      {active && (
        <span
          aria-hidden="true"
          className="absolute left-0 right-0"
          style={{
            height: 3,
            bottom: -2,
            backgroundColor: colors.text.buttonActive,
            zIndex: 2,
          }}
        />
      )}
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
