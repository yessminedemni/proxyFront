import { NgModule } from '@angular/core';
import { ServerModule } from '@angular/platform-server';  // Add this

@NgModule({
  imports: [
          // Client app module
    ServerModule,         // Required for server-side rendering
  ],
  bootstrap: []  // Required for server bootstrap
})
export class AppServerModule {}