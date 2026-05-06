import { createApp, analytics, files, genie, lakebase, server } from '@databricks/appkit';
import { setupSampleLakebaseRoutes } from './routes/lakebase/todo-routes';
import { setupPortfolioChatRoute } from './routes/portfolio-chat';
import { hydrateAsync } from './cache/answerCache';
import { warmCacheAsync } from './cache/warmCache';

createApp({
  plugins: [
    server({ autoStart: false }),
    analytics(),
    files(),
    genie(),
    lakebase(),
  ],
})
  .then(async (appkit) => {
    await setupSampleLakebaseRoutes(appkit);
    setupPortfolioChatRoute(appkit);
    await appkit.server.start();
    hydrateAsync(appkit);
    warmCacheAsync(appkit);
  })
  .catch(console.error);
