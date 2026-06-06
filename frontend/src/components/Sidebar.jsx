import { useState, useEffect } from 'react';

// --- GitHub Octicons (16px filled) ---
function FilePlusIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011ZM8 8.75a.75.75 0 0 1 .75.75v1.25h1.25a.75.75 0 0 1 0 1.5H8.75v1.25a.75.75 0 0 1-1.5 0V12.25H6a.75.75 0 0 1 0-1.5h1.25V9.5A.75.75 0 0 1 8 8.75Z" />
    </svg>
  );
}
function StackIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M7.122.392a1.75 1.75 0 0 1 1.756 0l5.003 2.902c.83.481.83 1.69 0 2.171L8.878 8.378a1.755 1.755 0 0 1-1.756 0L2.119 5.465a1.255 1.255 0 0 1 0-2.171ZM8.125 1.689a.25.25 0 0 0-.25 0l-4.63 2.685 4.63 2.685a.25.25 0 0 0 .25 0l4.63-2.685ZM1.601 7.789a.75.75 0 0 1 1.025-.273l5.249 3.044a.25.25 0 0 0 .25 0l5.249-3.044a.75.75 0 0 1 .752 1.298l-5.248 3.044a1.75 1.75 0 0 1-1.756 0L1.874 8.814A.75.75 0 0 1 1.6 7.789Zm0 3.5a.75.75 0 0 1 1.025-.273l5.249 3.044a.25.25 0 0 0 .25 0l5.249-3.044a.75.75 0 0 1 .752 1.298l-5.248 3.044a1.75 1.75 0 0 1-1.756 0l-5.248-3.044a.75.75 0 0 1-.273-1.025Z" />
    </svg>
  );
}
function RowsIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M0 3.75C0 2.784.784 2 1.75 2h12.5c.966 0 1.75.784 1.75 1.75v8.5A1.75 1.75 0 0 1 14.25 14H1.75A1.75 1.75 0 0 1 0 12.25Zm1.75-.25a.25.25 0 0 0-.25.25V6h13V3.75a.25.25 0 0 0-.25-.25Zm-.25 4v1h13V7.5Zm0 4.75c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V10h-13Z" />
    </svg>
  );
}
function PlusIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z" />
    </svg>
  );
}
function SparklesIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <g transform="translate(10 5.5) scale(0.6) translate(-8 -8)">
        <path d="M7.53 1.282a.5.5 0 0 1 .94 0l.478 1.306a7.492 7.492 0 0 0 4.464 4.464l1.305.478a.5.5 0 0 1 0 .94l-1.305.478a7.492 7.492 0 0 0-4.464 4.464l-.478 1.305a.5.5 0 0 1-.94 0l-.478-1.305a7.492 7.492 0 0 0-4.464-4.464L1.282 8.47a.5.5 0 0 1 0-.94l1.306-.478a7.492 7.492 0 0 0 4.464-4.464Z" />
      </g>
      <g transform="translate(3.75 12) scale(0.32) translate(-8 -8)">
        <path d="M7.53 1.282a.5.5 0 0 1 .94 0l.478 1.306a7.492 7.492 0 0 0 4.464 4.464l1.305.478a.5.5 0 0 1 0 .94l-1.305.478a7.492 7.492 0 0 0-4.464 4.464l-.478 1.305a.5.5 0 0 1-.94 0l-.478-1.305a7.492 7.492 0 0 0-4.464-4.464L1.282 8.47a.5.5 0 0 1 0-.94l1.306-.478a7.492 7.492 0 0 0 4.464-4.464Z" />
      </g>
    </svg>
  );
}
function FileIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z" />
    </svg>
  );
}
function KeyIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M10.5 0a5.499 5.499 0 1 1-1.288 10.848l-1.02 1.02a.749.749 0 0 1-.53.22H7v.75a.749.749 0 0 1-.22.53l-.5.5a.749.749 0 0 1-.53.22H5v.75a.749.749 0 0 1-.22.53l-1 1a.749.749 0 0 1-.53.22h-2A.75.75 0 0 1 .5 15.5v-2c0-.199.079-.389.22-.53l5.33-5.33A5.5 5.5 0 0 1 10.5 0ZM9 5.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0Z" />
    </svg>
  );
}
function ChevronIcon({ className, open }) {
  return (
    <svg className={`${className} transition-transform duration-150 ${open ? '' : '-rotate-90'}`}
      viewBox="0 0 16 16" fill="currentColor">
      <path d="M12.78 5.22a.749.749 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.06 0L3.22 6.28a.749.749 0 1 1 1.06-1.06L8 8.939l3.72-3.719a.749.749 0 0 1 1.06 0Z" />
    </svg>
  );
}

function BookIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M0 1.75A.75.75 0 0 1 .75 1h4.253c1.227 0 2.317.59 3 1.501A3.743 3.743 0 0 1 11.006 1h4.245a.75.75 0 0 1 .75.75v10.5a.75.75 0 0 1-.75.75h-4.507a2.25 2.25 0 0 0-1.591.659l-.622.621a.75.75 0 0 1-1.06 0l-.622-.621A2.25 2.25 0 0 0 5.258 13H.75a.75.75 0 0 1-.75-.75Zm7.251 10.324.004-5.073-.002-2.253A2.25 2.25 0 0 0 5.003 2.5H1.5v9h3.757a3.75 3.75 0 0 1 1.994.574ZM8.755 4.75l-.004 7.322a3.752 3.752 0 0 1 1.992-.572H14.5v-9h-3.495a2.25 2.25 0 0 0-2.25 2.25Z" />
    </svg>
  );
}
function RocketIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M14.064 0h.186C15.216 0 16 .784 16 1.75v.186a8.752 8.752 0 0 1-2.564 6.186l-.458.459c-.314.314-.641.616-.979.904v3.207c0 .608-.315 1.172-.833 1.49l-2.774 1.707a.749.749 0 0 1-1.11-.418l-.954-3.102a1.214 1.214 0 0 1-.145-.125L3.754 9.816a1.218 1.218 0 0 1-.124-.145L.528 8.717a.749.749 0 0 1-.418-1.11l1.71-2.774A1.748 1.748 0 0 1 3.31 4h3.204c.288-.338.59-.665.904-.979l.459-.458A8.749 8.749 0 0 1 14.064 0ZM8.938 3.623h-.002l-.458.458c-.76.76-1.437 1.598-2.02 2.5l-1.5 2.317 2.143 2.143 2.317-1.5c.902-.583 1.74-1.26 2.499-2.02l.459-.458a7.25 7.25 0 0 0 2.123-5.127V1.75a.25.25 0 0 0-.25-.25h-.186a7.249 7.249 0 0 0-5.125 2.123ZM3.56 14.56c-.732.732-2.334 1.045-3.005 1.148a.234.234 0 0 1-.201-.064.234.234 0 0 1-.064-.201c.103-.671.416-2.273 1.15-3.003a1.502 1.502 0 1 1 2.12 2.12Zm6.94-3.935c-.088.06-.177.118-.266.175l-2.35 1.521.548 1.783 1.949-1.2a.25.25 0 0 0 .119-.213ZM3.678 8.116 5.2 5.766c.058-.09.117-.178.176-.266H3.309a.25.25 0 0 0-.213.119l-1.2 1.95ZM12 5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
    </svg>
  );
}
function InfoIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
    </svg>
  );
}
function ZapIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M9.504.43a1.516 1.516 0 0 1 2.437 1.713L10.415 5.5h2.123c1.57 0 2.346 1.909 1.22 3.004l-7.34 7.142a1.249 1.249 0 0 1-.871.354h-.302a1.25 1.25 0 0 1-1.157-1.723L5.633 10.5H3.462c-1.57 0-2.346-1.909-1.22-3.004L9.503.429Zm1.047 1.074L3.286 8.571A.25.25 0 0 0 3.462 9H6.75a.75.75 0 0 1 .694 1.034l-1.713 4.188 6.982-6.793A.25.25 0 0 0 12.538 7H9.25a.75.75 0 0 1-.683-1.06l2.008-4.418.003-.006a.036.036 0 0 0-.004-.009l-.006-.006-.008-.001c-.003 0-.006.002-.009.004Z" />
    </svg>
  );
}
function ToolsIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M5.433 2.304A4.492 4.492 0 0 0 3.5 6c0 1.598.832 3.002 2.09 3.802.518.328.81.92.81 1.534V14a1.5 1.5 0 0 0 3 0v-2.664c0-.615.292-1.206.81-1.534A4.498 4.498 0 0 0 12.5 6a4.491 4.491 0 0 0-1.348-3.215l-.768.768c.418.51.66 1.166.616 1.876C10.92 6.96 9.387 8.469 7.5 8.469 5.532 8.469 4 6.96 4 5.429c0-.768.292-1.464.768-1.972ZM8 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
    </svg>
  );
}
function ShieldCheckIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M7.467.133a1.748 1.748 0 0 1 1.066 0l5.25 1.68A1.75 1.75 0 0 1 15 3.48V7c0 1.566-.32 3.182-1.303 4.682-.983 1.498-2.585 2.813-5.032 3.855a1.697 1.697 0 0 1-1.33 0c-2.447-1.042-4.049-2.357-5.032-3.855C1.32 10.182 1 8.566 1 7V3.48a1.75 1.75 0 0 1 1.217-1.667Zm.61 1.429a.25.25 0 0 0-.153 0l-5.25 1.68a.25.25 0 0 0-.174.238V7c0 1.358.275 2.666 1.057 3.86.784 1.194 2.121 2.34 4.366 3.297a.196.196 0 0 0 .154 0c2.245-.957 3.582-2.103 4.366-3.297C13.225 9.666 13.5 8.358 13.5 7V3.48a.25.25 0 0 0-.174-.237l-5.25-1.68ZM10.78 5.97a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.97 8.78a.75.75 0 1 1 1.06-1.06L7 8.69l2.72-2.72a.75.75 0 0 1 1.06 0Z" />
    </svg>
  );
}
function HelpIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.92 6.085c.081-.16.19-.299.34-.398.145-.097.371-.187.74-.187.28 0 .553.087.738.225A.613.613 0 0 1 9 6.25c0 .177-.04.264-.077.318a.956.956 0 0 1-.277.245c-.076.051-.158.1-.258.161l-.007.004a7.728 7.728 0 0 0-.313.195 2.416 2.416 0 0 0-.692.661.75.75 0 0 0 1.248.832.956.956 0 0 1 .276-.245 6.3 6.3 0 0 1 .26-.16l.006-.004c.093-.057.204-.123.313-.195.222-.149.487-.355.692-.662.214-.32.329-.702.329-1.15 0-.76-.36-1.348-.863-1.725A2.76 2.76 0 0 0 8 4c-.631 0-1.155.16-1.572.438-.413.276-.68.638-.849.977a.75.75 0 1 0 1.342.67ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
    </svg>
  );
}
function SettingsIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0a8.2 8.2 0 0 1 .701.031C9.444.095 9.99.645 10.16 1.29l.288 1.107c.018.066.079.158.212.224.231.114.454.243.668.386.123.082.233.09.299.071l1.103-.303c.644-.176 1.392.021 1.82.63.27.385.506.792.704 1.218.315.675.111 1.422-.364 1.891l-.814.806c-.049.048-.098.147-.088.294a6.084 6.084 0 0 1 0 .772c-.01.147.04.246.088.294l.814.806c.475.469.679 1.216.364 1.891a7.948 7.948 0 0 1-.704 1.217c-.428.61-1.176.807-1.82.63l-1.103-.303c-.066-.019-.176-.011-.299.071a5.909 5.909 0 0 1-.668.386c-.133.066-.194.158-.212.224l-.288 1.107c-.17.645-.716 1.195-1.459 1.26a8.006 8.006 0 0 1-1.402 0c-.743-.065-1.289-.615-1.459-1.26l-.288-1.107a.352.352 0 0 0-.212-.224 5.738 5.738 0 0 1-.668-.386c-.123-.082-.233-.09-.299-.071l-1.103.303c-.644.176-1.392-.021-1.82-.63a8.12 8.12 0 0 1-.704-1.218c-.315-.675-.111-1.422.363-1.891l.815-.806c.049-.048.098-.147.088-.294a6.214 6.214 0 0 1 0-.772c.01-.147-.04-.246-.088-.294l-.815-.806C.635 6.045.431 5.298.746 4.623a7.92 7.92 0 0 1 .704-1.217c.428-.61 1.176-.807 1.82-.63l1.103.303c.066.019.176.011.299-.071.214-.143.437-.272.668-.386a.352.352 0 0 0 .212-.224l.288-1.107C5.9.645 6.446.095 7.189.031 7.898 8 0Zm1.474 1.346a.52.52 0 0 0-.486-.346 6.517 6.517 0 0 0-.976 0 .52.52 0 0 0-.486.346l-.288 1.107a1.856 1.856 0 0 1-1.103 1.196 4.279 4.279 0 0 0-.497.287 1.856 1.856 0 0 1-1.592.18l-1.103-.303a.52.52 0 0 0-.566.197 6.434 6.434 0 0 0-.523.905.52.52 0 0 0 .08.543l.814.806c.36.357.548.886.521 1.453a4.568 4.568 0 0 0 0 .575c.027.567-.161 1.096-.521 1.453l-.814.806a.52.52 0 0 0-.08.543c.133.32.286.628.523.905a.52.52 0 0 0 .566.197l1.103-.303a1.856 1.856 0 0 1 1.592.18c.16.107.328.2.497.287a1.856 1.856 0 0 1 1.103 1.196l.288 1.107a.52.52 0 0 0 .486.346 6.517 6.517 0 0 0 .976 0 .52.52 0 0 0 .486-.346l.288-1.107a1.856 1.856 0 0 1 1.103-1.196c.17-.087.337-.18.497-.287a1.856 1.856 0 0 1 1.592-.18l1.103.303a.52.52 0 0 0 .566-.197c.237-.277.39-.585.523-.905a.52.52 0 0 0-.08-.543l-.814-.806a1.856 1.856 0 0 1-.521-1.453 4.568 4.568 0 0 0 0-.575c.027-.567.161-1.096.521-1.453l.814-.806a.52.52 0 0 0 .08-.543 6.434 6.434 0 0 0-.523-.905.52.52 0 0 0-.566-.197l-1.103.303a1.856 1.856 0 0 1-1.592-.18 4.318 4.318 0 0 0-.497-.287 1.856 1.856 0 0 1-1.103-1.196ZM8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
    </svg>
  );
}

