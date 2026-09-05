import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

/** How long the boot screen is held before Angular replaces it. */
const BOOT_WAIT = 1000;

/** Resolves once the boot screen has been on display long enough. */
function bootScreenSeen(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, BOOT_WAIT));
}

bootScreenSeen()
  .then(() => bootstrapApplication(App, appConfig))
  .catch((err) => console.error(err));
