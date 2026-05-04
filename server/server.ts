import { createApp, analytics, files, genie, lakebase, server } from '@databricks/appkit';
import { setupSampleLakebaseRoutes } from './routes/lakebase/todo-routes';
import { setupPortfolioChatRoute } from './routes/portfolio-chat';

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
  })
  .catch(console.error);