// Asset Management (section header) — package / box icon
function PackageIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M8.878.392a1.75 1.75 0 0 0-1.756 0L2.617 3.04A1.75 1.75 0 0 0 1.75 4.557v6.886a1.75 1.75 0 0 0 .867 1.517l4.505 2.647a1.75 1.75 0 0 0 1.756 0l4.505-2.647a1.75 1.75 0 0 0 .867-1.517V4.557a1.75 1.75 0 0 0-.867-1.517L8.878.392ZM3.376 4.336a.25.25 0 0 1-.001-.432l4.5-2.643a.25.25 0 0 1 .25 0l4.5 2.643a.25.25 0 0 1-.001.432L8.252 6.91a.5.5 0 0 1-.504 0L3.376 4.336ZM3.25 11.694V5.677l4.25 2.493v6.092l-4.122-2.422a.25.25 0 0 1-.128-.146Zm5.75 2.568V8.17l3.75-2.2v5.724a.25.25 0 0 1-.128.146L9 14.262Z" />
    </svg>
  );
}

// AWS S3 Navigate (item) — cylindrical bucket, AWS-style
function BucketIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <ellipse cx="8" cy="3" rx="5.5" ry="1.75" />
      <path d="M2.5 4.5v8c0 1 2.46 1.75 5.5 1.75s5.5-.75 5.5-1.75v-8c-1.05.99-3.36 1.5-5.5 1.5s-4.45-.51-5.5-1.5Zm5.5 4.25c1.66 0 3-.34 3-.75s-1.34-.75-3-.75-3 .34-3 .75 1.34.75 3 .75Z" />
    </svg>
  );
}

