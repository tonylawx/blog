import React from 'react';
import Giscus from '@giscus/react';
import {useColorMode} from '@docusaurus/theme-common';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

export default function Comments(): JSX.Element {
  const {colorMode} = useColorMode();
  const {i18n} = useDocusaurusContext();
  const lang = i18n.currentLocale === 'zh' ? 'zh-CN' : 'en';

  return (
    <div style={{marginTop: '2rem'}}>
      <Giscus
        repo="tonylawx/blog"
        repoId="R_kgDOTN3ajA"
        category="Announcements"
        categoryId="DIC_kwDOTN3ajM4DAg-P"
        mapping="pathname"
        strict="0"
        reactionsEnabled="1"
        emitMetadata="0"
        inputPosition="top"
        theme={colorMode === 'dark' ? 'dark' : 'light'}
        lang={lang}
        loading="lazy"
      />
    </div>
  );
}
