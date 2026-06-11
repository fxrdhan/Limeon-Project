export interface BrowserLogoutCleanupContributor {
  id: string;
  indexedDbNames?: readonly string[];
  resetRuntimeState?: () => void;
  resetPersistentState?: () => Promise<void> | void;
}

const browserLogoutCleanupContributors = new Map<
  string,
  BrowserLogoutCleanupContributor
>();

export const registerBrowserLogoutCleanupContributor = (
  contributor: BrowserLogoutCleanupContributor
) => {
  browserLogoutCleanupContributors.set(contributor.id, contributor);

  return () => {
    if (browserLogoutCleanupContributors.get(contributor.id) === contributor) {
      browserLogoutCleanupContributors.delete(contributor.id);
    }
  };
};

export const getBrowserLogoutCleanupContributors = () => [
  ...browserLogoutCleanupContributors.values(),
];