// CMS Portal (item) — atomic structure (nucleus + 3 orbital ellipses)
function CmsIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
    >
      <ellipse cx="8" cy="8" rx="6.8" ry="2.6" />
      <ellipse cx="8" cy="8" rx="6.8" ry="2.6" transform="rotate(60 8 8)" />
      <ellipse cx="8" cy="8" rx="6.8" ry="2.6" transform="rotate(120 8 8)" />
      <circle cx="8" cy="8" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

const navStructure = [
  {
    section: 'Getting Started',
    icon: BookIcon,
    collapsible: true,
    items: [
      { id: 'guide-start',    label: 'Start Guide',           icon: RocketIcon },
      { id: 'guide-token',    label: 'Setup API Token',       icon: KeyIcon },
      { id: 'guide-create',   label: 'Create a Template',     icon: FilePlusIcon },
      { id: 'guide-configs',  label: 'Category Configs',      icon: StackIcon },
      { id: 'guide-verify',   label: 'Verify a Template',     icon: ShieldCheckIcon },
      { id: 'guide-faq',      label: 'FAQ & Troubleshooting', icon: HelpIcon },
    ],
  },
  {
    section: 'Workflows',
    icon: ZapIcon,
    collapsible: true,
    items: [
      { id: 'create-template', label: 'Create Template', icon: FilePlusIcon },
    ],
  },
  {
    section: 'Category Config',
    icon: StackIcon,
    collapsible: true,
    items: [
      { id: 'config-all', label: 'All Configs', icon: RowsIcon },
      { id: 'config-create', label: 'Create Config', icon: PlusIcon },
      { id: 'config-summary', label: 'Generate Summary', icon: SparklesIcon },
    ],
  },
  {
    section: 'Asset Management',
    icon: PackageIcon,
    collapsible: true,
    items: [
      { id: 's3', label: 'AWS S3 Navigate', icon: BucketIcon },
      { id: 'cms-portal', label: 'CMS Portal', icon: CmsIcon },
    ],
  },
];

