import GuideLayout from './GuideLayout';
import { GUIDE_PAGES, nextPage } from './manifest';

import StartGuide,       { toc as tocStart }   from './content/StartGuide';
import SetupApiToken,    { toc as tocToken }    from './content/SetupApiToken';
import CreateTemplate,   { toc as tocCreate }   from './content/CreateTemplate';
import CategoryConfigs,  { toc as tocConfigs }  from './content/CategoryConfigs';
import VerifyTemplate,   { toc as tocVerify }   from './content/VerifyTemplate';
import FAQ,              { toc as tocFAQ }      from './content/FAQ';

const REGISTRY = {
  'guide-start':    { Component: StartGuide,      toc: tocStart },
  'guide-token':    { Component: SetupApiToken,   toc: tocToken },
  'guide-create':   { Component: CreateTemplate,  toc: tocCreate },
  'guide-configs':  { Component: CategoryConfigs, toc: tocConfigs },
  'guide-verify':   { Component: VerifyTemplate,  toc: tocVerify },
  'guide-faq':      { Component: FAQ,             toc: tocFAQ },
};

export default function Guide({ page, onNavigate }) {
  const entry = REGISTRY[page] || REGISTRY['guide-start'];
  const { Component, toc } = entry;
  const pageMeta = GUIDE_PAGES.find(p => p.id === page) || GUIDE_PAGES[0];
  const next = nextPage(pageMeta.id);

  return (
    <GuideLayout
      breadcrumb={{ group: 'Getting started', page: pageMeta.title }}
      toc={toc}
      next={next ? { id: next.id, title: next.title } : null}
      onNavigate={onNavigate}
    >
      <Component onNavigate={onNavigate} />
    </GuideLayout>
  );
}
