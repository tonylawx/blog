import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useHistorySelector} from '@docusaurus/theme-common';
import {useAlternatePageUtils} from '@docusaurus/theme-common/internal';
import styles from './MobileLanguageSwitch.module.css';

export default function MobileLanguageSwitch() {
  const {
    i18n: {currentLocale},
  } = useDocusaurusContext();
  const {createUrl} = useAlternatePageUtils();
  const search = useHistorySelector((history) => history.location.search);
  const hash = useHistorySelector((history) => history.location.hash);

  const targetLocale = currentLocale === 'en' ? 'zh' : 'en';
  const targetLabel = targetLocale === 'zh' ? '中文' : 'EN';
  const targetUrl = createUrl({locale: targetLocale, fullyQualified: false});
  const ariaLabel =
    targetLocale === 'zh' ? 'Switch to Chinese' : '切换到英文';

  return (
    <Link
      to={`pathname://${targetUrl}${search}${hash}`}
      autoAddBaseUrl={false}
      target="_self"
      lang={targetLocale === 'zh' ? 'zh-CN' : 'en'}
      aria-label={ariaLabel}
      className={styles.switch}
    >
      {targetLabel}
    </Link>
  );
}