export default function Sidebar({ activePage, onNavigate, bearerToken, onTokenChange, width = 260, activeEnv, standardEnvs = [], onSwitchEnv, deploymentScope, ephemeralEnabled = true }) {
  const [collapsed, setCollapsed] = useState({});
  const [showEnvMenu, setShowEnvMenu] = useState(false);
  const [activeTab, setActiveTab] = useState('standard');
  const [ephInput, setEphInput] = useState('');
  const [ephHistory, setEphHistory] = useState([]);
  const [tokenOpen, setTokenOpen] = useState(false);
  const [showToken, setShowToken] = useState(false);

  // Reload history whenever dropdown opens; default tab based on active env
  useEffect(() => {
    if (showEnvMenu) {
      try { setEphHistory(JSON.parse(localStorage.getItem('eph_history') || '[]')); } catch {}
      setActiveTab(activeEnv?.startsWith('eph-') ? 'ephemeral' : 'standard');
    }
  }, [showEnvMenu]);

  function handleEphConnect(envName) {
    onSwitchEnv(envName);
    const history = JSON.parse(localStorage.getItem('eph_history') || '[]');
    const updated = [envName, ...history.filter(e => e !== envName)].slice(0, 5);
    localStorage.setItem('eph_history', JSON.stringify(updated));
    setEphHistory(updated);
    setShowEnvMenu(false);
    setEphInput('');
  }

  function toggleSection(section) {
    setCollapsed(prev => ({ ...prev, [section]: !prev[section] }));
  }

  function isSectionActive(group) {
    return group.items.some(item => item.id === activePage);
  }

  return (
    <aside className="bg-black border-r border-[#30363d] h-screen fixed top-0 left-0 flex flex-col" style={{ width }}>
      {/* Header */}
      <div className="px-4 pt-5 pb-4 border-b border-[#30363d]">
        <div className={deploymentScope === 'prod' ? '' : 'mb-3'}>
          <img src="/emergent-logo.svg" alt="Emergent" className="h-[14px] mb-1.5 opacity-60" />
          <h1 className="text-[16px] font-semibold text-[#e6edf3] leading-tight">Template Creator</h1>
        </div>
        {/* Environment switcher — only for dev (prod has nothing to switch) */}
        {deploymentScope !== 'prod' && (
          <div className="relative">
            <button onClick={() => setShowEnvMenu(!showEnvMenu)}
                data-testid="env-switcher-btn"
                className="flex items-center gap-2.5 w-full px-2 py-[7px] rounded-md text-[14px] font-medium text-[#e6edf3] bg-[#161b22] border border-[#30363d] hover:bg-[#1c2128] transition-colors outline-none">
                <svg className="w-[16px] h-[16px] shrink-0 text-[#e6edf3]" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M1.75 1h12.5c.966 0 1.75.784 1.75 1.75V5a1.75 1.75 0 0 1-1.75 1.75H1.75A1.75 1.75 0 0 1 0 5V2.75C0 1.784.784 1 1.75 1ZM1.5 2.75v2.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25v-2.5a.25.25 0 0 0-.25-.25H1.75a.25.25 0 0 0-.25.25ZM1.75 7h12.5c.966 0 1.75.784 1.75 1.75v2.5A1.75 1.75 0 0 1 14.25 13H1.75A1.75 1.75 0 0 1 0 11.25v-2.5C0 7.784.784 7 1.75 7Zm-.25 1.75v2.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25v-2.5a.25.25 0 0 0-.25-.25H1.75a.25.25 0 0 0-.25.25Z" />
                </svg>
                <span className="flex-1 text-left truncate">{activeEnv || 'select env'}</span>
                <svg className={`w-3.5 h-3.5 shrink-0 text-[#8b949e] transition-transform ${showEnvMenu ? 'rotate-180' : ''}`} viewBox="0 0 16 16" fill="currentColor">
                  <path d="M12.78 5.22a.749.749 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.06 0L3.22 6.28a.749.749 0 1 1 1.06-1.06L8 8.939l3.72-3.719a.749.749 0 0 1 1.06 0Z" />
                </svg>
              </button>
              {showEnvMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowEnvMenu(false)} />
                  <div className="absolute left-0 top-[calc(100%+6px)] z-20 w-[288px] bg-[#161b22] border border-[#30363d] rounded-md shadow-[0_8px_24px_rgba(0,0,0,0.4)] overflow-hidden">

                    {/* Tab bar */}
                    <div className="flex border-b border-[#21262d]">
                      {['standard', ...(ephemeralEnabled ? ['ephemeral'] : [])].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                          className={`flex-1 py-2.5 text-[14px] font-semibold capitalize transition-colors border-b-2 -mb-px ${
                            activeTab === tab
                              ? 'text-[#e6edf3] border-[#3fb950]'
                              : 'text-[#8b949e] border-transparent hover:text-[#c9d1d9]'
                          }`}>
                          {tab}
                        </button>
                      ))}
                    </div>

                    {/* Standard tab */}
                    {activeTab === 'standard' && (
                      <div className="py-1">
                        {standardEnvs.map(env => {
                          const isActive = activeEnv === env.name;
                          return (
                            <button key={env.name}
                              onClick={() => { onSwitchEnv(env.name); setShowEnvMenu(false); }}
                              className="w-full flex items-center gap-3 px-4 py-2 text-left rounded transition-colors hover:bg-[#1f242b]">
                              <span className="w-4 shrink-0 flex items-center justify-center">
                                {isActive
                                  ? <svg className="w-3.5 h-3.5 text-[#3fb950]" viewBox="0 0 16 16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" /></svg>
                                  : <span className="w-2 h-2 rounded-full bg-[#30363d]" />
                                }
                              </span>
                              <span className={`flex-1 text-[14px] leading-5 ${isActive ? 'text-[#e6edf3] font-semibold' : 'text-[#e6edf3]'}`}>{env.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Ephemeral tab */}
                    {activeTab === 'ephemeral' && ephemeralEnabled && (
                      <div>
                        {/* Recent list */}
                        {ephHistory.length > 0 && (
                          <>
                            <p className="px-4 pt-3 pb-1 text-[12px] text-[#8b949e]">Recent</p>
                            {ephHistory.map(env => {
                              const isActive = activeEnv === env;
                              return (
                                <button key={env}
                                  onClick={() => handleEphConnect(env)}
                                  data-testid={`sidebar-eph-recent-${env}`}
                                  className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-[#1f242b]">
                                  <span className="w-4 shrink-0 flex items-center justify-center">
                                    {isActive
                                      ? <svg className="w-3.5 h-3.5 text-[#3fb950]" viewBox="0 0 16 16" fill="currentColor"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" /></svg>
                                      : <span className="w-2 h-2 rounded-full bg-[#30363d]" />
                                    }
                                  </span>
                                  <span className={`flex-1 text-[14px] leading-5 font-mono truncate ${isActive ? 'text-[#e6edf3] font-semibold' : 'text-[#e6edf3]'}`}>{env}</span>
                                  {isActive && <span className="text-[12px] text-[#3fb950] font-medium shrink-0">active</span>}
                                </button>
                              );
                            })}
                            <div className="border-t border-[#21262d] mx-4 my-2" />
                          </>
                        )}

                        {/* Connect input + CTA */}
                        <div className="px-4 pb-4">
                          <p className="text-[12px] text-[#8b949e] mb-2">Connect to environment</p>
                          <div className="flex items-center border border-[#30363d] rounded-md overflow-hidden bg-[#0d1117] focus-within:border-[#1f6feb] transition-colors mb-2">
                            <span className="pl-3 pr-1 text-[14px] font-mono text-[#484f58] shrink-0 leading-none py-2">eph-</span>
                            <input type="text" value={ephInput} onChange={e => setEphInput(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter' && ephInput.trim()) handleEphConnect(`eph-${ephInput.trim()}`); }}
                              placeholder="environment-name"
                              data-testid="sidebar-eph-input"
                              className="flex-1 pr-3 py-2 bg-transparent text-[14px] text-[#e6edf3] outline-none placeholder:text-[#484f58] font-mono" />
                          </div>
                          <button
                            onClick={() => { if (ephInput.trim()) handleEphConnect(`eph-${ephInput.trim()}`); }}
                            disabled={!ephInput.trim()}
                            className="w-full py-2 text-[14px] font-semibold text-white bg-[#238636] hover:bg-[#2ea043] rounded-md border border-[#2ea043]/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                            Connect to environment
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                </>
              )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {navStructure.map((group, gi) => {
          const isOpen = group.collapsible ? (!collapsed[group.section] || isSectionActive(group)) : true;
          const sectionActive = isSectionActive(group);

          return (
            <div key={group.section} className={gi > 0 ? 'mt-4' : ''}>
              {/* Section header */}
              {group.collapsible ? (
                <button
                  onClick={() => toggleSection(group.section)}
                  className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[14px] font-semibold transition-colors cursor-pointer mb-1 ${
                    sectionActive ? 'text-[#58a6ff]' : 'text-[#c9d1d9] hover:text-[#e6edf3]'
                  }`}>
                  {group.icon && <group.icon className="w-4 h-4 shrink-0" />}
                  <span className="flex-1 text-left">{group.section}</span>
                  <ChevronIcon className="w-3.5 h-3.5 opacity-70" open={isOpen} />
                </button>
              ) : (
                <div className="flex items-center gap-2.5 px-2 py-1.5 text-[14px] font-semibold text-[#c9d1d9] mb-1">
                  {group.icon && <group.icon className="w-4 h-4 shrink-0" />}
                  <span>{group.section}</span>
                </div>
              )}

              {/* Nav items */}
              {isOpen && group.items.map(item => {
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    data-testid={`nav-${item.id}`}
                    className={`w-full flex items-center gap-2.5 py-[7px] px-2 rounded-md text-[14px] transition-all cursor-pointer mb-[2px] ${isActive
                      ? 'bg-[#161b22] text-[#e6edf3] font-medium border border-[#30363d]'
                      : 'text-[#8b949e] hover:bg-[#161b22] hover:text-[#e6edf3] border border-transparent'
                    }`}
                  >
                    <item.icon className={`w-[16px] h-[16px] shrink-0 ${isActive ? 'text-[#e6edf3]' : 'text-[#6e7681]'}`} />
                    <span className="flex-1 text-left">{item.label}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Footer: Settings + API Token */}
      <div className="px-3 py-3 border-t border-[#30363d]">
        <button
          onClick={() => onNavigate('settings')}
          data-testid="nav-settings"
          className={`w-full flex items-center gap-2.5 px-2 py-[7px] rounded-md text-[14px] transition-colors cursor-pointer border mb-[2px] ${
            activePage === 'settings'
              ? 'bg-[#161b22] text-[#e6edf3] font-medium border-[#30363d]'
              : 'text-[#8b949e] hover:bg-[#161b22] hover:text-[#e6edf3] border-transparent'
          }`}>
          <SettingsIcon className={`w-[16px] h-[16px] shrink-0 ${activePage === 'settings' ? 'text-[#e6edf3]' : 'text-[#6e7681]'}`} />
          <span className="flex-1 text-left">Settings</span>
        </button>
        <button
          onClick={() => setTokenOpen(o => !o)}
          data-testid="api-token-btn"
          title="Paste your API token"
          className="w-full flex items-center gap-2.5 px-2 py-[7px] rounded-md text-[14px] text-[#8b949e] hover:bg-[#161b22] hover:text-[#e6edf3] transition-colors cursor-pointer border border-transparent">
          <KeyIcon className="w-[16px] h-[16px] shrink-0 text-[#6e7681]" />
          <span className="flex-1 text-left text-[13px]">API Token</span>
          <span data-testid="token-status-indicator"
            className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${
              bearerToken
                ? 'bg-[#238636]/10 text-[#3fb950] border-[#238636]/30'
                : 'bg-[#f85149]/10 text-[#f85149] border-[#f85149]/30'
            }`}>
            {bearerToken ? 'Set' : 'Not set'}
          </span>
          <ChevronIcon className="w-[14px] h-[14px] shrink-0 text-[#6e7681]" open={tokenOpen} />
        </button>
        {tokenOpen && (
          <div className="mt-1 flex items-center gap-1">
            <input
              type={showToken ? 'text' : 'password'}
              value={bearerToken}
              onChange={e => onTokenChange(e.target.value.trim())}
              placeholder="Paste API token"
              spellCheck={false}
              autoComplete="off"
              className="flex-1 min-w-0 h-[30px] px-2 text-[12px] rounded-md bg-[#0d1117] border border-[#30363d] text-[#e6edf3] outline-none focus:border-[#388bfd]"
            />
            <button
              type="button"
              onClick={() => setShowToken(s => !s)}
              title={showToken ? 'Hide token' : 'Show token'}
              className="shrink-0 px-2 h-[30px] text-[11px] rounded-md border border-[#30363d] text-[#8b949e] hover:text-[#e6edf3]">
              {showToken ? 'Hide' : 'Show'}
            </button>
            {bearerToken && (
              <button
                type="button"
                onClick={() => onTokenChange('')}
                title="Clear token"
                className="shrink-0 px-2 h-[30px] text-[11px] rounded-md border border-[#30363d] text-[#8b949e] hover:text-[#f85149]">
                Clear
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
