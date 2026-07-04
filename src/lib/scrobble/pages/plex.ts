import { type PageModule } from '../page-registry';

/**
 * The Plex page module.
 */
const plex: PageModule = {
  name: 'plex',

  matches(url) {
    return new URL(url).hostname === 'app.plex.tv';
  },

  isWatchPage() {
    return true;
  },

  identify() {
    return null;
  },
};

export default plex;
